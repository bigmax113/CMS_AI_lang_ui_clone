import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "cms_ai"."enum_media_embedded_image_status" AS ENUM(
        'stored-in-db',
        'not-image',
        'too-large',
        'no-buffer'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "cms_ai"."media"
      ADD COLUMN IF NOT EXISTS "embedded_image_data_u_r_l" varchar,
      ADD COLUMN IF NOT EXISTS "embedded_image_status" "cms_ai"."enum_media_embedded_image_status";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_ai"."media"
      DROP COLUMN IF EXISTS "embedded_image_data_u_r_l",
      DROP COLUMN IF EXISTS "embedded_image_status";

    DROP TYPE IF EXISTS "cms_ai"."enum_media_embedded_image_status";
  `)
}
