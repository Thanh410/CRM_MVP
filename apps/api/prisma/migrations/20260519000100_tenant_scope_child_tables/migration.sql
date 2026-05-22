-- Add tenant scope to polymorphic/join child tables.
ALTER TABLE "entity_tags" ADD COLUMN "orgId" TEXT;
UPDATE "entity_tags" et
SET "orgId" = t."orgId"
FROM "tags" t
WHERE et."tagId" = t."id";
ALTER TABLE "entity_tags" ALTER COLUMN "orgId" SET NOT NULL;

ALTER TABLE "custom_field_values" ADD COLUMN "orgId" TEXT;
UPDATE "custom_field_values" cfv
SET "orgId" = cf."orgId"
FROM "custom_fields" cf
WHERE cfv."fieldId" = cf."id";
ALTER TABLE "custom_field_values" ALTER COLUMN "orgId" SET NOT NULL;

ALTER TABLE "campaign_logs" ADD COLUMN "orgId" TEXT;
UPDATE "campaign_logs" cl
SET "orgId" = c."orgId"
FROM "campaigns" c
WHERE cl."campaignId" = c."id";
ALTER TABLE "campaign_logs" ALTER COLUMN "orgId" SET NOT NULL;

ALTER TABLE "entity_tags" DROP CONSTRAINT "entity_tags_pkey";
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_pkey" PRIMARY KEY ("orgId", "entityType", "entityId", "tagId");

DROP INDEX IF EXISTS "custom_field_values_fieldId_entityId_key";
CREATE UNIQUE INDEX "custom_field_values_orgId_fieldId_entityId_key" ON "custom_field_values"("orgId", "fieldId", "entityId");

CREATE INDEX "entity_tags_orgId_entityType_entityId_idx" ON "entity_tags"("orgId", "entityType", "entityId");
CREATE INDEX "custom_field_values_orgId_entityType_entityId_idx" ON "custom_field_values"("orgId", "entityType", "entityId");
CREATE INDEX "campaign_logs_orgId_idx" ON "campaign_logs"("orgId");

ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaign_logs" ADD CONSTRAINT "campaign_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "channel_accounts_orgId_channel_externalId_key" ON "channel_accounts"("orgId", "channel", "externalId");
