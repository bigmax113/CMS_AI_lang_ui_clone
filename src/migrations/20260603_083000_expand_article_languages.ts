import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "cms_ai"."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'bg';
    ALTER TYPE "cms_ai"."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'cs';
    ALTER TYPE "cms_ai"."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'sk';
    ALTER TYPE "cms_ai"."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'hu';
    ALTER TYPE "cms_ai"."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'kz';
    ALTER TYPE "cms_ai"."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'rs';
    ALTER TYPE "cms_ai"."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'lv';
    ALTER TYPE "cms_ai"."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'ee';
    ALTER TYPE "cms_ai"."enum_articles_language_code" ADD VALUE IF NOT EXISTS 'lt';

    ALTER TYPE "cms_ai"."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'bg';
    ALTER TYPE "cms_ai"."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'cs';
    ALTER TYPE "cms_ai"."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'sk';
    ALTER TYPE "cms_ai"."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'hu';
    ALTER TYPE "cms_ai"."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'kz';
    ALTER TYPE "cms_ai"."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'rs';
    ALTER TYPE "cms_ai"."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'lv';
    ALTER TYPE "cms_ai"."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'ee';
    ALTER TYPE "cms_ai"."enum__articles_v_version_language_code" ADD VALUE IF NOT EXISTS 'lt';
  `)
}

export async function down({ db: _db }: MigrateDownArgs): Promise<void> {
  // PostgreSQL enum values cannot be removed safely without rebuilding the type.
}
