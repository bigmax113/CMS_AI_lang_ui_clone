import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "cms_ai"."enum_articles_language_code" AS ENUM('en', 'ru', 'uk', 'ro', 'pl');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "cms_ai"."enum__articles_v_version_language_code" AS ENUM('en', 'ru', 'uk', 'ro', 'pl');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "cms_ai"."articles"
      ADD COLUMN IF NOT EXISTS "language_code" "cms_ai"."enum_articles_language_code" DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS "translation_group" varchar;

    ALTER TABLE "cms_ai"."_articles_v"
      ADD COLUMN IF NOT EXISTS "version_language_code" "cms_ai"."enum__articles_v_version_language_code",
      ADD COLUMN IF NOT EXISTS "version_translation_group" varchar;

    CREATE INDEX IF NOT EXISTS "articles_language_code_idx" ON "cms_ai"."articles" USING btree ("language_code");
    CREATE INDEX IF NOT EXISTS "articles_translation_group_idx" ON "cms_ai"."articles" USING btree ("translation_group");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_language_code_idx" ON "cms_ai"."_articles_v" USING btree ("version_language_code");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_translation_group_idx" ON "cms_ai"."_articles_v" USING btree ("version_translation_group");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "cms_ai"."_articles_v_version_translation_group_idx";
    DROP INDEX IF EXISTS "cms_ai"."_articles_v_version_language_code_idx";
    DROP INDEX IF EXISTS "cms_ai"."articles_translation_group_idx";
    DROP INDEX IF EXISTS "cms_ai"."articles_language_code_idx";

    ALTER TABLE "cms_ai"."_articles_v"
      DROP COLUMN IF EXISTS "version_translation_group",
      DROP COLUMN IF EXISTS "version_language_code";

    ALTER TABLE "cms_ai"."articles"
      DROP COLUMN IF EXISTS "translation_group",
      DROP COLUMN IF EXISTS "language_code";

    DROP TYPE IF EXISTS "cms_ai"."enum__articles_v_version_language_code";
    DROP TYPE IF EXISTS "cms_ai"."enum_articles_language_code";
  `)
}
