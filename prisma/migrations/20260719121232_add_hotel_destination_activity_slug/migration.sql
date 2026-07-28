-- AlterTable: add nullable slug + featured first, backfill, then enforce
-- NOT NULL + uniqueness — mirrors how Package.slug already works, applied
-- retroactively to Hotel/Destination/Activity for the public storefront.
ALTER TABLE "hotels" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "destinations" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "activities" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: slugify `name`, deduped per tenant by appending a numeric
-- suffix to any collision. `WHERE slug IS NULL` makes this idempotent.
WITH base AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY "tenantId", regexp_replace(regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
      ORDER BY "createdAt"
    ) AS rn,
    regexp_replace(regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g') AS base_slug
  FROM "hotels"
  WHERE slug IS NULL
)
UPDATE "hotels" h
SET slug = CASE WHEN base.rn = 1 THEN base.base_slug ELSE base.base_slug || '-' || base.rn END
FROM base
WHERE h.id = base.id;

WITH base AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY "tenantId", regexp_replace(regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
      ORDER BY "createdAt"
    ) AS rn,
    regexp_replace(regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g') AS base_slug
  FROM "destinations"
  WHERE slug IS NULL
)
UPDATE "destinations" d
SET slug = CASE WHEN base.rn = 1 THEN base.base_slug ELSE base.base_slug || '-' || base.rn END
FROM base
WHERE d.id = base.id;

WITH base AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY "tenantId", regexp_replace(regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
      ORDER BY "createdAt"
    ) AS rn,
    regexp_replace(regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g') AS base_slug
  FROM "activities"
  WHERE slug IS NULL
)
UPDATE "activities" a
SET slug = CASE WHEN base.rn = 1 THEN base.base_slug ELSE base.base_slug || '-' || base.rn END
FROM base
WHERE a.id = base.id;

ALTER TABLE "hotels" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "destinations" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "activities" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "hotels_tenantId_slug_key" ON "hotels"("tenantId", "slug");
CREATE UNIQUE INDEX "destinations_tenantId_slug_key" ON "destinations"("tenantId", "slug");
CREATE UNIQUE INDEX "activities_tenantId_slug_key" ON "activities"("tenantId", "slug");
