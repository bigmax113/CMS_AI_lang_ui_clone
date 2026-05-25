import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_ai"."_articles_v_version_ai_assist_target_keywords"
      ADD COLUMN IF NOT EXISTS "_uuid" varchar;

    ALTER TABLE "cms_ai"."_articles_v_version_ai_assist_questions_to_answer"
      ADD COLUMN IF NOT EXISTS "_uuid" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_ai"."_articles_v_version_ai_assist_target_keywords"
      DROP COLUMN IF EXISTS "_uuid";

    ALTER TABLE "cms_ai"."_articles_v_version_ai_assist_questions_to_answer"
      DROP COLUMN IF EXISTS "_uuid";
  `)
}
