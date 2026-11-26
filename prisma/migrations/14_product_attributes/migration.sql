-- Structured, category-specific product attributes (capacity, type, energy rating, ...) used by filters.
-- Additive only: existing rows keep NULL.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "attributes" JSONB;
