import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_ai"."articles"
      ADD COLUMN IF NOT EXISTS "legacy_source_platform" varchar,
      ADD COLUMN IF NOT EXISTS "legacy_source_site" varchar,
      ADD COLUMN IF NOT EXISTS "legacy_source_wp_post_id" numeric,
      ADD COLUMN IF NOT EXISTS "legacy_source_wp_url" varchar,
      ADD COLUMN IF NOT EXISTS "legacy_source_imported_at" timestamp(3) with time zone;

    ALTER TABLE "cms_ai"."_articles_v"
      ADD COLUMN IF NOT EXISTS "version_legacy_source_platform" varchar,
      ADD COLUMN IF NOT EXISTS "version_legacy_source_site" varchar,
      ADD COLUMN IF NOT EXISTS "version_legacy_source_wp_post_id" numeric,
      ADD COLUMN IF NOT EXISTS "version_legacy_source_wp_url" varchar,
      ADD COLUMN IF NOT EXISTS "version_legacy_source_imported_at" timestamp(3) with time zone;

    DROP INDEX IF EXISTS "cms_ai"."articles_slug_idx";
    CREATE INDEX IF NOT EXISTS "articles_slug_idx" ON "cms_ai"."articles" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "articles_legacy_source_wp_url_idx" ON "cms_ai"."articles" USING btree ("legacy_source_wp_url");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_legacy_source_wp_url_idx" ON "cms_ai"."_articles_v" USING btree ("version_legacy_source_wp_url");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "cms_ai"."_articles_v_version_legacy_source_wp_url_idx";
    DROP INDEX IF EXISTS "cms_ai"."articles_legacy_source_wp_url_idx";
    DROP INDEX IF EXISTS "cms_ai"."articles_slug_idx";
    CREATE UNIQUE INDEX IF NOT EXISTS "articles_slug_idx" ON "cms_ai"."articles" USING btree ("slug");

    ALTER TABLE "cms_ai"."_articles_v"
      DROP COLUMN IF EXISTS "version_legacy_source_imported_at",
      DROP COLUMN IF EXISTS "version_legacy_source_wp_url",
      DROP COLUMN IF EXISTS "version_legacy_source_wp_post_id",
      DROP COLUMN IF EXISTS "version_legacy_source_site",
      DROP COLUMN IF EXISTS "version_legacy_source_platform";

    ALTER TABLE "cms_ai"."articles"
      DROP COLUMN IF EXISTS "legacy_source_imported_at",
      DROP COLUMN IF EXISTS "legacy_source_wp_url",
      DROP COLUMN IF EXISTS "legacy_source_wp_post_id",
      DROP COLUMN IF EXISTS "legacy_source_site",
      DROP COLUMN IF EXISTS "legacy_source_platform";
  `)
}
