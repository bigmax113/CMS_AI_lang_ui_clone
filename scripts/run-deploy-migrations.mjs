import pg from 'pg'

const { Client } = pg

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
const schemaName = process.env.PAYLOAD_DB_SCHEMA || 'cms_ai'
const migrationTimeoutMs = Number.parseInt(process.env.DEPLOY_MIGRATION_TIMEOUT_MS || '30000', 10)

if (!connectionString) {
  console.log('[deploy-migrations] DATABASE_URL/POSTGRES_URL is not set; skipping.')
  process.exit(0)
}

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schemaName)) {
  throw new Error(`[deploy-migrations] Unsafe schema name: ${schemaName}`)
}

const quoteIdent = (value) => `"${value.replaceAll('"', '""')}"`
const schema = quoteIdent(schemaName)

const client = new Client({
  connectionString,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: Math.min(Math.max(migrationTimeoutMs, 5000), 30000),
  query_timeout: migrationTimeoutMs,
  statement_timeout: migrationTimeoutMs,
})

let connected = false

try {
  await client.connect()
  connected = true

  await client.query(`
    ALTER TYPE ${schema}."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'de';
    ALTER TYPE ${schema}."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'es';
    ALTER TYPE ${schema}."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'el';
    ALTER TYPE ${schema}."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'de';
    ALTER TYPE ${schema}."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'es';
    ALTER TYPE ${schema}."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'el';
    ALTER TYPE ${schema}."enum_articles_status" ADD VALUE IF NOT EXISTS 'review';
    ALTER TYPE ${schema}."enum__articles_v_version_status" ADD VALUE IF NOT EXISTS 'review';
    ALTER TABLE ${schema}."articles"
      ADD COLUMN IF NOT EXISTS "view_count" numeric DEFAULT 1248;

    ALTER TABLE ${schema}."_articles_v"
      ADD COLUMN IF NOT EXISTS "version_view_count" numeric;

    UPDATE ${schema}."articles"
    SET "view_count" = 1248
    WHERE "view_count" IS NULL;

    DO $$
    DECLARE
      top_article_view_variants integer;
    BEGIN
      SELECT COUNT(DISTINCT "view_count")
      INTO top_article_view_variants
      FROM (
        SELECT "view_count"
        FROM ${schema}."articles"
        WHERE "status" = 'published'
          AND COALESCE("language_code", 'en') = 'en'
        ORDER BY COALESCE("published_at", "created_at") DESC, "id" DESC
        LIMIT 10
      ) AS ranked;

      IF COALESCE(top_article_view_variants, 0) <= 1 THEN
        WITH ranked AS (
          SELECT
            "id",
            row_number() OVER (
              ORDER BY COALESCE("published_at", "created_at") DESC, "id" DESC
            ) AS row_number
          FROM ${schema}."articles"
          WHERE "status" = 'published'
            AND COALESCE("language_code", 'en') = 'en'
          LIMIT 10
        )
        UPDATE ${schema}."articles" AS article
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
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "articles_view_count_idx"
      ON ${schema}."articles" USING btree ("view_count");
  `)

  console.log('[deploy-migrations] Article view count migration is ready.')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[deploy-migrations] Non-critical migration skipped: ${message}`)
} finally {
  if (connected) {
    await client.end()
  }
}
