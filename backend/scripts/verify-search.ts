import { PrismaClient } from '@prisma/client';
import { SearchService } from '../src/search/search.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

async function main() {
    const prisma = new PrismaClient();

    // Clean up
    await prisma.productEmbedding.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.business.deleteMany();
    await prisma.user.deleteMany();

    console.log('Cleaned up database');

    // Create User & Business
    const user = await prisma.user.create({
        data: {
            email: 'search-test@example.com',
            password: 'password123',
        },
    });

    const business = await prisma.business.create({
        data: {
            userId: user.id,
            name: 'Search Test Business',
            slug: 'search-test-biz',
        },
    });

    // Create Category
    const category = await prisma.category.create({
        data: {
            businessId: business.id,
            name: 'Test Category',
            slug: 'test-category',
        },
    });

    // Create Products
    const product1 = await prisma.product.create({
        data: {
            businessId: business.id,
            categoryId: category.id,
            name: 'Red Running Shoes',
            price: 99.99,
            line1: 'Comfortable red running shoes for marathon training.',
            isActive: true,
        },
    });

    const product2 = await prisma.product.create({
        data: {
            businessId: business.id,
            categoryId: category.id,
            name: 'Blue Office Shirt',
            price: 49.99,
            line1: 'Formal blue shirt for office wear.',
            isActive: true,
        },
    });

    console.log('Created test data');

    // Initialize Nest App to use SearchService (which has OpenAI dependency injected)
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();

    const searchService = app.get(SearchService);

    console.log('Indexing products...');
    await searchService.indexProduct(product1.id);
    await searchService.indexProduct(product2.id);
    console.log('Products indexed');

    // Wait a moment for async operations if needed (though indexProduct awaits db insert)

    console.log('Searching for "running shoes"...');
    const results1 = await searchService.search(business.id, 'running shoes');
    console.log('Results 1:', results1.map(r => `${r.product.name} (Score: ${r.score})`));

    if (results1.length > 0 && results1[0].product.name === 'Red Running Shoes') {
        console.log('✅ Test 1 Passed: Found correct product');
    } else {
        console.error('❌ Test 1 Failed');
    }

    console.log('Searching for "formal shirt"...');
    const results2 = await searchService.search(business.id, 'formal shirt');
    console.log('Results 2:', results2.map(r => `${r.product.name} (Score: ${r.score})`));

    if (results2.length > 0 && results2[0].product.name === 'Blue Office Shirt') {
        console.log('✅ Test 2 Passed: Found correct product');
    } else {
        console.error('❌ Test 2 Failed');
    }

    await app.close();
    await prisma.$disconnect();
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
