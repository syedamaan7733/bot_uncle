import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** INR defaults — mirrors `src/billing/billing.constants.ts` for bootstrap. */
const DEFAULT_PRICING: Record<string, number> = {
  PRODUCT_ADD: 0.5,
  SMART_IMPORT: 2,
  IMAGE_SEARCH: 1,
  CHATBOT_MESSAGE: 0.8,
  WHATSAPP_MESSAGE: 0.8,
  AI_SEARCH: 0.5,
  META_REGISTRATION: 500,
};

async function main() {
  const businesses = await prisma.business.findMany({
    select: { id: true },
  });

  for (const { id: businessId } of businesses) {
    for (const [action, pricePerUnit] of Object.entries(DEFAULT_PRICING)) {
      await prisma.pricingConfig.upsert({
        where: {
          businessId_action: {
            businessId,
            action,
          },
        },
        create: {
          businessId,
          action,
          pricePerUnit,
          isActive: true,
        },
        update: {
          pricePerUnit,
          isActive: true,
        },
      });
    }
  }

  // Optional: user-scoped defaults where no business row exists yet (skipped if you only bill by business)
  const users = await prisma.user.findMany({
    select: { id: true },
  });
  for (const { id: userId } of users) {
    for (const [action, pricePerUnit] of Object.entries(DEFAULT_PRICING)) {
      await prisma.pricingConfig.upsert({
        where: {
          userId_action: { userId, action },
        },
        create: {
          userId,
          action,
          pricePerUnit,
          isActive: true,
        },
        update: {
          pricePerUnit,
          isActive: true,
        },
      });
    }
  }

  console.log(
    `Seeded pricing for ${businesses.length} businesses and ${users.length} users.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
