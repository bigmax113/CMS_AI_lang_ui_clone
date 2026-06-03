import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_ai"."articles"
      ADD COLUMN IF NOT EXISTS "legacy_source_wp_post_i_d" numeric,
      ADD COLUMN IF NOT EXISTS "legacy_source_wp_u_r_l" varchar;

    ALTER TABLE "cms_ai"."_articles_v"
      ADD COLUMN IF NOT EXISTS "version_legacy_source_wp_post_i_d" numeric,
      ADD COLUMN IF NOT EXISTS "version_legacy_source_wp_u_r_l" varchar;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'cms_ai'
          AND table_name = 'articles'
          AND column_name = 'legacy_source_wp_post_id'
      ) THEN
        EXECUTE 'UPDATE "cms_ai"."articles"
          SET
            "legacy_source_wp_post_i_d" = COALESCE("legacy_source_wp_post_i_d", "legacy_source_wp_post_id"),
            "legacy_source_wp_u_r_l" = COALESCE("legacy_source_wp_u_r_l", "legacy_source_wp_url")';
      END IF;
    END $$;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'cms_ai'
          AND table_name = '_articles_v'
          AND column_name = 'version_legacy_source_wp_post_id'
      ) THEN
        EXECUTE 'UPDATE "cms_ai"."_articles_v"
          SET
            "version_legacy_source_wp_post_i_d" = COALESCE("version_legacy_source_wp_post_i_d", "version_legacy_source_wp_post_id"),
            "version_legacy_source_wp_u_r_l" = COALESCE("version_legacy_source_wp_u_r_l", "version_legacy_source_wp_url")';
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "articles_legacy_source_wp_u_r_l_idx" ON "cms_ai"."articles" USING btree ("legacy_source_wp_u_r_l");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_legacy_source_wp_u_r_l_idx" ON "cms_ai"."_articles_v" USING btree ("version_legacy_source_wp_u_r_l");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "cms_ai"."_articles_v_version_legacy_source_wp_u_r_l_idx";
    DROP INDEX IF EXISTS "cms_ai"."articles_legacy_source_wp_u_r_l_idx";

    ALTER TABLE "cms_ai"."_articles_v"
      DROP COLUMN IF EXISTS "version_legacy_source_wp_u_r_l",
      DROP COLUMN IF EXISTS "version_legacy_source_wp_post_i_d";

    ALTER TABLE "cms_ai"."articles"
      DROP COLUMN IF EXISTS "legacy_source_wp_u_r_l",
      DROP COLUMN IF EXISTS "legacy_source_wp_post_i_d";
  `)
}
