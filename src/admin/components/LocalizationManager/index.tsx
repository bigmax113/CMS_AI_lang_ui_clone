'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

type LocalizationLanguage = {
  displayCode?: string
  label: string
  language?: string
  value: string
}

type LocalizationItem = {
  defaultText: string
  description: string
  key: string
  namespace: string
  publishedText: string
  status: 'draft' | 'published' | 'review'
  text: string
}

type LocalizationResponse = {
  error?: string
  items?: LocalizationItem[]
  languages?: LocalizationLanguage[]
  locale?: string
}

type DraftEdits = Record<string, string>

const statusLabels: Record<LocalizationItem['status'], string> = {
  draft: 'Draft',
  published: 'Published',
  review: 'Review',
}

export const LocalizationManager = () => {
  const [languages, setLanguages] = useState<LocalizationLanguage[]>([])
  const [locale, setLocale] = useState('en')
  const [items, setItems] = useState<LocalizationItem[]>([])
  const [draftEdits, setDraftEdits] = useState<DraftEdits>({})
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [newLocale, setNewLocale] = useState('')
  const [newDisplayCode, setNewDisplayCode] = useState('')
  const [newLanguageName, setNewLanguageName] = useState('')

  const selectedLanguage = useMemo(
    () => languages.find((language) => language.value === locale)?.label || locale.toUpperCase(),
    [languages, locale],
  )

  const loadLocalization = useCallback(async (nextLocale: string) => {
    setError('')
    setMessage('')
    const response = await fetch(`/api/frontend-ui-localization?locale=${encodeURIComponent(nextLocale)}`, {
      credentials: 'include',
    })
    const data = (await response.json()) as LocalizationResponse

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    setLanguages(data.languages || [])
    setLocale(data.locale || nextLocale)
    setItems(data.items || [])
    setDraftEdits(
      Object.fromEntries((data.items || []).map((item) => [item.key, item.text || item.defaultText])),
    )
  }, [])

  useEffect(() => {
    void loadLocalization(locale).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load localization')
    })
  }, [loadLocalization])

  const saveDrafts = useCallback(async () => {
    setIsBusy(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/frontend-ui-localization', {
        body: JSON.stringify({
          items: items.map((item) => ({
            key: item.key,
            status: item.status === 'published' ? 'review' : item.status,
            text: draftEdits[item.key] || '',
          })),
          locale,
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const data = (await response.json()) as LocalizationResponse

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      setItems(data.items || [])
      setMessage(`Saved ${selectedLanguage} interface phrases for review.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save localization')
    } finally {
      setIsBusy(false)
    }
  }, [draftEdits, items, locale, selectedLanguage])

  const generateTranslations = useCallback(async () => {
    setIsBusy(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/frontend-ui-localization/translate', {
        body: JSON.stringify({ locale }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = (await response.json()) as LocalizationResponse

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      setItems(data.items || [])
      setDraftEdits(
        Object.fromEntries((data.items || []).map((item) => [item.key, item.text || item.defaultText])),
      )
      setMessage(`Generated ${selectedLanguage} interface draft. Review it before publishing.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate localization')
    } finally {
      setIsBusy(false)
    }
  }, [locale, selectedLanguage])

  const publishTranslations = useCallback(async () => {
    setIsBusy(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/frontend-ui-localization/publish', {
        body: JSON.stringify({ locale }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = (await response.json()) as LocalizationResponse

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      setItems(data.items || [])
      setMessage(`${selectedLanguage} interface is published.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish localization')
    } finally {
      setIsBusy(false)
    }
  }, [locale, selectedLanguage])

  const addLanguage = useCallback(async () => {
    const normalizedLocale = newLocale.trim().toLowerCase()
    const displayCode = newDisplayCode.trim().toUpperCase()
    const languageName = newLanguageName.trim()

    if (!normalizedLocale || !languageName) {
      setError('Add language code and language name first.')
      return
    }

    setIsBusy(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/frontend-ui-localization/languages', {
        body: JSON.stringify({
          displayCode: displayCode || normalizedLocale.toUpperCase(),
          label: `${displayCode || normalizedLocale.toUpperCase()} ${languageName}`,
          language: languageName,
          locale: normalizedLocale,
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = (await response.json()) as LocalizationResponse

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      setLanguages(data.languages || [])
      setItems(data.items || [])
      setLocale(data.locale || normalizedLocale)
      setDraftEdits(
        Object.fromEntries((data.items || []).map((item) => [item.key, item.text || item.defaultText])),
      )
      setNewLocale('')
      setNewDisplayCode('')
      setNewLanguageName('')
      setMessage(`${languageName} is ready for translation.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add language')
    } finally {
      setIsBusy(false)
    }
  }, [newDisplayCode, newLanguageName, newLocale])
  const openPreview = useCallback(() => {
    window.open(`/articles?lang=${encodeURIComponent(locale)}&previewLocalization=true`, '_blank', 'noopener')
  }, [locale])

  const groupedItems = useMemo(() => {
    return items.reduce<Record<string, LocalizationItem[]>>((groups, item) => {
      groups[item.namespace] = [...(groups[item.namespace] || []), item]
      return groups
    }, {})
  }, [items])

  return (
    <section aria-label="Frontend localization manager" style={styles.panel}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Localization</p>
          <h2 style={styles.title}>Frontend interface phrases</h2>
          <p style={styles.copy}>
            Add any language, generate interface translations with AI, edit long labels manually,
            preview the blog, then publish the approved UI layer.
          </p>
        </div>
        <div style={styles.controls}>
          <label style={styles.label}>
            Language
            <select
              disabled={isBusy}
              onChange={(event) => {
                const nextLocale = event.target.value
                void loadLocalization(nextLocale).catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Failed to load localization')
                })
              }}
              style={styles.select}
              value={locale}
            >
              {languages.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
          <button disabled={isBusy} onClick={generateTranslations} style={styles.primaryButton} type="button">
            Generate UI translation
          </button>
          <button disabled={isBusy} onClick={saveDrafts} style={styles.secondaryButton} type="button">
            Save edits
          </button>
          <button disabled={isBusy} onClick={openPreview} style={styles.secondaryButton} type="button">
            Preview
          </button>
          <button disabled={isBusy} onClick={publishTranslations} style={styles.publishButton} type="button">
            Publish
          </button>
        </div>
      </div>

      <div style={styles.languageCreator}>
        <div>
          <h3 style={styles.languageCreatorTitle}>Add language</h3>
          <p style={styles.languageCreatorCopy}>
            Create a new UI layer, for example DE German or PT-BR Portuguese.
          </p>
        </div>
        <div style={styles.languageCreatorGrid}>
          <label style={styles.label}>
            Language code
            <input
              disabled={isBusy}
              onChange={(event) => setNewLocale(event.target.value)}
              placeholder="de"
              style={styles.smallInput}
              value={newLocale}
            />
          </label>
          <label style={styles.label}>
            Display code
            <input
              disabled={isBusy}
              onChange={(event) => setNewDisplayCode(event.target.value)}
              placeholder="DE"
              style={styles.smallInput}
              value={newDisplayCode}
            />
          </label>
          <label style={styles.label}>
            Language name
            <input
              disabled={isBusy}
              onChange={(event) => setNewLanguageName(event.target.value)}
              placeholder="German"
              style={styles.smallInput}
              value={newLanguageName}
            />
          </label>
          <button disabled={isBusy} onClick={addLanguage} style={styles.tertiaryButton} type="button">
            Add language
          </button>
        </div>
      </div>
      {error ? <p style={styles.error}>{error}</p> : null}
      {message ? <p style={styles.message}>{message}</p> : null}

      <div style={styles.phraseGrid}>
        {Object.entries(groupedItems).map(([namespace, group]) => (
          <div key={namespace} style={styles.group}>
            <h3 style={styles.groupTitle}>{namespace}</h3>
            {group.map((item) => (
              <label key={item.key} style={styles.phrase}>
                <span style={styles.phraseMeta}>
                  <strong>{item.key}</strong>
                  <span style={styles.status}>{statusLabels[item.status]}</span>
                </span>
                <span style={styles.defaultText}>EN: {item.defaultText}</span>
                <input
                  disabled={isBusy}
                  onChange={(event) =>
                    setDraftEdits((current) => ({ ...current, [item.key]: event.target.value }))
                  }
                  style={styles.input}
                  value={draftEdits[item.key] || ''}
                />
                <span style={styles.description}>{item.description}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  copy: {
    color: '#64748b',
    margin: '8px 0 0',
    maxWidth: 760,
  },
  controls: {
    alignItems: 'end',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
  },
  defaultText: {
    color: '#475569',
    fontSize: 12,
  },
  description: {
    color: '#64748b',
    fontSize: 12,
  },
  error: {
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    color: '#991b1b',
    marginTop: 16,
    padding: '10px 12px',
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.5,
    margin: 0,
    textTransform: 'uppercase',
  },
  group: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 16,
  },
  groupTitle: {
    margin: '0 0 12px',
    textTransform: 'capitalize',
  },
  headerRow: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: 20,
    justifyContent: 'space-between',
  },
  input: {
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    font: 'inherit',
    padding: '10px 12px',
  },
  languageCreator: {
    alignItems: 'center',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    display: 'flex',
    gap: 18,
    justifyContent: 'space-between',
    marginTop: 18,
    padding: 16,
  },
  languageCreatorCopy: {
    color: '#64748b',
    margin: '4px 0 0',
  },
  languageCreatorGrid: {
    alignItems: 'end',
    display: 'grid',
    gap: 10,
    gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))',
  },
  languageCreatorTitle: {
    margin: 0,
  },  label: {
    color: '#334155',
    display: 'grid',
    fontSize: 12,
    fontWeight: 700,
    gap: 6,
  },
  message: {
    background: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: 8,
    color: '#166534',
    marginTop: 16,
    padding: '10px 12px',
  },
  panel: {
    background: '#fff',
    border: '1px solid #dbe3ef',
    borderRadius: 8,
    marginTop: 28,
    padding: 24,
  },
  phrase: {
    display: 'grid',
    gap: 7,
    marginTop: 14,
  },
  phraseGrid: {
    display: 'grid',
    gap: 18,
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    marginTop: 20,
  },
  phraseMeta: {
    alignItems: 'center',
    display: 'flex',
    gap: 8,
    justifyContent: 'space-between',
  },
  primaryButton: {
    background: '#0f766e',
    border: 0,
    borderRadius: 6,
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
    padding: '12px 14px',
  },
  publishButton: {
    background: '#111827',
    border: 0,
    borderRadius: 6,
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
    padding: '12px 14px',
  },
  secondaryButton: {
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    color: '#111827',
    cursor: 'pointer',
    fontWeight: 800,
    padding: '11px 14px',
  },
  select: {
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    font: 'inherit',
    minWidth: 180,
    padding: '10px 12px',
  },
  smallInput: {
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    font: 'inherit',
    padding: '10px 12px',
  },  status: {
    background: '#e0f2fe',
    borderRadius: 999,
    color: '#075985',
    fontSize: 11,
    fontWeight: 800,
    padding: '3px 8px',
  },
  tertiaryButton: {
    background: '#334155',
    border: 0,
    borderRadius: 6,
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
    padding: '12px 14px',
  },  title: {
    margin: '4px 0 0',
  },
}

export default LocalizationManager
