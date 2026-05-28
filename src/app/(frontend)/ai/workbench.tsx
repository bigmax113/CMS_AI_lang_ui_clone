'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { baseUICopy, supportedLocales, type UICopy, type UICopyKey, type UILocale } from './i18n'
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

type ActiveView = 'ask' | 'content' | 'generate' | 'corpus' | 'admin'

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

type GenerateArticleResponse = {
  draft?: {
    bodyMarkdown?: string
    faq?: Array<{
      answer: string
      question: string
    }>
    outline?: string[]
    seoDescription?: string
    seoTitle?: string
    slug?: string
    summary?: string
    title?: string
  }
  error?: string
  model: string
  ok: boolean
}

type SaveArticleDraftResponse = {
  adminURL?: string
  article?: {
    id: number | string
    slug?: string
    title?: string
  }
  error?: string
  errors?: Array<{
    message?: string
  }>
  ok: boolean
  publicURL?: string
}

const presets = [
  {
    labelKey: 'presetQuickInventory',
    questionKey: 'presetQuickInventoryQuestion',
  },
  {
    labelKey: 'presetTesterSummary',
    questionKey: 'presetTesterSummaryQuestion',
  },
  {
    labelKey: 'presetBusinessAnswer',
    questionKey: 'presetBusinessAnswerQuestion',
  },
  {
    labelKey: 'presetFindGaps',
    questionKey: 'presetFindGapsQuestion',
  },
] satisfies Array<{ labelKey: UICopyKey; questionKey: UICopyKey }>

const adminLinks = [
  {
    descriptionKey: 'adminArticlesDescription',
    href: '/admin/collections/articles',
    labelKey: 'adminArticlesLabel',
  },
  {
    descriptionKey: 'adminAuthorsDescription',
    href: '/admin/collections/authors',
    labelKey: 'adminAuthorsLabel',
  },
  {
    descriptionKey: 'adminProjectsDescription',
    href: '/admin/collections/ai-projects',
    labelKey: 'adminProjectsLabel',
  },
  {
    descriptionKey: 'adminPromptTemplatesDescription',
    href: '/admin/collections/prompt-templates',
    labelKey: 'adminPromptTemplatesLabel',
  },
  {
    descriptionKey: 'adminTestRunsDescription',
    href: '/admin/collections/test-runs',
    labelKey: 'adminTestRunsLabel',
  },
  {
    descriptionKey: 'adminBlogPostsDescription',
    href: '/admin/collections/blog-posts',
    labelKey: 'adminBlogPostsLabel',
  },
  {
    descriptionKey: 'adminSiteLinksDescription',
    href: '/admin/collections/site-links',
    labelKey: 'adminSiteLinksLabel',
  },
  {
    descriptionKey: 'adminSitesDescription',
    href: '/admin/collections/sites',
    labelKey: 'adminSitesLabel',
  },
  {
    descriptionKey: 'adminMediaDescription',
    href: '/admin/collections/media',
    labelKey: 'adminMediaLabel',
  },
] satisfies Array<{ descriptionKey: UICopyKey; href: string; labelKey: UICopyKey }>

function inferArticleOutputLanguage(title: string, brief: string): string {
  const text = `${title}\n${brief}`
  const cyrillicCount = (text.match(/[А-Яа-яЁёІіЇїЄєҐґ]/gu) || []).length
  const latinCount = (text.match(/[A-Za-z]/g) || []).length

  if (latinCount >= Math.max(20, cyrillicCount * 3)) {
    return 'English'
  }

  return [
    'Use the same primary language as the article brief and title.',
    'Do not translate the source into another language unless the brief explicitly asks for translation.',
  ].join(' ')
}

function inferArticleLanguageCode(title: string, content: string): string {
  const text = `${title}\n${content}`
  const cyrillicCount = (text.match(/[А-Яа-яЁёІіЇїЄєҐґ]/gu) || []).length
  const latinCount = (text.match(/[A-Za-z]/g) || []).length

  if (latinCount >= Math.max(20, cyrillicCount * 3)) {
    return 'EN'
  }

  if (/[ЇїЄєІіҐґ]/u.test(text)) {
    return 'UK'
  }

  return cyrillicCount ? 'RU' : 'EN'
}

function toSafeText(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(toSafeText).filter(Boolean).join('\n')
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return ''
}

function toSafeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(toSafeText).filter(Boolean)
  }

  const text = toSafeText(value)

  return text
    ? text
        .split(/\r?\n|;/u)
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

function extractResponseError(payload: { error?: string; errors?: Array<{ message?: string }> }, status: number): string {
  return payload.error || payload.errors?.map((error) => error.message).filter(Boolean).join('; ') || `HTTP ${status}`
}

export function AiDocsWorkbench() {
  const [activeView, setActiveView] = useState<ActiveView>('ask')
  const [uiLocale, setUiLocale] = useState<UILocale>(() => {
    if (typeof window === 'undefined') {
      return 'en'
    }

    const storedLocale = window.localStorage.getItem('cms-ai-ui-locale') as UILocale | null

    return storedLocale && supportedLocales.some((locale) => locale.code === storedLocale)
      ? storedLocale
      : 'en'
  })
  const [uiCopy, setUiCopy] = useState<UICopy>(baseUICopy)
  const [translatingUi, setTranslatingUi] = useState(false)
  const [translationNotice, setTranslationNotice] = useState<string | null>(null)
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [folders, setFolders] = useState<FoldersResponse | null>(null)
  const [question, setQuestion] = useState(baseUICopy.presetTesterSummaryQuestion)
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
  const [articleTitle, setArticleTitle] = useState('AI-ready CMS product guide')
  const [articleBrief, setArticleBrief] = useState(
    'Explain how editors use Payload CMS with authors, product cards, video blocks, FAQ, SEO microdata, and AI drafting in one publishing workflow.',
  )
  const [articleKeywords, setArticleKeywords] = useState('Payload CMS, AI content workflow, product cards, SEO')
  const [articleResult, setArticleResult] = useState<GenerateArticleResponse | null>(null)
  const [saveArticleResult, setSaveArticleResult] = useState<SaveArticleDraftResponse | null>(null)
  const [videoPrompt, setVideoPrompt] = useState(
    'Animate an editorial CMS dashboard preview with subtle camera motion and polished product energy.',
  )
  const [videoImageURL, setVideoImageURL] = useState('')
  const [videoDuration, setVideoDuration] = useState(12)
  const [videoResult, setVideoResult] = useState<GenerateVideoResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [generatingArticle, setGeneratingArticle] = useState(false)
  const [savingArticle, setSavingArticle] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [pollingVideo, setPollingVideo] = useState(false)
  const [loadingInventory, setLoadingInventory] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const t = (key: UICopyKey): string => uiCopy[key] || baseUICopy[key]

  useEffect(() => {
    void loadInventory()
  }, [])

  useEffect(() => {
    void loadUiTranslation(uiLocale)
  }, [uiLocale])

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
          folder === 'all' ||
          file.folder === folder ||
          (Boolean(folder) && file.folder.startsWith(`${folder}/`)),
      )
      .filter((file) => !include || file.relativePath.toLowerCase().includes(include.toLowerCase()))
      .slice(0, 160)
  }, [folder, include, inventory])

  async function loadUiTranslation(locale: UILocale) {
    window.localStorage.setItem('cms-ai-ui-locale', locale)

    if (locale === 'en') {
      setUiCopy(baseUICopy)
      setTranslationNotice(null)
      return
    }

    const cacheKey = `cms-ai-ui-copy:${locale}:v1`
    const cached = window.localStorage.getItem(cacheKey)

    if (cached) {
      try {
        setUiCopy({ ...baseUICopy, ...(JSON.parse(cached) as Partial<UICopy>) })
        setTranslationNotice(baseUICopy.aiTranslated)
        return
      } catch (_error) {
        window.localStorage.removeItem(cacheKey)
      }
    }

    setTranslatingUi(true)
    setTranslationNotice(baseUICopy.translating)

    try {
      const response = await fetch('/api/translate-ui', {
        body: JSON.stringify({
          locale,
          strings: baseUICopy,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await response.json()) as {
        strings?: Partial<UICopy>
      }

      if (!response.ok || !payload.strings) {
        throw new Error('UI translation failed.')
      }

      window.localStorage.setItem(cacheKey, JSON.stringify(payload.strings))
      setUiCopy({ ...baseUICopy, ...payload.strings })
      setTranslationNotice(baseUICopy.translationReady)
    } catch (_error) {
      setUiCopy(baseUICopy)
      setTranslationNotice(baseUICopy.translationFailed)
    } finally {
      setTranslatingUi(false)
    }
  }

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

  async function runArticleGeneration() {
    setGeneratingArticle(true)
    setError(null)
    setArticleResult(null)
    setSaveArticleResult(null)

    try {
      const response = await fetch('/api/generate-article', {
        body: JSON.stringify({
          audience: 'content editor and business stakeholder',
          brief: articleBrief,
          keywords: articleKeywords
            .split(',')
            .map((keyword) => keyword.trim())
            .filter(Boolean),
          language: inferArticleOutputLanguage(articleTitle, articleBrief),
          title: articleTitle,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await response.json()) as GenerateArticleResponse

      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`)
      }

      setArticleResult(payload)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setGeneratingArticle(false)
    }
  }

  async function runSaveArticleDraft() {
    setSavingArticle(true)
    setError(null)
    setSaveArticleResult(null)

    try {
      const response = await fetch('/api/save-article-draft', {
        body: JSON.stringify({
          draft: {
            bodyMarkdown: articleDraftBody,
            outline: articleDraftOutline,
            seoDescription: articleDraftSeoDescription,
            seoTitle: articleDraftSeoTitle,
            slug: articleDraftSlug,
            summary: articleDraftSummary,
            title: articleDraftTitle,
          },
          languageCode: inferArticleLanguageCode(articleDraftTitle, articleDraftBody || articleBrief),
          status: 'draft',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await response.json()) as SaveArticleDraftResponse

      if (!response.ok) {
        throw new Error(extractResponseError(payload, response.status))
      }

      setSaveArticleResult(payload)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setSavingArticle(false)
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

  async function pollVideoStatus(requestID: string) {
    setPollingVideo(true)
    setError(null)

    try {
      const response = await fetch('/api/video-status', {
        body: JSON.stringify({ requestID }),
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
      setPollingVideo(false)
    }
  }

  const totalFolders = folders?.totalFolders || 0
  const totalFiles = inventory?.totalFiles || folders?.totalFiles || 0
  const sourceCount = result?.sources?.length || 0
  const chunkCount = result?.chunks?.length || 0
  const articleDraft = articleResult?.draft
  const articleDraftBody = toSafeText(articleDraft?.bodyMarkdown)
  const articleDraftOutline = toSafeStringArray(articleDraft?.outline)
  const articleDraftSeoDescription = toSafeText(articleDraft?.seoDescription)
  const articleDraftSeoTitle = toSafeText(articleDraft?.seoTitle)
  const articleDraftSlug = toSafeText(articleDraft?.slug)
  const articleDraftSummary = toSafeText(articleDraft?.summary)
  const articleDraftTitle = toSafeText(articleDraft?.title) || articleTitle

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/ai">
          <span className={styles.logo}>P</span>
          <span>
            <strong>Payload AI</strong>
            <small>{t('brandSubtitle')}</small>
          </span>
        </a>

        <nav className={styles.nav}>
          <button
            className={activeView === 'ask' ? styles.activeNavButton : styles.navButton}
            onClick={() => setActiveView('ask')}
            type="button"
          >
            {t('ask')}
          </button>
          <button
            className={activeView === 'content' ? styles.activeNavButton : styles.navButton}
            onClick={() => setActiveView('content')}
            type="button"
          >
            {t('content')}
          </button>
          <button
            className={activeView === 'generate' ? styles.activeNavButton : styles.navButton}
            onClick={() => setActiveView('generate')}
            type="button"
          >
            {t('generate')}
          </button>
          <button
            className={activeView === 'corpus' ? styles.activeNavButton : styles.navButton}
            onClick={() => setActiveView('corpus')}
            type="button"
          >
            {t('corpus')}
          </button>
          <button
            className={activeView === 'admin' ? styles.activeNavButton : styles.navButton}
            onClick={() => setActiveView('admin')}
            type="button"
          >
            {t('admin')}
          </button>
        </nav>

        <div className={styles.sidebarBox}>
          <span>{t('testerFlow')}</span>
          <ol>
            <li>{t('flowPreviewSources')}</li>
            <li>{t('flowAskGrok')}</li>
            <li>{t('flowGenerateMedia')}</li>
            <li>{t('flowSaveRuns')}</li>
          </ol>
        </div>

        <div className={styles.languageBox}>
          <label className={styles.field}>
            {t('language')}
            <select
              disabled={translatingUi}
              onChange={(event) => setUiLocale(event.target.value as UILocale)}
              value={uiLocale}
            >
              {supportedLocales.map((locale) => (
                <option key={locale.code} value={locale.code}>
                  {locale.label}
                </option>
              ))}
            </select>
          </label>
          <p>{translationNotice || t('languageHint')}</p>
        </div>

        <Link className={styles.adminButton} href="/admin">
          {t('openPayloadAdmin')}
        </Link>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.kicker}>{t('kicker')}</p>
            <h1>{t('title')}</h1>
          </div>
          <button
            className={styles.iconButton}
            disabled={loadingInventory}
            onClick={loadInventory}
            title={t('refreshTitle')}
            type="button"
          >
            {t('refresh')}
          </button>
        </header>

        <section className={styles.metrics} aria-label="Workspace status">
          <div>
            <span>{t('documents')}</span>
            <strong>{loadingInventory ? '...' : totalFiles.toLocaleString()}</strong>
          </div>
          <div>
            <span>{t('folders')}</span>
            <strong>{loadingInventory ? '...' : totalFolders.toLocaleString()}</strong>
          </div>
          <div>
            <span>{t('selectedScope')}</span>
            <strong>{folder === 'all' ? t('allFolders') : folder || t('rootFolder')}</strong>
          </div>
          <div>
            <span>{t('docsRoot')}</span>
            <strong className={styles.pathText}>
              {inventory?.docsDir || folders?.docsDir || t('waitingForApi')}
            </strong>
          </div>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}

        {activeView === 'ask' ? (
          <div className={styles.askGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>{t('questionEditor')}</h2>
                  <p>{t('questionEditorHint')}</p>
                </div>
                <button className={styles.secondaryButton} onClick={prepareSafeRun} type="button">
                  {t('safeDefaults')}
                </button>
              </div>

              <label className={styles.field}>
                {t('question')}
                <textarea
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={7}
                  value={question}
                />
              </label>

              <div className={styles.presets}>
                {presets.map((preset) => (
                  <button
                    key={preset.labelKey}
                    onClick={() => setQuestion(t(preset.questionKey))}
                    type="button"
                  >
                    {t(preset.labelKey)}
                  </button>
                ))}
              </div>

              <div className={styles.splitFields}>
                <label className={styles.field}>
                  {t('folder')}
                  <select value={folder} onChange={(event) => setFolder(event.target.value)}>
                    <option value="all">{t('allFolders')}</option>
                    {folderOptions.map((item) => (
                      <option key={item.folder || '__root'} value={item.folder}>
                        {item.folder || t('rootFolder')} - {item.totalFiles}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  {t('namePathFilter')}
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
                  {t('answerInQuestionLanguage')}
                </label>
                <label>
                  <input
                    checked={crossLanguageSearch}
                    onChange={(event) => setCrossLanguageSearch(event.target.checked)}
                    type="checkbox"
                  />
                  {t('crossLanguageSearch')}
                </label>
                <label>
                  <input
                    checked={includePDF}
                    onChange={(event) => setIncludePDF(event.target.checked)}
                    type="checkbox"
                  />
                  {t('includePDFs')}
                </label>
                <label>
                  <input
                    checked={useEmbeddings}
                    onChange={(event) => setUseEmbeddings(event.target.checked)}
                    type="checkbox"
                  />
                  {t('useSemanticReranking')}
                </label>
              </div>

              <label className={styles.field}>
                {t('optionalEmbeddingModel')}
                <input
                  onChange={(event) => setEmbeddingModel(event.target.value)}
                  placeholder={t('embeddingPlaceholder')}
                  value={embeddingModel}
                />
              </label>

              <div className={styles.numberGrid}>
                <label>
                  {t('files')}
                  <input
                    max={500}
                    min={1}
                    onChange={(event) => setMaxFiles(Number(event.target.value))}
                    type="number"
                    value={maxFiles}
                  />
                </label>
                <label>
                  {t('chunks')}
                  <input
                    max={20}
                    min={1}
                    onChange={(event) => setMaxChunks(Number(event.target.value))}
                    type="number"
                    value={maxChunks}
                  />
                </label>
                <label>
                  {t('embedCandidates')}
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
                  {t('previewSources')}
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={loading}
                  onClick={() => void runAsk(false)}
                  type="button"
                >
                  {t('askGrok')}
                </button>
              </div>

              {loading ? (
                <div className={styles.running}>
                  {t('retrievingContext')}
                </div>
              ) : null}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>{t('result')}</h2>
                  <p>
                    {result
                      ? `${result.scanned || 0} ${t('resultStatsFilesScanned')}, ${sourceCount} ${t('resultStatsSources')}, ${chunkCount} ${t('resultStatsChunks')}`
                      : t('resultEmptyHint')}
                  </p>
                </div>
                {result ? (
                  <span
                    className={result.grok?.ok === false ? styles.badgeError : styles.badge}
                  >
                    {result.dryRun ? t('previewBadge') : result.grok?.model || t('answerBadge')}
                  </span>
                ) : null}
              </div>

              {!result ? (
                <div className={styles.emptyState}>
                  <strong>{t('noRunTitle')}</strong>
                  <span>{t('noRunHint')}</span>
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
                    <h3>{t('sources')}</h3>
                    <div className={styles.sourceList}>
                      {(result.sources || []).slice(0, 80).map((source) => (
                        <article className={styles.sourceRow} key={source.path}>
                          <strong>{source.fileName}</strong>
                          <span>
                            {source.extractor} - {formatBytes(source.chars)} - {t('score')}{' '}
                            {source.score.toFixed(3)}
                          </span>
                          <small>{source.relativePath || source.path}</small>
                        </article>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3>{t('topChunks')}</h3>
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

        {activeView === 'content' ? (
          <div className={styles.askGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>{t('articleGeneration')}</h2>
                  <p>{t('articleGenerationHint')}</p>
                </div>
                <span className={styles.badge}>grok-4.3</span>
              </div>

              <label className={styles.field}>
                {t('articleTitle')}
                <input
                  onChange={(event) => setArticleTitle(event.target.value)}
                  value={articleTitle}
                />
              </label>

              <label className={styles.field}>
                {t('articleBrief')}
                <textarea
                  onChange={(event) => setArticleBrief(event.target.value)}
                  rows={8}
                  value={articleBrief}
                />
              </label>

              <label className={styles.field}>
                {t('articleKeywords')}
                <input
                  onChange={(event) => setArticleKeywords(event.target.value)}
                  value={articleKeywords}
                />
              </label>

              <div className={styles.actionRow}>
                <button
                  className={styles.primaryButton}
                  disabled={generatingArticle}
                  onClick={() => void runArticleGeneration()}
                  type="button"
                >
                  {t('generateArticle')}
                </button>
                <Link className={styles.secondaryLink} href="/admin/collections/articles">
                  {t('openArticles')}
                </Link>
              </div>

              {generatingArticle ? (
                <div className={styles.running}>{t('generatingArticle')}</div>
              ) : null}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>{t('articleDraft')}</h2>
                  <p>{articleResult?.model || t('articleDraftHint')}</p>
                </div>
              </div>

              {!articleResult ? (
                <div className={styles.emptyState}>
                  <strong>{t('noArticleDraftTitle')}</strong>
                  <span>{t('noArticleDraftHint')}</span>
                </div>
              ) : null}

              {articleDraft ? (
                <div className={styles.sourceList}>
                  <article className={styles.sourceRow}>
                    <strong>{articleDraftTitle}</strong>
                    {articleDraftSlug ? <small>{articleDraftSlug}</small> : null}
                    {articleDraftSummary ? <span>{articleDraftSummary}</span> : null}
                  </article>

                  {articleDraftOutline.length ? (
                    <article className={styles.sourceRow}>
                      <strong>{t('outline')}</strong>
                      <small>{articleDraftOutline.join(' / ')}</small>
                    </article>
                  ) : null}

                  {articleDraftBody ? (
                    <pre className={styles.answer}>{articleDraftBody}</pre>
                  ) : null}

                  {articleDraftSeoTitle || articleDraftSeoDescription ? (
                    <article className={styles.sourceRow}>
                      <strong>SEO</strong>
                      {articleDraftSeoTitle ? <span>{articleDraftSeoTitle}</span> : null}
                      {articleDraftSeoDescription ? <small>{articleDraftSeoDescription}</small> : null}
                    </article>
                  ) : null}

                  <div className={styles.actionRow}>
                    <button
                      className={styles.primaryButton}
                      disabled={savingArticle || !articleDraftBody}
                      onClick={() => void runSaveArticleDraft()}
                      type="button"
                    >
                      {t('saveArticleDraft')}
                    </button>
                  </div>

                  {savingArticle ? <div className={styles.running}>{t('savingArticleDraft')}</div> : null}

                  {saveArticleResult?.adminURL ? (
                    <div className={styles.running}>
                      {t('articleDraftSaved')}{' '}
                      <a href={saveArticleResult.adminURL}>{saveArticleResult.article?.title || t('openArticles')}</a>
                    </div>
                  ) : null}
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
                  <h2>{t('imageGeneration')}</h2>
                  <p>{t('imageGenerationHint')}</p>
                </div>
                <span className={styles.badge}>grok-imagine-image</span>
              </div>

              <label className={styles.field}>
                {t('imagePrompt')}
                <textarea
                  onChange={(event) => setImagePrompt(event.target.value)}
                  rows={7}
                  value={imagePrompt}
                />
              </label>

              <div className={styles.splitFields}>
                <label className={styles.field}>
                  {t('aspectRatio')}
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
                  {t('generateImage')}
                </button>
              </div>

              {generatingImage ? <div className={styles.running}>{t('waitingForImagine')}</div> : null}

              {imageResult?.data?.length ? (
                <div className={styles.sourceList}>
                  {imageResult.data.map((image, index) => (
                    <article className={styles.sourceRow} key={`${image.url || 'image'}-${index}`}>
                      <strong>
                        {t('imageLabel')} {index + 1}
                      </strong>
                      {image.url ? (
                        <a href={image.url} rel="noreferrer" target="_blank">
                          {image.url}
                        </a>
                      ) : null}
                      {image.b64_json ? <small>{t('base64ImageReturned')}</small> : null}
                      {image.revised_prompt ? <small>{image.revised_prompt}</small> : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>{t('videoGeneration')}</h2>
                  <p>{t('videoGenerationHint')}</p>
                </div>
                <span className={styles.badge}>grok-imagine-video</span>
              </div>

              <label className={styles.field}>
                {t('videoPrompt')}
                <textarea
                  onChange={(event) => setVideoPrompt(event.target.value)}
                  rows={6}
                  value={videoPrompt}
                />
              </label>

              <label className={styles.field}>
                {t('optionalSourceImageURL')}
                <input
                  onChange={(event) => setVideoImageURL(event.target.value)}
                  placeholder={t('sourceImagePlaceholder')}
                  value={videoImageURL}
                />
              </label>

              <label className={styles.field}>
                {t('durationSeconds')}
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
                  {t('generateVideo')}
                </button>
              </div>

              {generatingVideo ? (
                <div className={styles.running}>{t('startingVideo')}</div>
              ) : null}

              {videoResult ? (
                <div className={styles.emptyState}>
                  <strong>
                    {videoResult.ok
                      ? t('videoReady')
                      : `${t('status')}: ${videoResult.status || 'pending'}`}
                  </strong>
                  {videoResult.requestID ? (
                    <span>
                      {t('requestId')}: {videoResult.requestID}
                    </span>
                  ) : null}
                  {videoResult.video?.url ? (
                    <a href={videoResult.video.url} rel="noreferrer" target="_blank">
                      {videoResult.video.url}
                    </a>
                  ) : null}
                  {videoResult.requestID && !videoResult.ok ? (
                    <button
                      className={styles.secondaryButton}
                      disabled={pollingVideo}
                      onClick={() => void pollVideoStatus(videoResult.requestID || '')}
                      type="button"
                    >
                      {t('checkVideoStatus')}
                    </button>
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
                <h2>{t('documentCorpus')}</h2>
                <p>{t('documentCorpusHint')}</p>
              </div>
              <span className={styles.badge}>
                {visibleFiles.length} {t('visible')}
              </span>
            </div>

            <div className={styles.uploadCallout}>
              <div>
                <strong>{t('uploadRagDocuments')}</strong>
                <span>{t('uploadRagDocumentsHint')}</span>
              </div>
              <Link className={styles.secondaryLink} href="/admin/collections/media">
                {t('openMediaLibrary')}
              </Link>
            </div>

            <div className={styles.corpusGrid}>
              <div className={styles.folderList}>
                <button
                  className={folder === 'all' ? styles.selectedFolder : styles.folderButton}
                  onClick={() => setFolder('all')}
                  type="button"
                >
                  <strong>{t('allFolders')}</strong>
                  <span>
                    {totalFiles.toLocaleString()} {t('filesUnit')}
                  </span>
                </button>
                {folderOptions.map((item) => (
                  <button
                    className={folder === item.folder ? styles.selectedFolder : styles.folderButton}
                    key={item.folder || '__root'}
                    onClick={() => setFolder(item.folder)}
                    type="button"
                  >
                    <strong>{item.folder || t('rootFolder')}</strong>
                    <span>
                      {item.totalFiles.toLocaleString()} {t('filesUnit')} - {formatBytes(item.size)}
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <div className={styles.corpusToolbar}>
                  <label className={styles.field}>
                    {t('filterFiles')}
                    <input
                      onChange={(event) => setInclude(event.target.value)}
                      placeholder={t('filterPlaceholder')}
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
                <h2>{t('adminWorkspace')}</h2>
                <p>{t('adminHint')}</p>
              </div>
              <Link className={styles.primaryLink} href="/admin">
                {t('openAdmin')}
              </Link>
            </div>

            <div className={styles.adminGrid}>
              {adminLinks.map((link) => (
                <Link className={styles.adminCard} href={link.href} key={link.href}>
                  <strong>{t(link.labelKey)}</strong>
                  <span>{t(link.descriptionKey)}</span>
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
