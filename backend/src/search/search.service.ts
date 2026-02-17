import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchService {
    private openai: OpenAI;
    private readonly logger = new Logger(SearchService.name);

    constructor(private prisma: PrismaService) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async generateImageDescription(imageUrl: string): Promise<string> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Describe this product image in detail, focusing on visual characteristics, colors, style, and what the product appears to be. Keep the description concise but informative, suitable for product search. Do not mention the image quality or technical aspects. in only 25 words ',
                            },
                            {
                                type: 'image_url',
                                image_url: { url: imageUrl },
                            },
                        ],
                    },
                ],
                max_tokens: 150,
            });

            return response.choices[0]?.message?.content?.trim() || '';
        } catch (error) {
            this.logger.error('Error generating image description', error);
            throw error;
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-3-large',
                input: text,
                encoding_format: 'float',
            });
            return response.data[0].embedding;
        } catch (error) {
            this.logger.error('Error generating embedding', error);
            throw error;
        }
    }

    async generateImageDescriptionFromFile(imageFile: Express.Multer.File): Promise<string> {
        try {
            // Convert buffer to base64
            const base64Image = imageFile.buffer.toString('base64');
            const imageUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

            const response = await this.generateImageDescription(imageUrl)

            return response;
        } catch (error) {
            this.logger.error('Error generating image description from file', error);
            throw error;
        }
    }

    async indexProduct(productId: string) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { category: true },
        });

        if (!product) return;

        // Create a rich text representation for embedding
        let docText = `
      Product: ${product.name}
      Category: ${product.category?.name || 'Uncategorized'}
      Price: ${product.price}
      Description: ${product.line1 || ''} ${product.line2 || ''} ${product.line3 || ''}
    `.trim();

        // If product has images, generate descriptions and add to searchable text
        if (product.imageUrls && product.imageUrls.length > 0) {
            try {
                const imageDescriptions = await Promise.all(
                    product.imageUrls.slice(0, 1).map(async (imageUrl: string) => {
                        try {
                            const description = await this.generateImageDescription(imageUrl);
                            return description;
                        } catch (error) {
                            this.logger.warn(`Failed to generate description for image ${imageUrl}`, error);
                            return '';
                        }
                    })
                );

                const validDescriptions = imageDescriptions.filter(desc => desc.length > 0);
                if (validDescriptions.length > 0) {
                    docText += `\nVisual Description: ${validDescriptions.join(' ')}`;
                }
            } catch (error) {
                this.logger.warn('Failed to generate image descriptions', error);
            }
        }

        const embedding = await this.generateEmbedding(docText);

        // Save embedding using raw SQL for pgvector
        // Cast the embedding array to a vector string format: '[0.1, 0.2, ...]'
        const vectorString = `[${embedding.join(',')}]`;

        await this.prisma.$executeRaw`
            INSERT INTO "product_embeddings" ("id", "product_id", "embedding", "source_text", "created_at")
            VALUES (gen_random_uuid(), ${productId}, ${vectorString}::vector, ${docText}, NOW())
            ON CONFLICT ("product_id") 
            DO UPDATE SET 
                "embedding" = ${vectorString}::vector,
                "source_text" = ${docText}
        `;

        this.logger.log(`Indexed product ${product.name} (${productId})`);
    }


    async search(
        businessId: string,
        query: string,
        categoryId?: string,
        limit = 20
    ) {
        const queryEmbedding = await this.generateEmbedding(query);

        const vector = Prisma.sql`
    ARRAY[${Prisma.join(queryEmbedding)}]::vector
  `;

        const results = await this.prisma.$queryRaw<any[]>(
            Prisma.sql`
      SELECT
        p.*,
        c.name AS category_name,
        pe.source_text,
        1 - (pe.embedding <=> ${vector}) AS _score
      FROM "products" p
      JOIN "product_embeddings" pe ON p.id = pe.product_id
      JOIN "categories" c ON p.category_id = c.id
      WHERE
        p.business_id = ${businessId}
        AND p.is_active = true
        ${categoryId
                    ? Prisma.sql`AND p.category_id = ${categoryId}`
                    : Prisma.empty}
      ORDER BY _score DESC
      LIMIT ${limit}
    `
        );

        return results.map(r => ({
            product: {
                id: r.id,
                businessId: r.business_id,
                categoryId: r.category_id,
                name: r.name,
                price: r.price,
                line1: r.line1,
                line2: r.line2,
                line3: r.line3,
                imageUrls: r.image_urls,
                isActive: r.is_active,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                category: {
                    id: r.category_id,
                    name: r.category_name,
                },
            },
            score: r._score,
        }));
    }

}
