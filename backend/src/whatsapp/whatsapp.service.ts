import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { MessageBuilder } from './helpers/message-builder';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name);

    constructor(
        private prisma: PrismaService,
        private httpService: HttpService,
    ) { }

    async processWebhook(parsedData: any) {
        const { from, type, businessPhoneNumberId, message } = parsedData;
        this.logger.log(`Processing message from ${from}, type: ${type}`);

        // 1. Find business configuration
        let business = await this.prisma.business.findFirst({
            where: { whatsappPhoneNumberId: businessPhoneNumberId }
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
            this.logger.warn(`Business ${business.name} missing WhatsApp credentials`);
        }

        // 2. Handle Message Types
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
            const reply = message.interactive.list_reply;
            if (reply) {
                const id = reply.id;
                // id format: cat_UUID
                if (id.startsWith('cat_')) {
                    const categoryId = id.replace('cat_', '');
                    await this.sendStoreLink(from, business, categoryId);
                }
            }
        }
    }

    async sendCategoryList(to: string, business: any) {
        if (!business) return;
        const categories = await this.prisma.category.findMany({
            where: { businessId: business.id },
            orderBy: { displayOrder: 'asc' }
        });

        if (categories.length === 0) {
            await this.sendMessage(to, business, MessageBuilder.getTextMessage(to, "We don't have any categories set up yet. Please visit our website later."));
            return;
        }

        const payload = MessageBuilder.getCategoryList(to, categories);
        await this.sendMessage(to, business, payload);
    }

    async sendStoreLink(to: string, business: any, categoryId: string) {
        if (!business) return;
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            await this.sendMessage(to, business, MessageBuilder.getTextMessage(to, "Sorry, that category wasn't found."));
            return;
        }

        const payload = MessageBuilder.getStoreLink(to, business.slug, category.slug);
        await this.sendMessage(to, business, payload);
    }

    async sendMessage(to: string, business: any, payload: any) {
        if (!business || !business.whatsappAccessToken || !business.whatsappPhoneNumberId) {
            this.logger.warn(`[MOCK SEND] Would send to ${to}: ${JSON.stringify(payload, null, 2)}`);
            return;
        }

        const url = `https://graph.facebook.com/v19.0/${business.whatsappPhoneNumberId}/messages`;
        try {
            await lastValueFrom(
                this.httpService.post(url, payload, {
                    headers: {
                        'Authorization': `Bearer ${business.whatsappAccessToken}`,
                        'Content-Type': 'application/json'
                    }
                })
            );
            this.logger.log(`Message sent to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send WhatsApp message: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}
