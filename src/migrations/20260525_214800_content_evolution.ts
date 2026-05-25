import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "cms_ai"."enum_authors_status" AS ENUM('active', 'hidden');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "cms_ai"."enum_articles_content_type" AS ENUM(
        'article',
        'blog-post',
        'news',
        'guide',
        'case-study',
        'knowledge-base'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "cms_ai"."enum__articles_v_version_content_type" AS ENUM(
        'article',
        'blog-post',
        'news',
        'guide',
        'case-study',
        'knowledge-base'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "cms_ai"."authors" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "slug" varchar,
      "status" "cms_ai"."enum_authors_status" DEFAULT 'active' NOT NULL,
      "photo_id" integer,
      "role" varchar,
      "short_description" varchar,
      "bio" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "cms_ai"."authors_links" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar,
      "url" varchar
    );

    CREATE TABLE IF NOT EXISTS "cms_ai"."articles_ai_assist_target_keywords" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "keyword" varchar
    );

    CREATE TABLE IF NOT EXISTS "cms_ai"."articles_ai_assist_questions_to_answer" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "question" varchar
    );

    CREATE TABLE IF NOT EXISTS "cms_ai"."articles_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "authors_id" integer
    );

    CREATE TABLE IF NOT EXISTS "cms_ai"."_articles_v_version_ai_assist_target_keywords" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "keyword" varchar,
      "_uuid" varchar
    );

    CREATE TABLE IF NOT EXISTS "cms_ai"."_articles_v_version_ai_assist_questions_to_answer" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "question" varchar,
      "_uuid" varchar
    );

    CREATE TABLE IF NOT EXISTS "cms_ai"."_articles_v_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "authors_id" integer
    );

    ALTER TABLE "cms_ai"."articles"
      ADD COLUMN IF NOT EXISTS "content_type" "cms_ai"."enum_articles_content_type" DEFAULT 'article' NOT NULL,
      ADD COLUMN IF NOT EXISTS "ai_assist_brief" varchar,
      ADD COLUMN IF NOT EXISTS "ai_assist_editorial_notes" varchar;

    ALTER TABLE "cms_ai"."_articles_v"
      ADD COLUMN IF NOT EXISTS "version_content_type" "cms_ai"."enum__articles_v_version_content_type" DEFAULT 'article',
      ADD COLUMN IF NOT EXISTS "version_ai_assist_brief" varchar,
      ADD COLUMN IF NOT EXISTS "version_ai_assist_editorial_notes" varchar;

    ALTER TABLE "cms_ai"."blog_posts_rels"
      ADD COLUMN IF NOT EXISTS "authors_id" integer;

    ALTER TABLE "cms_ai"."_blog_posts_v_rels"
      ADD COLUMN IF NOT EXISTS "authors_id" integer;

    ALTER TABLE "cms_ai"."payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "authors_id" integer;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."authors_links" ADD CONSTRAINT "authors_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."authors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."authors" ADD CONSTRAINT "authors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "cms_ai"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."articles_ai_assist_target_keywords" ADD CONSTRAINT "articles_ai_assist_target_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."articles"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."articles_ai_assist_questions_to_answer" ADD CONSTRAINT "articles_ai_assist_questions_to_answer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."articles"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms_ai"."articles"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."articles_rels" ADD CONSTRAINT "articles_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "cms_ai"."authors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."_articles_v_version_ai_assist_target_keywords" ADD CONSTRAINT "_articles_v_version_ai_assist_target_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."_articles_v_version_ai_assist_questions_to_answer" ADD CONSTRAINT "_articles_v_version_ai_assist_questions_to_answer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms_ai"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "cms_ai"."authors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."blog_posts_rels" ADD CONSTRAINT "blog_posts_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "cms_ai"."authors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."_blog_posts_v_rels" ADD CONSTRAINT "_blog_posts_v_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "cms_ai"."authors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "cms_ai"."authors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS "authors_links_order_idx" ON "cms_ai"."authors_links" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "authors_links_parent_id_idx" ON "cms_ai"."authors_links" USING btree ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "authors_slug_idx" ON "cms_ai"."authors" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "authors_photo_idx" ON "cms_ai"."authors" USING btree ("photo_id");
    CREATE INDEX IF NOT EXISTS "authors_updated_at_idx" ON "cms_ai"."authors" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "authors_created_at_idx" ON "cms_ai"."authors" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "articles_ai_assist_target_keywords_order_idx" ON "cms_ai"."articles_ai_assist_target_keywords" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "articles_ai_assist_target_keywords_parent_id_idx" ON "cms_ai"."articles_ai_assist_target_keywords" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "articles_ai_assist_questions_to_answer_order_idx" ON "cms_ai"."articles_ai_assist_questions_to_answer" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "articles_ai_assist_questions_to_answer_parent_id_idx" ON "cms_ai"."articles_ai_assist_questions_to_answer" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "articles_rels_order_idx" ON "cms_ai"."articles_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "articles_rels_parent_idx" ON "cms_ai"."articles_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "articles_rels_path_idx" ON "cms_ai"."articles_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "articles_rels_authors_id_idx" ON "cms_ai"."articles_rels" USING btree ("authors_id");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_ai_assist_target_keywords_order_idx" ON "cms_ai"."_articles_v_version_ai_assist_target_keywords" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_ai_assist_target_keywords_parent_id_idx" ON "cms_ai"."_articles_v_version_ai_assist_target_keywords" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_ai_assist_questions_to_answer_order_idx" ON "cms_ai"."_articles_v_version_ai_assist_questions_to_answer" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_ai_assist_questions_to_answer_parent_id_idx" ON "cms_ai"."_articles_v_version_ai_assist_questions_to_answer" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "_articles_v_rels_order_idx" ON "cms_ai"."_articles_v_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "_articles_v_rels_parent_idx" ON "cms_ai"."_articles_v_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "_articles_v_rels_path_idx" ON "cms_ai"."_articles_v_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "_articles_v_rels_authors_id_idx" ON "cms_ai"."_articles_v_rels" USING btree ("authors_id");
    CREATE INDEX IF NOT EXISTS "blog_posts_rels_authors_id_idx" ON "cms_ai"."blog_posts_rels" USING btree ("authors_id");
    CREATE INDEX IF NOT EXISTS "_blog_posts_v_rels_authors_id_idx" ON "cms_ai"."_blog_posts_v_rels" USING btree ("authors_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_authors_id_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("authors_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "cms_ai"."_articles_v_rels" CASCADE;
    DROP TABLE IF EXISTS "cms_ai"."_articles_v_version_ai_assist_questions_to_answer" CASCADE;
    DROP TABLE IF EXISTS "cms_ai"."_articles_v_version_ai_assist_target_keywords" CASCADE;
    DROP TABLE IF EXISTS "cms_ai"."articles_rels" CASCADE;
    DROP TABLE IF EXISTS "cms_ai"."articles_ai_assist_questions_to_answer" CASCADE;
    DROP TABLE IF EXISTS "cms_ai"."articles_ai_assist_target_keywords" CASCADE;
    DROP TABLE IF EXISTS "cms_ai"."authors_links" CASCADE;
    DROP TABLE IF EXISTS "cms_ai"."authors" CASCADE;

    ALTER TABLE "cms_ai"."articles"
      DROP COLUMN IF EXISTS "content_type",
      DROP COLUMN IF EXISTS "ai_assist_brief",
      DROP COLUMN IF EXISTS "ai_assist_editorial_notes";

    ALTER TABLE "cms_ai"."_articles_v"
      DROP COLUMN IF EXISTS "version_content_type",
      DROP COLUMN IF EXISTS "version_ai_assist_brief",
      DROP COLUMN IF EXISTS "version_ai_assist_editorial_notes";

    ALTER TABLE "cms_ai"."blog_posts_rels"
      DROP COLUMN IF EXISTS "authors_id";

    ALTER TABLE "cms_ai"."_blog_posts_v_rels"
      DROP COLUMN IF EXISTS "authors_id";

    ALTER TABLE "cms_ai"."payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "authors_id";

    DROP TYPE IF EXISTS "cms_ai"."enum__articles_v_version_content_type";
    DROP TYPE IF EXISTS "cms_ai"."enum_articles_content_type";
    DROP TYPE IF EXISTS "cms_ai"."enum_authors_status";
  `)
}
