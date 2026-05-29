import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "cms_ai"."enum_media_drive_storage_status" AS ENUM(
        'stored-in-drive',
        'drive-disabled',
        'drive-failed'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "cms_ai"."media"
      ADD COLUMN IF NOT EXISTS "external_file_u_r_l" varchar,
      ADD COLUMN IF NOT EXISTS "drive_file_i_d" varchar,
      ADD COLUMN IF NOT EXISTS "drive_web_view_u_r_l" varchar,
      ADD COLUMN IF NOT EXISTS "drive_storage_status" "cms_ai"."enum_media_drive_storage_status",
      ADD COLUMN IF NOT EXISTS "drive_storage_error" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_ai"."media"
      DROP COLUMN IF EXISTS "external_file_u_r_l",
      DROP COLUMN IF EXISTS "drive_file_i_d",
      DROP COLUMN IF EXISTS "drive_web_view_u_r_l",
      DROP COLUMN IF EXISTS "drive_storage_status",
      DROP COLUMN IF EXISTS "drive_storage_error";

    DROP TYPE IF EXISTS "cms_ai"."enum_media_drive_storage_status";
  `)
}
