-- CreateTable
CREATE TABLE "product_embeddings" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "source_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_embeddings_product_id_key" ON "product_embeddings"("product_id");

-- AddForeignKey
ALTER TABLE "product_embeddings" ADD CONSTRAINT "product_embeddings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
