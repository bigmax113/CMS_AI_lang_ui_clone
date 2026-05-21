# GitHub Upload

Use this folder as a brand-new repository root. Do not copy it into the old Payload monorepo.

## Option 1: GitHub Web UI

1. Create a new empty repository on GitHub, for example `payload-ai-tester-workbench`.
2. Open the repository page and choose `uploading an existing file`.
3. Drag all files from this folder into GitHub.
4. Commit to `main`.

## Option 2: Git Commands

```powershell
cd "C:\Users\bigma\OneDrive\Документы\New project\payload-ai-tester-workbench-github"
git init
git add .
git commit -m "Initial Payload AI tester workbench"
git branch -M main
git remote add origin https://github.com/bigmax113/payload-ai-tester-workbench.git
git push -u origin main
```

## First Checks

```powershell
corepack pnpm install
corepack pnpm run build
```

For local Docker:

```powershell
docker compose up --build
```

For Render:

1. Connect the new GitHub repository as a Blueprint.
2. Set `PAYLOAD_ADMIN_PASSWORD`.
3. Keep `PAYLOAD_DB_PUSH=true` for the first tester deployment.
