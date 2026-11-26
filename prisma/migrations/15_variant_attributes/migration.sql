-- Variant-specific category attributes (capacity, energy rating, ...) so each variant filters correctly.
-- Additive only: existing rows keep NULL.
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "attributes" JSONB;
