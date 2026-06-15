'use client'

import React, { useEffect, useMemo, useState } from 'react'

import { articleLanguageDefinitions, articleTranslationTargetDefinitions } from '../../../lib/articleTranslations'

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

export const ArticleTranslationToolbar: React.FC = () => {
  const [selectedLocales, setSelectedLocales] = useState<string[]>(['en'])
  const [running, setRunning] = useState(false)
  const [statusRunning, setStatusRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [activeLanguageFilter, setActiveLanguageFilter] = useState(languageFilterFromLocation)
  const isBusy = running || statusRunning
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

    return () => window.clearInterval(intervalID)
  }, [])

  useEffect(() => {
    const hideDefaultPublishActions = () => {
      document.querySelectorAll<HTMLElement>('a, button').forEach((element) => {
        if (element.closest('.article-translation-toolbar')) {
          return
        }

        const label = element.textContent?.replace(/\s+/gu, ' ').trim()

        if (label === 'Publish' || label === 'Unpublish') {
          element.dataset.articleStatusHidden = 'true'
          element.style.display = 'none'
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
    const timeoutID = window.setTimeout(() => controller.abort(), 240_000)

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
          ? 'Translation timed out. Try one language at a time or shorten the source article.'
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
          <button disabled={isBusy} onClick={() => void updateSelectedStatus('published', 'Published')} type="button">
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
        </div>
      </div>
      {message ? <span>{message}</span> : null}
    </div>
  )
}

function errorMessageFromAPI(payload: APIResponse, status: number): string {
  const validationMessages = payload.errors?.map((error) => error.message).filter(Boolean)

  if (payload.error) {
    return payload.error
  }

  if (validationMessages?.length) {
    return validationMessages.join('; ')
  }

  return `HTTP ${status}`
}

export default ArticleTranslationToolbar
