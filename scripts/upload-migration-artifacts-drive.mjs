import fs from 'node:fs/promises'
import path from 'node:path'

const workspaceRoot = path.resolve('..')
const artifactsRoot = path.join(workspaceRoot, 'migration_artifacts')

const driveFolderID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1WGbLfKoL8bYEi6fIXI2ktBPZmwAe86Pj'
const reportFolderName =
  process.env.DRIVE_REPORT_FOLDER_NAME || `CMS AI WP migration QA ${new Date().toISOString().slice(0, 10)}`

const homeDir = process.env.USERPROFILE || process.env.HOME
const clientSecretPath =
  process.env.GOOGLE_DRIVE_CLIENT_SECRET_PATH ||
  path.join(
    homeDir,
    '.openclaw',
    'client_secret_653692761283-ajsu8chvcvqmsg80th5vpjmt8d9flk2m.apps.googleusercontent.com.json',
  )
const tokenPath =
  process.env.GOOGLE_DRIVE_OAUTH_TOKEN_PATH ||
  path.join(homeDir, '.openclaw', 'workspace', 'cms-ai-drive-file-token.json')

const filesToUpload = [
  ['wp-import-qa-20260603', 'qa-summary.md'],
  ['wp-import-qa-20260603', 'qa-report.json'],
  ['wp-video-normalization-20260603-apply', 'video-normalization-summary.md'],
  ['wp-video-normalization-20260603-apply', 'video-normalization-report.json'],
  ['wp-cover-image-backfill-20260603-apply-3', 'cover-image-backfill-summary.md'],
  ['wp-cover-image-backfill-20260603-apply-3', 'cover-image-backfill-report.json'],
  ['wp-translation-manual-map-20260603', 'apply-report.json'],
  ['wp-translation-manual-map-20260603', 'manual-map.json'],
  ['wp-translation-matching-apply-threshold-80/2026-06-03T12-37-52-299Z', 'summary.json'],
  ['wp-translation-matching-apply-threshold-80/2026-06-03T12-37-52-299Z', 'review-candidates.json'],
  ['wp-migration-20260603-full/seo-baseline', 'summary.json'],
  ['wp-migration-20260603-full/wp-export', 'summary.json'],
  ['wp-migration-20260603-import-live-full-rerun/cms-import', 'summary.json'],
]

const mimeTypes = {
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
}

const readJSON = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'))

const getOAuthClient = async () => {
  const clientSecret = await readJSON(clientSecretPath)
  const token = await readJSON(tokenPath)
  const config = clientSecret.installed || clientSecret.web

  if (!config?.client_id || !config?.client_secret) {
    throw new Error(`Cannot read OAuth client credentials from ${clientSecretPath}`)
  }

  if (!token.refresh_token) {
    throw new Error(`Cannot read refresh_token from ${tokenPath}`)
  }

  return {
    clientID: config.client_id,
    clientSecret: config.client_secret,
    refreshToken: token.refresh_token,
  }
}

const getAccessToken = async () => {
  const client = await getOAuthClient()
  const body = new URLSearchParams({
    client_id: client.clientID,
    client_secret: client.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: client.refreshToken,
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    body,
    method: 'POST',
  })

  const data = await response.json()

  if (!response.ok || !data.access_token) {
    throw new Error(`Google token refresh failed: ${response.status} ${JSON.stringify(data)}`)
  }

  return data.access_token
}

const driveFetch = async ({ accessToken, body, headers = {}, method = 'GET', url }) => {
  const response = await fetch(url, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...headers,
    },
    method,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(`Drive API failed ${method} ${url}: ${response.status} ${JSON.stringify(data)}`)
  }

  return data
}

const createFolder = async ({ accessToken, name, parentID }) =>
  driveFetch({
    accessToken,
    body: JSON.stringify({
      mimeType: 'application/vnd.google-apps.folder',
      name,
      parents: [parentID],
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    url: 'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
  })

const uploadFile = async ({ accessToken, filePath, name, parentID }) => {
  const extension = path.extname(filePath).toLowerCase()
  const mimeType = mimeTypes[extension] || 'application/octet-stream'
  const boundary = `codex-drive-boundary-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const content = await fs.readFile(filePath)
  const metadata = Buffer.from(
    `${JSON.stringify({ name, parents: [parentID] })}`,
    'utf8',
  )
  const chunks = [
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    metadata,
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]

  return driveFetch({
    accessToken,
    body: Buffer.concat(chunks),
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    method: 'POST',
    url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size',
  })
}

const buildOverview = async () => {
  const qaSummary = await fs.readFile(path.join(artifactsRoot, 'wp-import-qa-20260603', 'qa-summary.md'), 'utf8')
  const videoSummary = await fs.readFile(
    path.join(artifactsRoot, 'wp-video-normalization-20260603-apply', 'video-normalization-summary.md'),
    'utf8',
  )
  const coverSummary = await fs.readFile(
    path.join(artifactsRoot, 'wp-cover-image-backfill-20260603-apply-3', 'cover-image-backfill-summary.md'),
    'utf8',
  )

  return [
    '# CMS AI WP Migration Cloud Report',
    '',
    `Uploaded: ${new Date().toISOString()}`,
    '',
    '## Final QA',
    qaSummary.trim(),
    '',
    '## Video Normalization',
    videoSummary.trim(),
    '',
    '## Cover Image Backfill',
    coverSummary.trim(),
    '',
    '## Notes',
    '- Imported WP articles are kept as drafts, so public canonical/JSON-LD/OG E2E for imported pages still requires publishing or preview QA.',
    '- Media used by imported blog articles is stored through Google Drive-backed Payload Media.',
  ].join('\n')
}

const main = async () => {
  const accessToken = await getAccessToken()
  const reportFolder = await createFolder({ accessToken, name: reportFolderName, parentID: driveFolderID })
  const uploaded = []

  const overview = await buildOverview()
  const overviewPath = path.join(artifactsRoot, 'cms-ai-wp-migration-cloud-report.md')
  await fs.writeFile(overviewPath, overview, 'utf8')

  uploaded.push(
    await uploadFile({
      accessToken,
      filePath: overviewPath,
      name: 'README-cms-ai-wp-migration-cloud-report.md',
      parentID: reportFolder.id,
    }),
  )

  for (const [folder, fileName] of filesToUpload) {
    const sourcePath = path.join(artifactsRoot, folder, fileName)
    const stat = await fs.stat(sourcePath).catch(() => null)

    if (!stat?.isFile()) {
      console.warn(`[skip] missing ${sourcePath}`)
      continue
    }

    const uploadName = `${folder.replace(/[\\/]/g, '__')}__${fileName}`
    uploaded.push(await uploadFile({ accessToken, filePath: sourcePath, name: uploadName, parentID: reportFolder.id }))
  }

  console.log(
    JSON.stringify(
      {
        folder: reportFolder,
        uploaded,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
