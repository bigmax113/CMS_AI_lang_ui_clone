import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE SCHEMA IF NOT EXISTS "cms_ai";
  CREATE TYPE "cms_ai"."enum_ai_projects_status" AS ENUM('planning', 'testing', 'ready', 'paused');
  CREATE TYPE "cms_ai"."enum_ai_projects_default_model" AS ENUM('grok-4.3', 'grok-4', 'grok-3');
  CREATE TYPE "cms_ai"."enum_prompt_templates_mode" AS ENUM('qa', 'summary', 'audit', 'draft');
  CREATE TYPE "cms_ai"."enum_sites_status" AS ENUM('draft', 'live', 'paused', 'archived');
  CREATE TYPE "cms_ai"."enum_sites_locale" AS ENUM('en', 'uk', 'ru', 'ro', 'pl', 'other');
  CREATE TYPE "cms_ai"."enum_sites_site_role" AS ENUM('corporate', 'content-hub', 'store', 'support', 'regional');
  CREATE TYPE "cms_ai"."enum_blog_templates_structure_section_role" AS ENUM('intro', 'body', 'proof', 'cta', 'faq', 'related-links');
  CREATE TYPE "cms_ai"."enum_blog_templates_status" AS ENUM('draft', 'active', 'archived');
  CREATE TYPE "cms_ai"."enum_blog_templates_template_type" AS ENUM('guide', 'news', 'case-study', 'comparison', 'release-note', 'seo-cluster');
  CREATE TYPE "cms_ai"."enum_blog_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms_ai"."enum_blog_posts_category" AS ENUM('buying-guide', 'product-education', 'news', 'case-study', 'knowledge-base');
  CREATE TYPE "cms_ai"."enum_blog_posts_audience" AS ENUM('customer', 'partner', 'internal-editor', 'support');
  CREATE TYPE "cms_ai"."enum__blog_posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms_ai"."enum__blog_posts_v_version_category" AS ENUM('buying-guide', 'product-education', 'news', 'case-study', 'knowledge-base');
  CREATE TYPE "cms_ai"."enum__blog_posts_v_version_audience" AS ENUM('customer', 'partner', 'internal-editor', 'support');
  CREATE TYPE "cms_ai"."enum_site_links_status" AS ENUM('proposed', 'approved', 'live', 'needs-review', 'archived');
  CREATE TYPE "cms_ai"."enum_site_links_link_type" AS ENUM('contextual', 'navigation', 'cta', 'redirect', 'language-switch', 'campaign-transition');
  CREATE TYPE "cms_ai"."enum_site_links_placement" AS ENUM('body', 'header', 'footer', 'related', 'blog-card', 'transition-page');
  CREATE TYPE "cms_ai"."enum_site_links_transition_template_mode" AS ENUM('direct', 'soft-handoff', 'campaign-bridge', 'language-selector', 'product-bridge');
  CREATE TYPE "cms_ai"."enum_site_links_ai_review_risk" AS ENUM('low', 'medium', 'high');
  CREATE TYPE "cms_ai"."enum_test_runs_status" AS ENUM('new', 'passed', 'needs-review', 'failed');
  CREATE TYPE "cms_ai"."enum_test_runs_rating" AS ENUM('good', 'okay', 'bad');
  CREATE TYPE "cms_ai"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms_ai"."enum_articles_category" AS ENUM('product-content', 'internal-guide', 'release-note', 'knowledge-base');
  CREATE TYPE "cms_ai"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms_ai"."enum__articles_v_version_category" AS ENUM('product-content', 'internal-guide', 'release-note', 'knowledge-base');
  CREATE TABLE "cms_ai"."ai_projects_success_criteria" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"criterion" varchar NOT NULL
  );
  
  CREATE TABLE "cms_ai"."ai_projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"status" "cms_ai"."enum_ai_projects_status" DEFAULT 'testing' NOT NULL,
  	"owner" varchar,
  	"goal" varchar NOT NULL,
  	"docs_folder" varchar,
  	"default_model" "cms_ai"."enum_ai_projects_default_model" DEFAULT 'grok-4.3',
  	"notes" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_ai"."prompt_templates_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "cms_ai"."prompt_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"is_enabled" boolean DEFAULT true,
  	"mode" "cms_ai"."enum_prompt_templates_mode" DEFAULT 'qa' NOT NULL,
  	"system_prompt" varchar NOT NULL,
  	"user_prompt" varchar NOT NULL,
  	"max_chunks" numeric DEFAULT 8,
  	"temperature" numeric DEFAULT 0.2,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_ai"."sites" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "cms_ai"."enum_sites_status" DEFAULT 'live' NOT NULL,
  	"primary_domain" varchar NOT NULL,
  	"locale" "cms_ai"."enum_sites_locale" DEFAULT 'en',
  	"site_role" "cms_ai"."enum_sites_site_role" DEFAULT 'content-hub',
  	"default_blog_path" varchar DEFAULT '/blog',
  	"owner" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_ai"."blog_templates_structure" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_title" varchar NOT NULL,
  	"section_role" "cms_ai"."enum_blog_templates_structure_section_role" DEFAULT 'body',
  	"instructions" varchar,
  	"is_required" boolean DEFAULT true
  );
  
  CREATE TABLE "cms_ai"."blog_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"status" "cms_ai"."enum_blog_templates_status" DEFAULT 'active' NOT NULL,
  	"template_type" "cms_ai"."enum_blog_templates_template_type" DEFAULT 'guide' NOT NULL,
  	"editorial_goal" varchar NOT NULL,
  	"title_pattern" varchar,
  	"summary_pattern" varchar,
  	"required_internal_links" numeric DEFAULT 2,
  	"required_cross_site_links" numeric DEFAULT 1,
  	"anchor_text_guidance" varchar,
  	"related_content_strategy" varchar,
  	"ai_prompts_brief_prompt" varchar,
  	"ai_prompts_outline_prompt" varchar,
  	"ai_prompts_linking_prompt" varchar,
  	"seo_meta_title_pattern" varchar,
  	"seo_meta_description_pattern" varchar,
  	"seo_keyword_guidance" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_ai"."blog_posts_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "cms_ai"."blog_posts_ai_assist_target_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar
  );
  
  CREATE TABLE "cms_ai"."blog_posts_ai_assist_questions_to_answer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar
  );
  
  CREATE TABLE "cms_ai"."blog_posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"status" "cms_ai"."enum_blog_posts_status" DEFAULT 'draft',
  	"site_id" integer,
  	"template_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"summary" varchar,
  	"cover_image_id" integer,
  	"content" jsonb,
  	"category" "cms_ai"."enum_blog_posts_category",
  	"audience" "cms_ai"."enum_blog_posts_audience" DEFAULT 'customer',
  	"owner" varchar,
  	"canonical_u_r_l" varchar,
  	"ai_assist_brief" varchar,
  	"ai_assist_linking_notes" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms_ai"."enum_blog_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms_ai"."blog_posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer,
  	"blog_posts_id" integer,
  	"site_links_id" integer
  );
  
  CREATE TABLE "cms_ai"."_blog_posts_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms_ai"."_blog_posts_v_version_ai_assist_target_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"keyword" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms_ai"."_blog_posts_v_version_ai_assist_questions_to_answer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms_ai"."_blog_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_status" "cms_ai"."enum__blog_posts_v_version_status" DEFAULT 'draft',
  	"version_site_id" integer,
  	"version_template_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_summary" varchar,
  	"version_cover_image_id" integer,
  	"version_content" jsonb,
  	"version_category" "cms_ai"."enum__blog_posts_v_version_category",
  	"version_audience" "cms_ai"."enum__blog_posts_v_version_audience" DEFAULT 'customer',
  	"version_owner" varchar,
  	"version_canonical_u_r_l" varchar,
  	"version_ai_assist_brief" varchar,
  	"version_ai_assist_linking_notes" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms_ai"."enum__blog_posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "cms_ai"."_blog_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer,
  	"blog_posts_id" integer,
  	"site_links_id" integer
  );
  
  CREATE TABLE "cms_ai"."site_links" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"status" "cms_ai"."enum_site_links_status" DEFAULT 'proposed' NOT NULL,
  	"link_type" "cms_ai"."enum_site_links_link_type" DEFAULT 'contextual' NOT NULL,
  	"source_site_id" integer NOT NULL,
  	"target_site_id" integer NOT NULL,
  	"source_path" varchar,
  	"target_u_r_l" varchar,
  	"anchor_text" varchar NOT NULL,
  	"placement" "cms_ai"."enum_site_links_placement" DEFAULT 'body',
  	"priority" numeric DEFAULT 50,
  	"editor_notes" varchar,
  	"transition_template_mode" "cms_ai"."enum_site_links_transition_template_mode" DEFAULT 'direct',
  	"transition_template_headline" varchar,
  	"transition_template_description" varchar,
  	"transition_template_cta_label" varchar DEFAULT 'Continue',
  	"transition_template_preserve_query_params" boolean DEFAULT true,
  	"ai_review_rationale" varchar,
  	"ai_review_risk" "cms_ai"."enum_site_links_ai_review_risk" DEFAULT 'low',
  	"ai_review_suggested_by" varchar DEFAULT 'editor',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_ai"."site_links_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer,
  	"blog_posts_id" integer
  );
  
  CREATE TABLE "cms_ai"."test_runs_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"file_name" varchar NOT NULL,
  	"path" varchar,
  	"score" numeric
  );
  
  CREATE TABLE "cms_ai"."test_runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"project_id" integer,
  	"prompt_template_id" integer,
  	"status" "cms_ai"."enum_test_runs_status" DEFAULT 'new' NOT NULL,
  	"rating" "cms_ai"."enum_test_runs_rating",
  	"ran_at" timestamp(3) with time zone,
  	"question" varchar NOT NULL,
  	"answer" varchar,
  	"review_notes" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_ai"."articles_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "cms_ai"."articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"status" "cms_ai"."enum_articles_status" DEFAULT 'draft',
  	"published_at" timestamp(3) with time zone,
  	"summary" varchar,
  	"cover_image_id" integer,
  	"content" jsonb,
  	"category" "cms_ai"."enum_articles_category",
  	"owner" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms_ai"."enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms_ai"."_articles_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms_ai"."_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_status" "cms_ai"."enum__articles_v_version_status" DEFAULT 'draft',
  	"version_published_at" timestamp(3) with time zone,
  	"version_summary" varchar,
  	"version_cover_image_id" integer,
  	"version_content" jsonb,
  	"version_category" "cms_ai"."enum__articles_v_version_category",
  	"version_owner" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms_ai"."enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "cms_ai"."media_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "cms_ai"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"caption" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "cms_ai"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "cms_ai"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms_ai"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "cms_ai"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_ai"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"ai_projects_id" integer,
  	"prompt_templates_id" integer,
  	"sites_id" integer,
  	"blog_templates_id" integer,
  	"blog_posts_id" integer,
  	"site_links_id" integer,
  	"test_runs_id" integer,
  	"articles_id" integer,
  	"media_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "cms_ai"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_ai"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "cms_ai"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms_ai"."ai_projects_success_criteria" ADD CONSTRAINT "ai_projects_success_criteria_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."ai_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."prompt_templates_tags" ADD CONSTRAINT "prompt_templates_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."prompt_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_templates_structure" ADD CONSTRAINT "blog_templates_structure_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."blog_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_posts_tags" ADD CONSTRAINT "blog_posts_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_posts_ai_assist_target_keywords" ADD CONSTRAINT "blog_posts_ai_assist_target_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_posts_ai_assist_questions_to_answer" ADD CONSTRAINT "blog_posts_ai_assist_questions_to_answer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_posts" ADD CONSTRAINT "blog_posts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "cms_ai"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_posts" ADD CONSTRAINT "blog_posts_template_id_blog_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "cms_ai"."blog_templates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_posts" ADD CONSTRAINT "blog_posts_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "cms_ai"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_posts" ADD CONSTRAINT "blog_posts_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "cms_ai"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_posts_rels" ADD CONSTRAINT "blog_posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms_ai"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_posts_rels" ADD CONSTRAINT "blog_posts_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms_ai"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_posts_rels" ADD CONSTRAINT "blog_posts_rels_blog_posts_fk" FOREIGN KEY ("blog_posts_id") REFERENCES "cms_ai"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."blog_posts_rels" ADD CONSTRAINT "blog_posts_rels_site_links_fk" FOREIGN KEY ("site_links_id") REFERENCES "cms_ai"."site_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v_version_tags" ADD CONSTRAINT "_blog_posts_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."_blog_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v_version_ai_assist_target_keywords" ADD CONSTRAINT "_blog_posts_v_version_ai_assist_target_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."_blog_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v_version_ai_assist_questions_to_answer" ADD CONSTRAINT "_blog_posts_v_version_ai_assist_questions_to_answer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."_blog_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_parent_id_blog_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms_ai"."blog_posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_site_id_sites_id_fk" FOREIGN KEY ("version_site_id") REFERENCES "cms_ai"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_template_id_blog_templates_id_fk" FOREIGN KEY ("version_template_id") REFERENCES "cms_ai"."blog_templates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "cms_ai"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "cms_ai"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v_rels" ADD CONSTRAINT "_blog_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms_ai"."_blog_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v_rels" ADD CONSTRAINT "_blog_posts_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms_ai"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v_rels" ADD CONSTRAINT "_blog_posts_v_rels_blog_posts_fk" FOREIGN KEY ("blog_posts_id") REFERENCES "cms_ai"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."_blog_posts_v_rels" ADD CONSTRAINT "_blog_posts_v_rels_site_links_fk" FOREIGN KEY ("site_links_id") REFERENCES "cms_ai"."site_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."site_links" ADD CONSTRAINT "site_links_source_site_id_sites_id_fk" FOREIGN KEY ("source_site_id") REFERENCES "cms_ai"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."site_links" ADD CONSTRAINT "site_links_target_site_id_sites_id_fk" FOREIGN KEY ("target_site_id") REFERENCES "cms_ai"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."site_links_rels" ADD CONSTRAINT "site_links_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms_ai"."site_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."site_links_rels" ADD CONSTRAINT "site_links_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms_ai"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."site_links_rels" ADD CONSTRAINT "site_links_rels_blog_posts_fk" FOREIGN KEY ("blog_posts_id") REFERENCES "cms_ai"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."test_runs_sources" ADD CONSTRAINT "test_runs_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."test_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."test_runs" ADD CONSTRAINT "test_runs_project_id_ai_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "cms_ai"."ai_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."test_runs" ADD CONSTRAINT "test_runs_prompt_template_id_prompt_templates_id_fk" FOREIGN KEY ("prompt_template_id") REFERENCES "cms_ai"."prompt_templates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."articles_tags" ADD CONSTRAINT "articles_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."articles" ADD CONSTRAINT "articles_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "cms_ai"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."articles" ADD CONSTRAINT "articles_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "cms_ai"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."_articles_v_version_tags" ADD CONSTRAINT "_articles_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms_ai"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."_articles_v" ADD CONSTRAINT "_articles_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "cms_ai"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."_articles_v" ADD CONSTRAINT "_articles_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "cms_ai"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_ai"."media_tags" ADD CONSTRAINT "media_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms_ai"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms_ai"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ai_projects_fk" FOREIGN KEY ("ai_projects_id") REFERENCES "cms_ai"."ai_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_prompt_templates_fk" FOREIGN KEY ("prompt_templates_id") REFERENCES "cms_ai"."prompt_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sites_fk" FOREIGN KEY ("sites_id") REFERENCES "cms_ai"."sites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_templates_fk" FOREIGN KEY ("blog_templates_id") REFERENCES "cms_ai"."blog_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_posts_fk" FOREIGN KEY ("blog_posts_id") REFERENCES "cms_ai"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_links_fk" FOREIGN KEY ("site_links_id") REFERENCES "cms_ai"."site_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_test_runs_fk" FOREIGN KEY ("test_runs_id") REFERENCES "cms_ai"."test_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms_ai"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "cms_ai"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "cms_ai"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms_ai"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_ai"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "cms_ai"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ai_projects_success_criteria_order_idx" ON "cms_ai"."ai_projects_success_criteria" USING btree ("_order");
  CREATE INDEX "ai_projects_success_criteria_parent_id_idx" ON "cms_ai"."ai_projects_success_criteria" USING btree ("_parent_id");
  CREATE INDEX "ai_projects_updated_at_idx" ON "cms_ai"."ai_projects" USING btree ("updated_at");
  CREATE INDEX "ai_projects_created_at_idx" ON "cms_ai"."ai_projects" USING btree ("created_at");
  CREATE INDEX "prompt_templates_tags_order_idx" ON "cms_ai"."prompt_templates_tags" USING btree ("_order");
  CREATE INDEX "prompt_templates_tags_parent_id_idx" ON "cms_ai"."prompt_templates_tags" USING btree ("_parent_id");
  CREATE INDEX "prompt_templates_updated_at_idx" ON "cms_ai"."prompt_templates" USING btree ("updated_at");
  CREATE INDEX "prompt_templates_created_at_idx" ON "cms_ai"."prompt_templates" USING btree ("created_at");
  CREATE UNIQUE INDEX "sites_slug_idx" ON "cms_ai"."sites" USING btree ("slug");
  CREATE INDEX "sites_updated_at_idx" ON "cms_ai"."sites" USING btree ("updated_at");
  CREATE INDEX "sites_created_at_idx" ON "cms_ai"."sites" USING btree ("created_at");
  CREATE INDEX "blog_templates_structure_order_idx" ON "cms_ai"."blog_templates_structure" USING btree ("_order");
  CREATE INDEX "blog_templates_structure_parent_id_idx" ON "cms_ai"."blog_templates_structure" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "blog_templates_key_idx" ON "cms_ai"."blog_templates" USING btree ("key");
  CREATE INDEX "blog_templates_updated_at_idx" ON "cms_ai"."blog_templates" USING btree ("updated_at");
  CREATE INDEX "blog_templates_created_at_idx" ON "cms_ai"."blog_templates" USING btree ("created_at");
  CREATE INDEX "blog_posts_tags_order_idx" ON "cms_ai"."blog_posts_tags" USING btree ("_order");
  CREATE INDEX "blog_posts_tags_parent_id_idx" ON "cms_ai"."blog_posts_tags" USING btree ("_parent_id");
  CREATE INDEX "blog_posts_ai_assist_target_keywords_order_idx" ON "cms_ai"."blog_posts_ai_assist_target_keywords" USING btree ("_order");
  CREATE INDEX "blog_posts_ai_assist_target_keywords_parent_id_idx" ON "cms_ai"."blog_posts_ai_assist_target_keywords" USING btree ("_parent_id");
  CREATE INDEX "blog_posts_ai_assist_questions_to_answer_order_idx" ON "cms_ai"."blog_posts_ai_assist_questions_to_answer" USING btree ("_order");
  CREATE INDEX "blog_posts_ai_assist_questions_to_answer_parent_id_idx" ON "cms_ai"."blog_posts_ai_assist_questions_to_answer" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "cms_ai"."blog_posts" USING btree ("slug");
  CREATE INDEX "blog_posts_site_idx" ON "cms_ai"."blog_posts" USING btree ("site_id");
  CREATE INDEX "blog_posts_template_idx" ON "cms_ai"."blog_posts" USING btree ("template_id");
  CREATE INDEX "blog_posts_cover_image_idx" ON "cms_ai"."blog_posts" USING btree ("cover_image_id");
  CREATE INDEX "blog_posts_seo_seo_image_idx" ON "cms_ai"."blog_posts" USING btree ("seo_image_id");
  CREATE INDEX "blog_posts_updated_at_idx" ON "cms_ai"."blog_posts" USING btree ("updated_at");
  CREATE INDEX "blog_posts_created_at_idx" ON "cms_ai"."blog_posts" USING btree ("created_at");
  CREATE INDEX "blog_posts__status_idx" ON "cms_ai"."blog_posts" USING btree ("_status");
  CREATE INDEX "blog_posts_rels_order_idx" ON "cms_ai"."blog_posts_rels" USING btree ("order");
  CREATE INDEX "blog_posts_rels_parent_idx" ON "cms_ai"."blog_posts_rels" USING btree ("parent_id");
  CREATE INDEX "blog_posts_rels_path_idx" ON "cms_ai"."blog_posts_rels" USING btree ("path");
  CREATE INDEX "blog_posts_rels_articles_id_idx" ON "cms_ai"."blog_posts_rels" USING btree ("articles_id");
  CREATE INDEX "blog_posts_rels_blog_posts_id_idx" ON "cms_ai"."blog_posts_rels" USING btree ("blog_posts_id");
  CREATE INDEX "blog_posts_rels_site_links_id_idx" ON "cms_ai"."blog_posts_rels" USING btree ("site_links_id");
  CREATE INDEX "_blog_posts_v_version_tags_order_idx" ON "cms_ai"."_blog_posts_v_version_tags" USING btree ("_order");
  CREATE INDEX "_blog_posts_v_version_tags_parent_id_idx" ON "cms_ai"."_blog_posts_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_blog_posts_v_version_ai_assist_target_keywords_order_idx" ON "cms_ai"."_blog_posts_v_version_ai_assist_target_keywords" USING btree ("_order");
  CREATE INDEX "_blog_posts_v_version_ai_assist_target_keywords_parent_id_idx" ON "cms_ai"."_blog_posts_v_version_ai_assist_target_keywords" USING btree ("_parent_id");
  CREATE INDEX "_blog_posts_v_version_ai_assist_questions_to_answer_order_idx" ON "cms_ai"."_blog_posts_v_version_ai_assist_questions_to_answer" USING btree ("_order");
  CREATE INDEX "_blog_posts_v_version_ai_assist_questions_to_answer_parent_id_idx" ON "cms_ai"."_blog_posts_v_version_ai_assist_questions_to_answer" USING btree ("_parent_id");
  CREATE INDEX "_blog_posts_v_parent_idx" ON "cms_ai"."_blog_posts_v" USING btree ("parent_id");
  CREATE INDEX "_blog_posts_v_version_version_slug_idx" ON "cms_ai"."_blog_posts_v" USING btree ("version_slug");
  CREATE INDEX "_blog_posts_v_version_version_site_idx" ON "cms_ai"."_blog_posts_v" USING btree ("version_site_id");
  CREATE INDEX "_blog_posts_v_version_version_template_idx" ON "cms_ai"."_blog_posts_v" USING btree ("version_template_id");
  CREATE INDEX "_blog_posts_v_version_version_cover_image_idx" ON "cms_ai"."_blog_posts_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_blog_posts_v_version_seo_version_seo_image_idx" ON "cms_ai"."_blog_posts_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_blog_posts_v_version_version_updated_at_idx" ON "cms_ai"."_blog_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_blog_posts_v_version_version_created_at_idx" ON "cms_ai"."_blog_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_blog_posts_v_version_version__status_idx" ON "cms_ai"."_blog_posts_v" USING btree ("version__status");
  CREATE INDEX "_blog_posts_v_created_at_idx" ON "cms_ai"."_blog_posts_v" USING btree ("created_at");
  CREATE INDEX "_blog_posts_v_updated_at_idx" ON "cms_ai"."_blog_posts_v" USING btree ("updated_at");
  CREATE INDEX "_blog_posts_v_latest_idx" ON "cms_ai"."_blog_posts_v" USING btree ("latest");
  CREATE INDEX "_blog_posts_v_autosave_idx" ON "cms_ai"."_blog_posts_v" USING btree ("autosave");
  CREATE INDEX "_blog_posts_v_rels_order_idx" ON "cms_ai"."_blog_posts_v_rels" USING btree ("order");
  CREATE INDEX "_blog_posts_v_rels_parent_idx" ON "cms_ai"."_blog_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_blog_posts_v_rels_path_idx" ON "cms_ai"."_blog_posts_v_rels" USING btree ("path");
  CREATE INDEX "_blog_posts_v_rels_articles_id_idx" ON "cms_ai"."_blog_posts_v_rels" USING btree ("articles_id");
  CREATE INDEX "_blog_posts_v_rels_blog_posts_id_idx" ON "cms_ai"."_blog_posts_v_rels" USING btree ("blog_posts_id");
  CREATE INDEX "_blog_posts_v_rels_site_links_id_idx" ON "cms_ai"."_blog_posts_v_rels" USING btree ("site_links_id");
  CREATE INDEX "site_links_source_site_idx" ON "cms_ai"."site_links" USING btree ("source_site_id");
  CREATE INDEX "site_links_target_site_idx" ON "cms_ai"."site_links" USING btree ("target_site_id");
  CREATE INDEX "site_links_updated_at_idx" ON "cms_ai"."site_links" USING btree ("updated_at");
  CREATE INDEX "site_links_created_at_idx" ON "cms_ai"."site_links" USING btree ("created_at");
  CREATE INDEX "site_links_rels_order_idx" ON "cms_ai"."site_links_rels" USING btree ("order");
  CREATE INDEX "site_links_rels_parent_idx" ON "cms_ai"."site_links_rels" USING btree ("parent_id");
  CREATE INDEX "site_links_rels_path_idx" ON "cms_ai"."site_links_rels" USING btree ("path");
  CREATE INDEX "site_links_rels_articles_id_idx" ON "cms_ai"."site_links_rels" USING btree ("articles_id");
  CREATE INDEX "site_links_rels_blog_posts_id_idx" ON "cms_ai"."site_links_rels" USING btree ("blog_posts_id");
  CREATE INDEX "test_runs_sources_order_idx" ON "cms_ai"."test_runs_sources" USING btree ("_order");
  CREATE INDEX "test_runs_sources_parent_id_idx" ON "cms_ai"."test_runs_sources" USING btree ("_parent_id");
  CREATE INDEX "test_runs_project_idx" ON "cms_ai"."test_runs" USING btree ("project_id");
  CREATE INDEX "test_runs_prompt_template_idx" ON "cms_ai"."test_runs" USING btree ("prompt_template_id");
  CREATE INDEX "test_runs_updated_at_idx" ON "cms_ai"."test_runs" USING btree ("updated_at");
  CREATE INDEX "test_runs_created_at_idx" ON "cms_ai"."test_runs" USING btree ("created_at");
  CREATE INDEX "articles_tags_order_idx" ON "cms_ai"."articles_tags" USING btree ("_order");
  CREATE INDEX "articles_tags_parent_id_idx" ON "cms_ai"."articles_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "cms_ai"."articles" USING btree ("slug");
  CREATE INDEX "articles_cover_image_idx" ON "cms_ai"."articles" USING btree ("cover_image_id");
  CREATE INDEX "articles_seo_seo_image_idx" ON "cms_ai"."articles" USING btree ("seo_image_id");
  CREATE INDEX "articles_updated_at_idx" ON "cms_ai"."articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "cms_ai"."articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "cms_ai"."articles" USING btree ("_status");
  CREATE INDEX "_articles_v_version_tags_order_idx" ON "cms_ai"."_articles_v_version_tags" USING btree ("_order");
  CREATE INDEX "_articles_v_version_tags_parent_id_idx" ON "cms_ai"."_articles_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_parent_idx" ON "cms_ai"."_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "cms_ai"."_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_cover_image_idx" ON "cms_ai"."_articles_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_articles_v_version_seo_version_seo_image_idx" ON "cms_ai"."_articles_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "cms_ai"."_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "cms_ai"."_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "cms_ai"."_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "cms_ai"."_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "cms_ai"."_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_latest_idx" ON "cms_ai"."_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_autosave_idx" ON "cms_ai"."_articles_v" USING btree ("autosave");
  CREATE INDEX "media_tags_order_idx" ON "cms_ai"."media_tags" USING btree ("_order");
  CREATE INDEX "media_tags_parent_id_idx" ON "cms_ai"."media_tags" USING btree ("_parent_id");
  CREATE INDEX "media_updated_at_idx" ON "cms_ai"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "cms_ai"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "cms_ai"."media" USING btree ("filename");
  CREATE INDEX "users_sessions_order_idx" ON "cms_ai"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "cms_ai"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "cms_ai"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "cms_ai"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "cms_ai"."users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "cms_ai"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "cms_ai"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "cms_ai"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "cms_ai"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_ai_projects_id_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("ai_projects_id");
  CREATE INDEX "payload_locked_documents_rels_prompt_templates_id_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("prompt_templates_id");
  CREATE INDEX "payload_locked_documents_rels_sites_id_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("sites_id");
  CREATE INDEX "payload_locked_documents_rels_blog_templates_id_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("blog_templates_id");
  CREATE INDEX "payload_locked_documents_rels_blog_posts_id_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("blog_posts_id");
  CREATE INDEX "payload_locked_documents_rels_site_links_id_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("site_links_id");
  CREATE INDEX "payload_locked_documents_rels_test_runs_id_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("test_runs_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "cms_ai"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "cms_ai"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "cms_ai"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "cms_ai"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "cms_ai"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "cms_ai"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "cms_ai"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "cms_ai"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "cms_ai"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "cms_ai"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms_ai"."ai_projects_success_criteria" CASCADE;
  DROP TABLE "cms_ai"."ai_projects" CASCADE;
  DROP TABLE "cms_ai"."prompt_templates_tags" CASCADE;
  DROP TABLE "cms_ai"."prompt_templates" CASCADE;
  DROP TABLE "cms_ai"."sites" CASCADE;
  DROP TABLE "cms_ai"."blog_templates_structure" CASCADE;
  DROP TABLE "cms_ai"."blog_templates" CASCADE;
  DROP TABLE "cms_ai"."blog_posts_tags" CASCADE;
  DROP TABLE "cms_ai"."blog_posts_ai_assist_target_keywords" CASCADE;
  DROP TABLE "cms_ai"."blog_posts_ai_assist_questions_to_answer" CASCADE;
  DROP TABLE "cms_ai"."blog_posts" CASCADE;
  DROP TABLE "cms_ai"."blog_posts_rels" CASCADE;
  DROP TABLE "cms_ai"."_blog_posts_v_version_tags" CASCADE;
  DROP TABLE "cms_ai"."_blog_posts_v_version_ai_assist_target_keywords" CASCADE;
  DROP TABLE "cms_ai"."_blog_posts_v_version_ai_assist_questions_to_answer" CASCADE;
  DROP TABLE "cms_ai"."_blog_posts_v" CASCADE;
  DROP TABLE "cms_ai"."_blog_posts_v_rels" CASCADE;
  DROP TABLE "cms_ai"."site_links" CASCADE;
  DROP TABLE "cms_ai"."site_links_rels" CASCADE;
  DROP TABLE "cms_ai"."test_runs_sources" CASCADE;
  DROP TABLE "cms_ai"."test_runs" CASCADE;
  DROP TABLE "cms_ai"."articles_tags" CASCADE;
  DROP TABLE "cms_ai"."articles" CASCADE;
  DROP TABLE "cms_ai"."_articles_v_version_tags" CASCADE;
  DROP TABLE "cms_ai"."_articles_v" CASCADE;
  DROP TABLE "cms_ai"."media_tags" CASCADE;
  DROP TABLE "cms_ai"."media" CASCADE;
  DROP TABLE "cms_ai"."users_sessions" CASCADE;
  DROP TABLE "cms_ai"."users" CASCADE;
  DROP TABLE "cms_ai"."payload_kv" CASCADE;
  DROP TABLE "cms_ai"."payload_locked_documents" CASCADE;
  DROP TABLE "cms_ai"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "cms_ai"."payload_preferences" CASCADE;
  DROP TABLE "cms_ai"."payload_preferences_rels" CASCADE;
  DROP TABLE "cms_ai"."payload_migrations" CASCADE;
  DROP TYPE "cms_ai"."enum_ai_projects_status";
  DROP TYPE "cms_ai"."enum_ai_projects_default_model";
  DROP TYPE "cms_ai"."enum_prompt_templates_mode";
  DROP TYPE "cms_ai"."enum_sites_status";
  DROP TYPE "cms_ai"."enum_sites_locale";
  DROP TYPE "cms_ai"."enum_sites_site_role";
  DROP TYPE "cms_ai"."enum_blog_templates_structure_section_role";
  DROP TYPE "cms_ai"."enum_blog_templates_status";
  DROP TYPE "cms_ai"."enum_blog_templates_template_type";
  DROP TYPE "cms_ai"."enum_blog_posts_status";
  DROP TYPE "cms_ai"."enum_blog_posts_category";
  DROP TYPE "cms_ai"."enum_blog_posts_audience";
  DROP TYPE "cms_ai"."enum__blog_posts_v_version_status";
  DROP TYPE "cms_ai"."enum__blog_posts_v_version_category";
  DROP TYPE "cms_ai"."enum__blog_posts_v_version_audience";
  DROP TYPE "cms_ai"."enum_site_links_status";
  DROP TYPE "cms_ai"."enum_site_links_link_type";
  DROP TYPE "cms_ai"."enum_site_links_placement";
  DROP TYPE "cms_ai"."enum_site_links_transition_template_mode";
  DROP TYPE "cms_ai"."enum_site_links_ai_review_risk";
  DROP TYPE "cms_ai"."enum_test_runs_status";
  DROP TYPE "cms_ai"."enum_test_runs_rating";
  DROP TYPE "cms_ai"."enum_articles_status";
  DROP TYPE "cms_ai"."enum_articles_category";
  DROP TYPE "cms_ai"."enum__articles_v_version_status";
  DROP TYPE "cms_ai"."enum__articles_v_version_category";
  DROP SCHEMA IF EXISTS "cms_ai";`)
}
