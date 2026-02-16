/*
  Warnings:

  - The `embedding` column on the `product_embeddings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "product_embeddings" DROP COLUMN "embedding",
ADD COLUMN     "embedding" vector(1536);
