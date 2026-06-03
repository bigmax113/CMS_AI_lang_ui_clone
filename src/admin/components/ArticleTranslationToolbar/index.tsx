'use client'

import React, { useMemo, useState } from 'react'

import { articleLanguageDefinitions } from '../../../lib/articleTranslations'

const languages = articleLanguageDefinitions.map((language) => ({
  code: language.value,
  displayCode: language.displayCode,
  label: language.label,
}))

const articleIDPattern = /\/admin\/collections\/articles\/([^/?#]+)/u

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
  total?: number
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

export const ArticleTranslationToolbar: React.FC = () => {
  const [selectedLocales, setSelectedLocales] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
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

  return (
    <div className="article-translation-toolbar">
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
      <button disabled={running} onClick={() => void translateSelected()} type="button">
        Translate selected
      </button>
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
