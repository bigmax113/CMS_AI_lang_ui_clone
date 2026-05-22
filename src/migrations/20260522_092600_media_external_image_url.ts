import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_ai"."media"
      ADD COLUMN IF NOT EXISTS "external_image_u_r_l" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_ai"."media"
      DROP COLUMN IF EXISTS "external_image_u_r_l";
  `)
}
