import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { MessageBuilder } from './helpers/message-builder';
import { lastValueFrom } from 'rxjs';
import { SearchService } from '../search/search.service';
import { BillingService } from '../billing/billing.service';
import { BillingActions } from '../billing/billing.constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private searchService: SearchService,
    private readonly billing: BillingService,
    private readonly configService: ConfigService,
  ) { }

  async processWebhook(parsedData: any) {
    const { from, type, businessPhoneNumberId, message } = parsedData;
    this.logger.log(`Processing message from ${from}, type: ${type}`);

    // 1. Find business configuration
    let business = await this.prisma.business.findFirst({
      where: { whatsappPhoneNumberId: businessPhoneNumberId },
    });

    if (!business) {
      // Fallback for dev: Just get the first business
      business = await this.prisma.business.findFirst();
      if (!business) {
        this.logger.error('No business found to handle the message');
        return;
      }
    }

    // Check if we have credentials to reply
    if (!business.whatsappAccessToken || !business.whatsappPhoneNumberId) {
      this.logger.warn(
        `Business ${business.name} missing WhatsApp credentials`,
      );
    }

    // 2. Handle Message Types
    try {
      if (type === 'text') {
        const text = message.text.body.toLowerCase();

        // Simple heuristic: If simple greeting, send category list
        if (text.match(/^(hi|hello|hey|start|menu)/) || text.length < 20) {
          await this.sendCategoryList(from, business);
        } else {
          // Default fall back
          await this.sendCategoryList(from, business);
        }
      } else if (type === 'interactive') {
        const reply = message.interactive?.list_reply;
        if (!reply?.id?.startsWith('cat_')) {
          return;
        }
        const categoryId = reply.id.replace('cat_', '');
        await this.sendStoreLink(from, business, categoryId);
      } else if (type === 'image') {
        await this.handleImageMessage(from, business, message.image);
      } else {
        return;
      }

      await this.billing.safeCharge({
        businessId: business.id,
        userId: business.userId,
        action: BillingActions.CHATBOT_MESSAGE,
        units: 1,
        metadata: { channel: 'whatsapp', messageType: type },
      });
    } catch (err) {
      this.logger.error(
        `processWebhook handler failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  async sendCategoryList(to: string, business: any) {
    if (!business) return;
    const categories = await this.prisma.category.findMany({
      where: { businessId: business.id },
      orderBy: { displayOrder: 'asc' },
    });

    if (categories.length === 0) {
      await this.sendMessage(
        to,
        business,
        MessageBuilder.getTextMessage(
          to,
          "We don't have any categories set up yet. Please visit our website later.",
        ),
      );
      return;
    }

    const payload = MessageBuilder.getCategoryList(to, categories);
    await this.sendMessage(to, business, payload);
  }

  async sendStoreLink(to: string, business: any, categoryId: string) {
    if (!business) return;
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      await this.sendMessage(
        to,
        business,
        MessageBuilder.getTextMessage(to, "Sorry, that category wasn't found."),
      );
      return;
    }

    const payload = MessageBuilder.getStoreLink(
      to,
      business.slug,
      category.id,
    );
    await this.sendMessage(to, business, payload);
  }

  async handleImageMessage(to: string, business: any, imageData: any) {
    if (!business) return;

    try {
      this.logger.log(`Processing image message: ${imageData.id}`);

      // Download image from WhatsApp
      const imageUrl = await this.downloadWhatsAppImage(imageData, business);

      if (!imageUrl) {
        await this.sendMessage(
          to,
          business,
          MessageBuilder.getTextMessage(
            to,
            "Sorry, I couldn't process that image. Please try again.",
          ),
        );
        return;
      }

      // Generate description and search for similar products
      const description =
        await this.searchService.generateImageDescription(imageUrl);
      this.logger.log(`Generated image description: ${description}`);

      // Search for products using the image description
      const searchResults = await this.searchService.search(
        business.id,
        description,
        null,
        3,
      );

      if (searchResults.length === 0) {
        await this.sendMessage(
          to,
          business,
          MessageBuilder.getTextMessage(
            to,
            "I couldn't find any products matching that image. Would you like to see our categories instead?",
          ),
        );
        await this.sendCategoryList(to, business);
        return;
      }

      // Send product results
      await this.sendProductResults(to, business, searchResults, description);
    } catch (error) {
      this.logger.error('Error processing image message', error);
      await this.sendMessage(
        to,
        business,
        MessageBuilder.getTextMessage(
          to,
          'Sorry, I had trouble processing that image. Please try again or browse our categories.',
        ),
      );
      await this.sendCategoryList(to, business);
    }
  }

  async downloadWhatsAppImage(
    imageData: any,
    business: any,
  ): Promise<string | null> {
    try {
      // First get the media URL from WhatsApp
      const mediaUrl = `https://graph.facebook.com/v19.0/${imageData.id}`;

      const mediaResponse = await lastValueFrom(
        this.httpService.get(mediaUrl, {
          headers: {
            Authorization: `Bearer ${business.whatsappAccessToken}`,
          },
        }),
      );

      const downloadUrl = mediaResponse.data.url;

      // Download the actual image content
      const imageResponse = await lastValueFrom(
        this.httpService.get(downloadUrl, {
          headers: {
            Authorization: `Bearer ${business.whatsappAccessToken}`,
          },
          responseType: 'arraybuffer',
        }),
      );

      // Convert to base64 data URL
      const base64Image = Buffer.from(imageResponse.data, 'binary').toString(
        'base64',
      );
      const mimeType = imageData.mime_type || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      return dataUrl;
    } catch (error) {
      this.logger.error('Error downloading WhatsApp image', error);
      return null;
    }
  }

  async sendProductResults(
    to: string,
    business: any,
    searchResults: any[],
    description: string,
  ) {
    const topResults = searchResults.slice(0, 5); // Send top 5 results

    let message = `I found top ${searchResults.length} products matching your image:\n\n`;

    const frontendUrl = this.configService.get('FRONTEND_URL');
    topResults.forEach((result, index) => {
      const product = result.product;
      message += `${index + 1}. ${product.name}\n`;
      message += `   💰 ${product.price}\n`;
      if (product.line1) message += `   📝 ${product.line1}\n`;
      message += `   � Product: ${frontendUrl}/store/${business.slug}?search=${encodeURIComponent(product.name)}\n\n`;
    });

    if (searchResults.length > 5) {
      message += `... and ${searchResults.length - 5} more products.\n\n\n\n\n`;
    }

    message += `🔍 View all similar products: ${frontendUrl}/store/${business.slug}?search=${encodeURIComponent(description)}\n\n`;
    message += `Image description: "${description}"\n\n`;
    message += 'Would you like to see more products or browse by category?';

    await this.sendMessage(
      to,
      business,
      MessageBuilder.getTextMessage(to, message),
    );
  }

  async sendMessage(to: string, business: any, payload: any) {
    if (
      !business ||
      !business.whatsappAccessToken ||
      !business.whatsappPhoneNumberId
    ) {
      this.logger.warn(
        `[MOCK SEND] Would send to ${to}: ${JSON.stringify(payload, null, 2)}`,
      );
      return;
    }

    const url = `https://graph.facebook.com/v19.0/${business.whatsappPhoneNumberId}/messages`;
    try {
      await lastValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: `Bearer ${business.whatsappAccessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      this.logger.log(`Message sent to ${to}`);
      await this.billing.safeCharge({
        businessId: business.id,
        userId: business.userId,
        action: BillingActions.WHATSAPP_MESSAGE,
        units: 1,
        metadata: { to },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }
}
