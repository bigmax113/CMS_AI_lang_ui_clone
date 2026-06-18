import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_ai"."articles"
      ADD COLUMN IF NOT EXISTS "view_count" numeric DEFAULT 1248;

    ALTER TABLE "cms_ai"."_articles_v"
      ADD COLUMN IF NOT EXISTS "version_view_count" numeric;

    UPDATE "cms_ai"."articles"
    SET "view_count" = 1248
    WHERE "view_count" IS NULL;

    WITH ranked AS (
      SELECT
        "id",
        row_number() OVER (
          ORDER BY COALESCE("published_at", "created_at") DESC, "id" DESC
        ) AS row_number
      FROM "cms_ai"."articles"
      WHERE "status" = 'published'
        AND COALESCE("language_code", 'en') = 'en'
      LIMIT 10
    )
    UPDATE "cms_ai"."articles" AS article
    SET "view_count" = CASE ranked.row_number
      WHEN 1 THEN 1248
      WHEN 2 THEN 3150
      WHEN 3 THEN 2890
      WHEN 4 THEN 7620
      WHEN 5 THEN 9860
      WHEN 6 THEN 6410
      WHEN 7 THEN 4120
      WHEN 8 THEN 5530
      WHEN 9 THEN 2290
      WHEN 10 THEN 1780
      ELSE article."view_count"
    END
    FROM ranked
    WHERE article."id" = ranked."id";

    CREATE INDEX IF NOT EXISTS "articles_view_count_idx"
      ON "cms_ai"."articles" USING btree ("view_count");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "cms_ai"."articles_view_count_idx";

    ALTER TABLE "cms_ai"."_articles_v"
      DROP COLUMN IF EXISTS "version_view_count";

    ALTER TABLE "cms_ai"."articles"
      DROP COLUMN IF EXISTS "view_count";
  `)
}
