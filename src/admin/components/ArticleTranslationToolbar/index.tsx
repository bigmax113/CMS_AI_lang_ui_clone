'use client'

import React, { useMemo, useState } from 'react'

const languages = [
  { code: 'en', label: 'EN English' },
  { code: 'ru', label: 'RU Russian' },
  { code: 'uk', label: 'UK Ukrainian' },
  { code: 'ro', label: 'RO Romanian' },
  { code: 'pl', label: 'PL Polish' },
]

const articleIDPattern = /\/admin\/collections\/articles\/([^/?#]+)/u

type APIResponse = {
  error?: string
  errors?: Array<{
    message?: string
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
            .map((language) => language.code.toUpperCase())
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
      })
      const payload = (await response.json()) as APIResponse

      if (!response.ok) {
        throw new Error(errorMessageFromAPI(payload, response.status))
      }

      setMessage(`Created ${payload.total || 0} translated draft(s). Refreshing list...`)
      window.setTimeout(() => window.location.reload(), 900)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
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
