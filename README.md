# CMS AI

Docker-ready Payload CMS + Grok prototype for AI-assisted content operations.

## What Is Inside

- `/ai` - Grok 4.3 workspace for document QA, source preview, image generation, and video generation.
- `/admin` - custom Payload Admin dashboard, continuing the editorial control-room UI from the custom admin build.
- `AI Projects` - goals, owners, Grok model defaults, and success criteria.
- `Prompt Templates` - reusable QA, summary, audit, draft, blog planning, and linking prompts.
- `Test Runs` - saved tester questions, Grok answers, sources, and review notes.
- `Sites` - managed website registry with domains, locales, roles, and owners.
- `Blog Templates` - reusable blog structures, SEO patterns, AI prompts, and linking rules.
- `Blog Posts` - template-driven posts with AI briefs, related content, SEO, and link plans.
- `Site Links` - approved cross-site links, transition-page copy, anchors, and AI rationale.
- `Articles` and `Media` - normal CMS editor surfaces for content testing.

## AI Provider

The prototype uses xAI-compatible REST endpoints:

```text
GROK_TEXT_MODEL=grok-4.3
GROK_IMAGE_MODEL=grok-imagine-image
GROK_VIDEO_MODEL=grok-imagine-video
XAI_BASE_URL=https://api.x.ai/v1
```

Set `XAI_API_KEY` in `.env` locally or as a Render secret. Do not commit real API keys.

## Local Start

```powershell
Copy-Item .env.example .env
notepad .env
corepack pnpm install
corepack pnpm dev
```

Open:

```text
http://localhost:3000/ai
http://localhost:3000/admin
```

Default local admin:

```text
dev@payloadcms.com
test
```

## Docker Start

```powershell
docker compose up --build
```

Set `AI_DOCS_DIR` in `.env` if you want Docker to mount a real document folder.

## Render

This project includes `render.yaml` for a Docker web service plus Render Postgres.

1. Push this folder to `bigmax113/CMS_AI`.
2. In Render, create or sync the Blueprint from `render.yaml`.
3. Set `PAYLOAD_ADMIN_PASSWORD`.
4. Set `XAI_API_KEY`.

For this prototype, `PAYLOAD_DB_PUSH=true` lets Payload create/update Postgres tables on boot.
Set it to `false` only when you decide to manage migrations manually.
