import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "cms_ai"."enum_articles_status" ADD VALUE IF NOT EXISTS 'review';
    ALTER TYPE "cms_ai"."enum__articles_v_version_status" ADD VALUE IF NOT EXISTS 'review';

    ALTER TABLE "cms_ai"."articles"
      ADD COLUMN IF NOT EXISTS "seo_canonical_u_r_l" varchar,
      ADD COLUMN IF NOT EXISTS "seo_og_title" varchar,
      ADD COLUMN IF NOT EXISTS "seo_og_description" varchar,
      ADD COLUMN IF NOT EXISTS "seo_twitter_title" varchar,
      ADD COLUMN IF NOT EXISTS "seo_twitter_description" varchar;

    ALTER TABLE "cms_ai"."_articles_v"
      ADD COLUMN IF NOT EXISTS "version_seo_canonical_u_r_l" varchar,
      ADD COLUMN IF NOT EXISTS "version_seo_og_title" varchar,
      ADD COLUMN IF NOT EXISTS "version_seo_og_description" varchar,
      ADD COLUMN IF NOT EXISTS "version_seo_twitter_title" varchar,
      ADD COLUMN IF NOT EXISTS "version_seo_twitter_description" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_ai"."_articles_v"
      DROP COLUMN IF EXISTS "version_seo_twitter_description",
      DROP COLUMN IF EXISTS "version_seo_twitter_title",
      DROP COLUMN IF EXISTS "version_seo_og_description",
      DROP COLUMN IF EXISTS "version_seo_og_title",
      DROP COLUMN IF EXISTS "version_seo_canonical_u_r_l";

    ALTER TABLE "cms_ai"."articles"
      DROP COLUMN IF EXISTS "seo_twitter_description",
      DROP COLUMN IF EXISTS "seo_twitter_title",
      DROP COLUMN IF EXISTS "seo_og_description",
      DROP COLUMN IF EXISTS "seo_og_title",
      DROP COLUMN IF EXISTS "seo_canonical_u_r_l";
  `)
}
