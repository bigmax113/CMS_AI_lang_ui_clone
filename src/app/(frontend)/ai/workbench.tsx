'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import styles from './workbench.module.css'

type DocFile = {
  extension: string
  fileName: string
  folder: string
  path: string
  relativePath: string
  size: number
}

type FolderSummary = {
  extensions: Record<string, number>
  folder: string
  size: number
  totalFiles: number
}

type Inventory = {
  docsDir: string
  files: DocFile[]
  totalFiles: number
}

type FoldersResponse = {
  docsDir: string
  folders: FolderSummary[]
  totalFiles: number
  totalFolders: number
}

type AskResponse = {
  answer: string | null
  chunks?: Array<{
    fileName: string
    path: string
    relativePath?: string
    score: number
    text: string
  }>
  docsDir: string
  dryRun?: boolean
  grok?: {
    error?: string
    model?: string
    ok?: boolean
  }
  question: string
  retrieval?: {
    candidateChunks: number
    ranker: string
  }
  scanned?: number
  sources?: Array<{
    chars: number
    extractor: string
    fileName: string
    folder?: string
    path: string
    relativePath?: string
    score: number
    warning?: string
  }>
  warnings?: string[]
}

type ActiveView = 'ask' | 'generate' | 'corpus' | 'admin'

type GenerateImageResponse = {
  data?: Array<{
    b64_json?: string
    revised_prompt?: string
    url?: string
  }>
  error?: string
  model: string
  ok: boolean
}

type GenerateVideoResponse = {
  error?: string
  model: string
  ok: boolean
  requestID?: string
  status?: string
  video?: {
    url?: string
  }
}

const presets = [
  {
    label: 'Quick inventory',
    question: 'Briefly describe what documents are available in this folder.',
  },
  {
    label: 'Tester summary',
    question: 'What should a non-technical tester check first in this workspace?',
  },
  {
    label: 'Business answer',
    question: 'Answer the question using only the retrieved sources and cite the file names.',
  },
  {
    label: 'Find gaps',
    question: 'What information is missing from the current source set?',
  },
]

const adminLinks = [
  {
    description: 'Create and edit rich content pages with drafts and SEO fields.',
    href: '/admin/collections/articles',
    label: 'Articles',
  },
  {
    description: 'Describe validation goals, owner, model, and success criteria.',
    href: '/admin/collections/ai-projects',
    label: 'AI Projects',
  },
  {
    description: 'Save reusable prompts for QA, summaries, audits, and drafts.',
    href: '/admin/collections/prompt-templates',
    label: 'Prompt Templates',
  },
  {
    description: 'Record tester questions, answers, source quality, and review notes.',
    href: '/admin/collections/test-runs',
    label: 'Test Runs',
  },
  {
    description: 'Create template-driven blog posts with AI briefs and link plans.',
    href: '/admin/collections/blog-posts',
    label: 'Blog Posts',
  },
  {
    description: 'Approve cross-site transitions, anchors, and routing handoffs.',
    href: '/admin/collections/site-links',
    label: 'Site Links',
  },
  {
    description: 'Manage domains, locales, site roles, and default blog paths.',
    href: '/admin/collections/sites',
    label: 'Sites',
  },
  {
    description: 'Upload images, PDFs, and supporting files for CMS content.',
    href: '/admin/collections/media',
    label: 'Media',
  },
]

export function AiDocsWorkbench() {
  const [activeView, setActiveView] = useState<ActiveView>('ask')
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [folders, setFolders] = useState<FoldersResponse | null>(null)
  const [question, setQuestion] = useState(presets[1].question)
  const [include, setInclude] = useState('')
  const [folder, setFolder] = useState('all')
  const [answerInQuestionLanguage, setAnswerInQuestionLanguage] = useState(true)
  const [crossLanguageSearch, setCrossLanguageSearch] = useState(true)
  const [embeddingModel, setEmbeddingModel] = useState('')
  const [includePDF, setIncludePDF] = useState(true)
  const [useEmbeddings, setUseEmbeddings] = useState(false)
  const [maxFiles, setMaxFiles] = useState(120)
  const [maxChunks, setMaxChunks] = useState(8)
  const [maxEmbeddingCandidates, setMaxEmbeddingCandidates] = useState(2000)
  const [result, setResult] = useState<AskResponse | null>(null)
  const [imagePrompt, setImagePrompt] = useState(
    'A clean editorial hero image for an AI-powered CMS dashboard, realistic product UI, no text.',
  )
  const [imageAspectRatio, setImageAspectRatio] = useState('16:9')
  const [imageResult, setImageResult] = useState<GenerateImageResponse | null>(null)
  const [videoPrompt, setVideoPrompt] = useState(
    'Animate an editorial CMS dashboard preview with subtle camera motion and polished product energy.',
  )
  const [videoImageURL, setVideoImageURL] = useState('')
  const [videoDuration, setVideoDuration] = useState(12)
  const [videoResult, setVideoResult] = useState<GenerateVideoResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [loadingInventory, setLoadingInventory] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadInventory()
  }, [])

  const folderOptions = useMemo(() => folders?.folders || [], [folders?.folders])

  const selectedFolder = useMemo(() => {
    if (folder === 'all') {
      return null
    }

    return folderOptions.find((item) => item.folder === folder) || null
  }, [folder, folderOptions])

  const visibleFiles = useMemo(() => {
    if (!inventory) {
      return []
    }

    return inventory.files
      .filter(
        (file) =>
          folder === 'all' || file.folder === folder || file.folder.startsWith(`${folder}\\`),
      )
      .filter((file) => !include || file.relativePath.toLowerCase().includes(include.toLowerCase()))
      .slice(0, 160)
  }, [folder, include, inventory])

  async function loadInventory() {
    setLoadingInventory(true)
    setError(null)

    try {
      const [docsResponse, foldersResponse] = await Promise.all([
        fetch('/api/ai-docs?limit=1200'),
        fetch('/api/ai-folders'),
      ])

      if (!docsResponse.ok || !foldersResponse.ok) {
        throw new Error('Could not load the document inventory.')
      }

      setInventory((await docsResponse.json()) as Inventory)
      setFolders((await foldersResponse.json()) as FoldersResponse)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoadingInventory(false)
    }
  }

  async function runAsk(nextDryRun: boolean) {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/ask', {
        body: JSON.stringify({
          answerInQuestionLanguage,
          crossLanguageSearch,
          dryRun: nextDryRun,
          embeddingModel,
          folder,
          include: include || undefined,
          includePDF,
          maxChunks,
          maxEmbeddingCandidates,
          maxFiles,
          question,
          useEmbeddings,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await response.json()) as AskResponse & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`)
      }

      setResult(payload)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoading(false)
    }
  }

  function prepareSafeRun() {
    setFolder('all')
    setInclude('')
    setMaxFiles(120)
    setMaxChunks(8)
    setMaxEmbeddingCandidates(2000)
    setUseEmbeddings(false)
    setAnswerInQuestionLanguage(true)
    setCrossLanguageSearch(true)
    setEmbeddingModel('')
  }

  async function runImageGeneration() {
    setGeneratingImage(true)
    setError(null)
    setImageResult(null)

    try {
      const response = await fetch('/api/generate-image', {
        body: JSON.stringify({
          aspectRatio: imageAspectRatio,
          prompt: imagePrompt,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await response.json()) as GenerateImageResponse

      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`)
      }

      setImageResult(payload)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setGeneratingImage(false)
    }
  }

  async function runVideoGeneration() {
    setGeneratingVideo(true)
    setError(null)
    setVideoResult(null)

    try {
      const response = await fetch('/api/generate-video', {
        body: JSON.stringify({
          duration: videoDuration,
          imageURL: videoImageURL || undefined,
          prompt: videoPrompt,
          waitForResult: true,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await response.json()) as GenerateVideoResponse

      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`)
      }

      setVideoResult(payload)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setGeneratingVideo(false)
    }
  }

  const totalFolders = folders?.totalFolders || 0
  const totalFiles = inventory?.totalFiles || folders?.totalFiles || 0
  const sourceCount = result?.sources?.length || 0
  const chunkCount = result?.chunks?.length || 0

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/ai">
          <span className={styles.logo}>P</span>
          <span>
            <strong>Payload AI</strong>
            <small>Workbench</small>
          </span>
        </a>

        <nav className={styles.nav}>
          <button
            className={activeView === 'ask' ? styles.activeNavButton : styles.navButton}
            onClick={() => setActiveView('ask')}
            type="button"
          >
            Ask
          </button>
          <button
            className={activeView === 'generate' ? styles.activeNavButton : styles.navButton}
            onClick={() => setActiveView('generate')}
            type="button"
          >
            Generate
          </button>
          <button
            className={activeView === 'corpus' ? styles.activeNavButton : styles.navButton}
            onClick={() => setActiveView('corpus')}
            type="button"
          >
            Corpus
          </button>
          <button
            className={activeView === 'admin' ? styles.activeNavButton : styles.navButton}
            onClick={() => setActiveView('admin')}
            type="button"
          >
            Admin
          </button>
        </nav>

        <div className={styles.sidebarBox}>
          <span>Tester flow</span>
          <ol>
            <li>Preview sources.</li>
            <li>Ask Grok after sources look right.</li>
            <li>Generate media drafts when needed.</li>
            <li>Save useful runs in Admin.</li>
          </ol>
        </div>

        <Link className={styles.adminButton} href="/admin">
          Open Payload Admin
        </Link>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.kicker}>Documents + Payload Admin + Grok 4.3</p>
            <h1>AI workspace for content testing</h1>
          </div>
          <button
            className={styles.iconButton}
            disabled={loadingInventory}
            onClick={loadInventory}
            title="Refresh document inventory"
            type="button"
          >
            Refresh
          </button>
        </header>

        <section className={styles.metrics} aria-label="Workspace status">
          <div>
            <span>Documents</span>
            <strong>{loadingInventory ? '...' : totalFiles.toLocaleString()}</strong>
          </div>
          <div>
            <span>Folders</span>
            <strong>{loadingInventory ? '...' : totalFolders.toLocaleString()}</strong>
          </div>
          <div>
            <span>Selected scope</span>
            <strong>{folder === 'all' ? 'All folders' : folder || '(root)'}</strong>
          </div>
          <div>
            <span>Docs root</span>
            <strong className={styles.pathText}>
              {inventory?.docsDir || folders?.docsDir || 'Waiting for API...'}
            </strong>
          </div>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}

        {activeView === 'ask' ? (
          <div className={styles.askGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Question editor</h2>
                  <p>Keep retrieval narrow, preview sources, then call the model.</p>
                </div>
                <button className={styles.secondaryButton} onClick={prepareSafeRun} type="button">
                  Safe defaults
                </button>
              </div>

              <label className={styles.field}>
                Question
                <textarea
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={7}
                  value={question}
                />
              </label>

              <div className={styles.presets}>
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setQuestion(preset.question)}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className={styles.splitFields}>
                <label className={styles.field}>
                  Folder
                  <select value={folder} onChange={(event) => setFolder(event.target.value)}>
                    <option value="all">All folders</option>
                    {folderOptions.map((item) => (
                      <option key={item.folder || '__root'} value={item.folder}>
                        {item.folder || '(root)'} - {item.totalFiles}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  Name/path filter
                  <input
                    onChange={(event) => setInclude(event.target.value)}
                    placeholder="B2B, invoice, manual..."
                    value={include}
                  />
                </label>
              </div>

              <div className={styles.switchGrid}>
                <label>
                  <input
                    checked={answerInQuestionLanguage}
                    onChange={(event) => setAnswerInQuestionLanguage(event.target.checked)}
                    type="checkbox"
                  />
                  Answer in question language
                </label>
                <label>
                  <input
                    checked={crossLanguageSearch}
                    onChange={(event) => setCrossLanguageSearch(event.target.checked)}
                    type="checkbox"
                  />
                  Cross-language search
                </label>
                <label>
                  <input
                    checked={includePDF}
                    onChange={(event) => setIncludePDF(event.target.checked)}
                    type="checkbox"
                  />
                  Include PDFs
                </label>
                <label>
                  <input
                    checked={useEmbeddings}
                    onChange={(event) => setUseEmbeddings(event.target.checked)}
                    type="checkbox"
                  />
                  Use semantic reranking
                </label>
              </div>

              <label className={styles.field}>
                Optional embedding model
                <input
                  onChange={(event) => setEmbeddingModel(event.target.value)}
                  placeholder="Set XAI_EMBEDDING_MODEL or leave blank"
                  value={embeddingModel}
                />
              </label>

              <div className={styles.numberGrid}>
                <label>
                  Files
                  <input
                    max={500}
                    min={1}
                    onChange={(event) => setMaxFiles(Number(event.target.value))}
                    type="number"
                    value={maxFiles}
                  />
                </label>
                <label>
                  Chunks
                  <input
                    max={20}
                    min={1}
                    onChange={(event) => setMaxChunks(Number(event.target.value))}
                    type="number"
                    value={maxChunks}
                  />
                </label>
                <label>
                  Embed candidates
                  <input
                    max={5000}
                    min={1}
                    onChange={(event) => setMaxEmbeddingCandidates(Number(event.target.value))}
                    type="number"
                    value={maxEmbeddingCandidates}
                  />
                </label>
              </div>

              <div className={styles.actionRow}>
                <button
                  className={styles.secondaryButton}
                  disabled={loading}
                  onClick={() => void runAsk(true)}
                  type="button"
                >
                  Preview sources
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={loading}
                  onClick={() => void runAsk(false)}
                  type="button"
                >
                  Ask Grok
                </button>
              </div>

              {loading ? (
                <div className={styles.running}>
                  Retrieving context and waiting for Grok...
                </div>
              ) : null}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Result</h2>
                  <p>
                    {result
                      ? `${result.scanned || 0} files scanned, ${sourceCount} sources, ${chunkCount} chunks`
                      : 'Run a preview to inspect source quality first.'}
                  </p>
                </div>
                {result ? (
                  <span
                    className={result.grok?.ok === false ? styles.badgeError : styles.badge}
                  >
                    {result.dryRun ? 'preview' : result.grok?.model || 'answer'}
                  </span>
                ) : null}
              </div>

              {!result ? (
                <div className={styles.emptyState}>
                  <strong>Nothing has run yet.</strong>
                  <span>Start with Preview sources so the tester can trust the context.</span>
                </div>
              ) : null}

              {result?.answer ? <pre className={styles.answer}>{result.answer}</pre> : null}

              {result?.warnings?.length ? (
                <div className={styles.warningBox}>
                  {result.warnings.map((warning) => (
                    <div key={warning}>{warning}</div>
                  ))}
                </div>
              ) : null}

              {result ? (
                <div className={styles.resultColumns}>
                  <div>
                    <h3>Sources</h3>
                    <div className={styles.sourceList}>
                      {(result.sources || []).slice(0, 80).map((source) => (
                        <article className={styles.sourceRow} key={source.path}>
                          <strong>{source.fileName}</strong>
                          <span>
                            {source.extractor} - {formatBytes(source.chars)} - score{' '}
                            {source.score.toFixed(3)}
                          </span>
                          <small>{source.relativePath || source.path}</small>
                        </article>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3>Top chunks</h3>
                    <div className={styles.chunkList}>
                      {(result.chunks || []).map((chunk, index) => (
                        <details key={`${chunk.path}-${index}`}>
                          <summary>
                            {index + 1}. {chunk.fileName} - {chunk.score.toFixed(3)}
                          </summary>
                          <p>{chunk.text.slice(0, 1400)}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {activeView === 'generate' ? (
          <div className={styles.askGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Image generation</h2>
                  <p>Generate CMS hero images and editorial drafts with Grok Imagine.</p>
                </div>
                <span className={styles.badge}>grok-imagine-image</span>
              </div>

              <label className={styles.field}>
                Image prompt
                <textarea
                  onChange={(event) => setImagePrompt(event.target.value)}
                  rows={7}
                  value={imagePrompt}
                />
              </label>

              <div className={styles.splitFields}>
                <label className={styles.field}>
                  Aspect ratio
                  <select
                    onChange={(event) => setImageAspectRatio(event.target.value)}
                    value={imageAspectRatio}
                  >
                    <option value="16:9">16:9</option>
                    <option value="1:1">1:1</option>
                    <option value="9:16">9:16</option>
                    <option value="4:3">4:3</option>
                    <option value="3:2">3:2</option>
                    <option value="auto">Auto</option>
                  </select>
                </label>
              </div>

              <div className={styles.actionRow}>
                <button
                  className={styles.primaryButton}
                  disabled={generatingImage}
                  onClick={() => void runImageGeneration()}
                  type="button"
                >
                  Generate image
                </button>
              </div>

              {generatingImage ? <div className={styles.running}>Waiting for Grok Imagine...</div> : null}

              {imageResult?.data?.length ? (
                <div className={styles.sourceList}>
                  {imageResult.data.map((image, index) => (
                    <article className={styles.sourceRow} key={`${image.url || 'image'}-${index}`}>
                      <strong>Image {index + 1}</strong>
                      {image.url ? (
                        <a href={image.url} rel="noreferrer" target="_blank">
                          {image.url}
                        </a>
                      ) : null}
                      {image.b64_json ? <small>Base64 image returned</small> : null}
                      {image.revised_prompt ? <small>{image.revised_prompt}</small> : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Video generation</h2>
                  <p>Create short Grok Imagine videos from text, optionally guided by an image URL.</p>
                </div>
                <span className={styles.badge}>grok-imagine-video</span>
              </div>

              <label className={styles.field}>
                Video prompt
                <textarea
                  onChange={(event) => setVideoPrompt(event.target.value)}
                  rows={6}
                  value={videoPrompt}
                />
              </label>

              <label className={styles.field}>
                Optional source image URL
                <input
                  onChange={(event) => setVideoImageURL(event.target.value)}
                  placeholder="https://..."
                  value={videoImageURL}
                />
              </label>

              <label className={styles.field}>
                Duration seconds
                <input
                  max={15}
                  min={6}
                  onChange={(event) => setVideoDuration(Number(event.target.value))}
                  type="number"
                  value={videoDuration}
                />
              </label>

              <div className={styles.actionRow}>
                <button
                  className={styles.primaryButton}
                  disabled={generatingVideo}
                  onClick={() => void runVideoGeneration()}
                  type="button"
                >
                  Generate video
                </button>
              </div>

              {generatingVideo ? (
                <div className={styles.running}>Starting video request and polling xAI...</div>
              ) : null}

              {videoResult ? (
                <div className={styles.emptyState}>
                  <strong>{videoResult.ok ? 'Video ready' : `Status: ${videoResult.status || 'pending'}`}</strong>
                  {videoResult.requestID ? <span>Request ID: {videoResult.requestID}</span> : null}
                  {videoResult.video?.url ? (
                    <a href={videoResult.video.url} rel="noreferrer" target="_blank">
                      {videoResult.video.url}
                    </a>
                  ) : null}
                  {videoResult.error ? <span>{videoResult.error}</span> : null}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {activeView === 'corpus' ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Document corpus</h2>
                <p>Browse the mounted AI_DOCS_DIR before running retrieval.</p>
              </div>
              <span className={styles.badge}>{visibleFiles.length} visible</span>
            </div>

            <div className={styles.corpusGrid}>
              <div className={styles.folderList}>
                <button
                  className={folder === 'all' ? styles.selectedFolder : styles.folderButton}
                  onClick={() => setFolder('all')}
                  type="button"
                >
                  <strong>All folders</strong>
                  <span>{totalFiles.toLocaleString()} files</span>
                </button>
                {folderOptions.map((item) => (
                  <button
                    className={folder === item.folder ? styles.selectedFolder : styles.folderButton}
                    key={item.folder || '__root'}
                    onClick={() => setFolder(item.folder)}
                    type="button"
                  >
                    <strong>{item.folder || '(root)'}</strong>
                    <span>
                      {item.totalFiles.toLocaleString()} files - {formatBytes(item.size)}
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <div className={styles.corpusToolbar}>
                  <label className={styles.field}>
                    Filter files
                    <input
                      onChange={(event) => setInclude(event.target.value)}
                      placeholder="Type part of a file name or path"
                      value={include}
                    />
                  </label>
                  {selectedFolder ? (
                    <div className={styles.folderMeta}>
                      {Object.entries(selectedFolder.extensions)
                        .slice(0, 6)
                        .map(([extension, count]) => (
                          <span key={extension}>
                            {extension || 'file'} {count}
                          </span>
                        ))}
                    </div>
                  ) : null}
                </div>

                <div className={styles.fileList}>
                  {visibleFiles.map((file) => (
                    <div className={styles.fileRow} key={file.path}>
                      <span className={styles.extension}>{file.extension.replace('.', '')}</span>
                      <div>
                        <strong>{file.fileName}</strong>
                        <small>{file.relativePath}</small>
                      </div>
                      <span>{formatBytes(file.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeView === 'admin' ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Admin workspace</h2>
                <p>
                  Payload Admin is the place to manage content, prompt presets, and test evidence.
                </p>
              </div>
              <Link className={styles.primaryLink} href="/admin">
                Open admin
              </Link>
            </div>

            <div className={styles.adminGrid}>
              {adminLinks.map((link) => (
                <Link className={styles.adminCard} href={link.href} key={link.href}>
                  <strong>{link.label}</strong>
                  <span>{link.description}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value)) {
    return '0 B'
  }

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 102.4) / 10} KB`
  }

  return `${Math.round(value / 1024 / 102.4) / 10} MB`
}
