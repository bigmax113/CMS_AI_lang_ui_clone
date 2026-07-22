'use client'

import React, { useEffect, useMemo, useState } from 'react'

import {
  articleLanguageDefinitions,
  articleTranslationTargetDefinitions,
} from '../../../lib/articleTranslations'

const filterLanguages = articleLanguageDefinitions.map((language) => ({
  code: language.value,
  displayCode: language.displayCode,
  label: language.label,
}))

const languages = articleTranslationTargetDefinitions.map((language) => ({
  code: language.value,
  displayCode: language.displayCode,
  label: language.label,
}))

const articleIDPattern = /\/admin\/collections\/articles\/([^/?#]+)/u
type ArticleStatus = 'draft' | 'published' | 'review'

type APIResponse = {
  created?: Array<{
    id?: string | number
    language?: string
    title?: string
    url?: string
  }>
  error?: string
  errors?: Array<{
    message?: string
  }>
  failed?: Array<{
    error?: string
    id?: string
    language?: string
  }>
  deleted?: number
  status?: ArticleStatus
  total?: number
  updated?: number
}

function selectedArticleIDsFromDOM(): string[] {
  const ids = new Set<string>()
  const checkedInputs = Array.from(
    document.querySelectorAll<HTMLInputElement>(
      'tbody tr .select-row input[type="checkbox"]:checked, tbody tr .checkbox-input--checked input[type="checkbox"]',
    ),
  )

  for (const input of checkedInputs) {
    const row = input.closest('tbody tr')
    const link = row?.querySelector<HTMLAnchorElement>('a[href*="/admin/collections/articles/"]')
    const id = link?.href.match(articleIDPattern)?.[1]

    if (id && id !== 'create') {
      ids.add(decodeURIComponent(id))
    }
  }

  return [...ids]
}

function languageFilterFromLocation(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  return new URLSearchParams(window.location.search).get('where[languageCode][equals]') || ''
}

function ensurePublishedDateColumnInLocation(): void {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)
  const rawColumns = url.searchParams.get('columns')

  if (!rawColumns) {
    return
  }

  try {
    const parsed = JSON.parse(rawColumns)

    if (!Array.isArray(parsed)) {
      return
    }

    const columns = parsed.filter((column): column is string => typeof column === 'string')
    const visibleColumns = columns.filter(
      (column) => column !== '-publishedAt' && column !== '-publishedDateDisplay',
    )
    const hasPublishedDateDisplay = visibleColumns.includes('publishedDateDisplay')

    if (hasPublishedDateDisplay && visibleColumns.length === columns.length) {
      return
    }

    const titleIndex = visibleColumns.indexOf('title')
    const insertIndex = titleIndex >= 0 ? titleIndex + 1 : 0
    const nextColumns = hasPublishedDateDisplay
      ? visibleColumns
      : [
          ...visibleColumns.slice(0, insertIndex),
          'publishedDateDisplay',
          ...visibleColumns.slice(insertIndex),
        ]

    url.searchParams.set('columns', JSON.stringify(nextColumns))
    window.location.replace(url.toString())
  } catch {
    // Payload owns this query parameter; ignore unexpected user/browser state.
  }
}

export const ArticleTranslationToolbar: React.FC = () => {
  const [selectedLocales, setSelectedLocales] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [statusRunning, setStatusRunning] = useState(false)
  const [deleteRunning, setDeleteRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [activeLanguageFilter, setActiveLanguageFilter] = useState(languageFilterFromLocation)
  const isBusy = running || statusRunning || deleteRunning
  const selectedLabels = useMemo(
    () =>
      selectedLocales.length
        ? languages
            .filter((language) => selectedLocales.includes(language.code))
            .map((language) => language.displayCode)
            .join(', ')
        : 'Choose languages',
    [selectedLocales],
  )

  const applyLanguageFilter = (code: string) => {
    const url = new URL(window.location.href)

    if (code) {
      url.searchParams.set('where[languageCode][equals]', code)
    } else {
      url.searchParams.delete('where[languageCode][equals]')
    }

    url.searchParams.delete('page')
    setActiveLanguageFilter(code)
    window.location.assign(url.toString())
  }

  useEffect(() => {
    ensurePublishedDateColumnInLocation()
    const columnIntervalID = window.setInterval(ensurePublishedDateColumnInLocation, 500)

    const syncFilterFromURL = () => {
      const nextFilter = languageFilterFromLocation()

      setActiveLanguageFilter(nextFilter)

      const select = document.querySelector<HTMLSelectElement>('[data-article-language-filter]')

      if (select && select.value !== nextFilter) {
        select.value = nextFilter
      }
    }

    syncFilterFromURL()
    const intervalID = window.setInterval(syncFilterFromURL, 500)

    return () => {
      window.clearInterval(columnIntervalID)
      window.clearInterval(intervalID)
    }
  }, [])

  useEffect(() => {
    const hideDefaultPublishActions = () => {
      document
        .querySelectorAll<HTMLElement>('a, button, [role="button"], span')
        .forEach((element) => {
          if (element.closest('.article-translation-toolbar')) {
            return
          }

          const label = element.textContent?.replace(/\s+/gu, ' ').trim()

          if (label === 'Publish' || label === 'Unpublish') {
            const actionElement =
              element.closest<HTMLElement>('a, button, [role="button"]') || element

            actionElement.dataset.articleStatusHidden = 'true'
            actionElement.style.display = 'none'
          }
        })
    }

    hideDefaultPublishActions()
    const intervalID = window.setInterval(hideDefaultPublishActions, 500)
    return () => window.clearInterval(intervalID)
  }, [])

  const toggleLocale = (code: string) => {
    setSelectedLocales((current) =>
      current.includes(code) ? current.filter((locale) => locale !== code) : [...current, code],
    )
  }

  const translateSelected = async () => {
    const ids = selectedArticleIDsFromDOM()

    if (!ids.length) {
      setMessage('Select one or more rows first.')
      return
    }

    if (!selectedLocales.length) {
      setMessage('Choose at least one target language.')
      return
    }

    setRunning(true)
    setMessage(`Translating ${ids.length} article(s) to ${selectedLabels}...`)

    const controller = new AbortController()
    const timeoutID = window.setTimeout(() => controller.abort(), 600_000)

    try {
      const response = await fetch('/api/translate-articles', {
        body: JSON.stringify({
          ids,
          locales: selectedLocales,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        signal: controller.signal,
      })
      const payload = (await response.json()) as APIResponse

      if (!response.ok) {
        throw new Error(errorMessageFromAPI(payload, response.status))
      }

      const failed = payload.failed || []
      const total = payload.total || payload.created?.length || 0

      if (failed.length) {
        const failedSummary = failed
          .slice(0, 2)
          .map((item) => `${item.language || item.id || 'item'}: ${item.error || 'failed'}`)
          .join('; ')

        setMessage(`Created ${total} draft(s), failed ${failed.length}. ${failedSummary}`)
      } else if (!total) {
        setMessage('No new drafts were needed for the selected language set.')
      } else {
        setMessage(`Created ${total} translated draft(s). Refreshing list...`)
      }

      if (total) {
        window.setTimeout(() => window.location.reload(), 900)
      }
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Translation timed out. Try fewer languages at once or shorten the source article.'
          : error instanceof Error
            ? error.message
            : String(error),
      )
    } finally {
      window.clearTimeout(timeoutID)
      setRunning(false)
    }
  }

  const updateSelectedStatus = async (status: ArticleStatus, label: string) => {
    const ids = selectedArticleIDsFromDOM()

    if (!ids.length) {
      setMessage('Select one or more rows first.')
      return
    }

    setStatusRunning(true)
    setMessage(`${label} ${ids.length} article(s)...`)

    try {
      const response = await fetch('/api/update-article-statuses', {
        body: JSON.stringify({
          ids,
          status,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await response.json()) as APIResponse

      if (!response.ok) {
        throw new Error(errorMessageFromAPI(payload, response.status))
      }

      const failed = payload.failed || []
      const updated = payload.updated || payload.total || 0

      if (failed.length) {
        const failedSummary = failed
          .slice(0, 2)
          .map((item) => `${item.id || 'item'}: ${item.error || 'failed'}`)
          .join('; ')

        setMessage(`${label}: updated ${updated}, failed ${failed.length}. ${failedSummary}`)
      } else {
        setMessage(`${label}: updated ${updated} article(s). Refreshing list...`)
      }

      if (updated) {
        window.setTimeout(() => window.location.reload(), 700)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setStatusRunning(false)
    }
  }

  const deleteSelectedArticles = async () => {
    const ids = selectedArticleIDsFromDOM()

    if (!ids.length) {
      setMessage('Select one or more rows first.')
      return
    }

    if (!window.confirm(`Delete ${ids.length} selected article(s)? This cannot be undone.`)) {
      return
    }

    setDeleteRunning(true)
    setMessage(`Deleting ${ids.length} article(s)...`)

    try {
      const response = await fetch('/api/delete-articles', {
        body: JSON.stringify({ ids }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await response.json()) as APIResponse

      if (!response.ok) {
        throw new Error(errorMessageFromAPI(payload, response.status))
      }

      const failed = payload.failed || []
      const deleted = payload.deleted || payload.total || 0

      if (failed.length) {
        const failedSummary = failed
          .slice(0, 2)
          .map((item) => `${item.id || 'item'}: ${item.error || 'failed'}`)
          .join('; ')

        setMessage(`Deleted ${deleted}, failed ${failed.length}. ${failedSummary}`)
      } else {
        setMessage(`Deleted ${deleted} article(s). Refreshing list...`)
      }

      if (deleted) {
        window.setTimeout(() => window.location.reload(), 700)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setDeleteRunning(false)
    }
  }

  return (
    <div className="article-translation-toolbar">
      <div className="article-translation-toolbar__group article-translation-toolbar__filter">
        <span>Filter by language</span>
        <select
          aria-label="Filter articles by language"
          data-article-language-filter
          defaultValue={activeLanguageFilter}
          onChange={(event) => applyLanguageFilter(event.target.value)}
        >
          <option value="">All languages</option>
          {filterLanguages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </div>
      <div className="article-translation-toolbar__group">
        <span>Translate to</span>
        <div className="article-translation-toolbar__actions">
          <details className="article-translation-toolbar__languages">
            <summary>{selectedLabels}</summary>
            <div>
              {languages.map((language) => (
                <label key={language.code}>
                  <input
                    checked={selectedLocales.includes(language.code)}
                    onChange={() => toggleLocale(language.code)}
                    type="checkbox"
                  />
                  {language.label}
                </label>
              ))}
            </div>
          </details>
          <button disabled={isBusy} onClick={() => void translateSelected()} type="button">
            Translate selected
          </button>
        </div>
      </div>
      <div className="article-translation-toolbar__group article-translation-toolbar__status">
        <span>Status</span>
        <div className="article-translation-toolbar__actions">
          <button
            disabled={isBusy}
            onClick={() => void updateSelectedStatus('published', 'Published')}
            type="button"
          >
            Publish selected
          </button>
          <button
            className="article-translation-toolbar__button--secondary"
            disabled={isBusy}
            onClick={() => void updateSelectedStatus('review', 'Moved to review')}
            type="button"
          >
            Move to review
          </button>
          <button
            className="article-translation-toolbar__button--danger"
            disabled={isBusy}
            onClick={() => void updateSelectedStatus('draft', 'Unpublished')}
            type="button"
          >
            Unpublish selected
          </button>
          <button
            className="article-translation-toolbar__button--danger"
            disabled={isBusy}
            onClick={() => void deleteSelectedArticles()}
            type="button"
          >
            Delete selected
          </button>
        </div>
      </div>
      {message ? <span>{message}</span> : null}
    </div>
  )
}

function compactMessage(value: string, maxLength = 320): string {
  const text = value.replace(/\s+/gu, ' ').trim()

  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text
}

function errorMessageFromAPI(payload: APIResponse, status: number): string {
  const failedMessages = payload.failed
    ?.map((item) => {
      const subject = item.language || item.id || 'item'
      const error = item.error || 'failed'

      return `${subject}: ${error}`
    })
    .filter(Boolean)
  const validationMessages = payload.errors?.map((error) => error.message).filter(Boolean)

  if (failedMessages?.length) {
    return compactMessage(failedMessages.join('; '))
  }

  if (payload.error) {
    return compactMessage(payload.error)
  }

  if (validationMessages?.length) {
    return compactMessage(validationMessages.join('; '))
  }

  return `HTTP ${status}`
}
export default ArticleTranslationToolbar
