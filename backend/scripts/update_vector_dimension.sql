-- Update vector dimension from 1536 to 3072
ALTER TABLE product_embeddings ALTER COLUMN embedding TYPE vector(3072);
