import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class SearchService {
    private openai: OpenAI;
    private readonly logger = new Logger(SearchService.name);

    constructor(private prisma: PrismaService) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
                encoding_format: 'float',
            });
            return response.data[0].embedding;
        } catch (error) {
            this.logger.error('Error generating embedding', error);
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
        const docText = `
      Product: ${product.name}
      Category: ${product.category?.name || 'Uncategorized'}
      Price: ${product.price}
      Description: ${product.line1 || ''} ${product.line2 || ''} ${product.line3 || ''}
    `.trim();

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

    async search(businessId: string, query: string, limit = 5) {
        const queryEmbedding = await this.generateEmbedding(query);
        const vectorString = `[${queryEmbedding.join(',')}]`;

        // Perform vector similarity search using cosine distance operator (<=>)
        // 1 - (embedding <=> query) gives cosine similarity where 1 is identical
        const results = await this.prisma.$queryRaw`
            SELECT 
                p.*,
                pe.source_text,
                1 - (pe.embedding <=> ${vectorString}::vector) as _score
            FROM "products" p
            JOIN "product_embeddings" pe ON p.id = pe.product_id
            WHERE p.business_id = ${businessId} 
            AND p.is_active = true
            ORDER BY _score DESC
            LIMIT ${limit}
        ` as any[];

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
                updatedAt: r.updated_at
            },
            score: r._score
        }));
    }
}
