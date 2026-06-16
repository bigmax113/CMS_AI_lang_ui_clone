const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const htmlEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  hellip: '...',
  gt: '>',
  lt: '<',
  nbsp: ' ',
  ndash: '-',
  mdash: '-',
  quot: '"',
}

const terminalSentencePunctuation = /[.!?]["')\]]?$/u
const commonSentenceEnd = /[.!?]["')\]]?(?=\s|$)/gu
const danglingEnglishWord = /\b(?:a|an|and|as|at|by|for|from|in|into|of|on|or|the|to|with)$/iu
const mediaURLText =
  /https?:\/\/[^\s<>"']*(?:\/wp-content\/uploads\/|\/api\/media\/|\.mp4|\.mov|\.webm)[^\s<>"']*/giu

const decodeArticleTextEntities = (value: string): string =>
  value
    .replace(/&#x([0-9a-f]+);/giu, (_match, code: string) => {
      const value = Number.parseInt(code, 16)

      return Number.isFinite(value) ? String.fromCodePoint(value) : ''
    })
    .replace(/&#(\d+);/gu, (_match, code: string) => {
      const value = Number.parseInt(code, 10)

      return Number.isFinite(value) ? String.fromCodePoint(value) : ''
    })
    .replace(/&([a-z]+);/giu, (match, entity: string) => htmlEntities[entity.toLowerCase()] || match)

const normalizeArticleText = (value: string): string | undefined => {
  const text = decodeArticleTextEntities(value)
    .replace(mediaURLText, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/\s*\[(?:\u2026|\.{3}|&hellip;|&#8230;|&#x2026;)\]\s*$/iu, '')
    .replace(/\s+/gu, ' ')
    .trim()

  return text || undefined
}

const sentenceSafeExcerpt = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) {
    return text
  }

  const window = text.slice(0, maxChars).trim()
  let lastSentenceEnd = -1

  for (const match of window.matchAll(commonSentenceEnd)) {
    lastSentenceEnd = (match.index || 0) + match[0].length
  }

  const minimumUsefulLength = Math.min(140, Math.floor(maxChars * 0.55))

  if (lastSentenceEnd >= minimumUsefulLength) {
    return window.slice(0, lastSentenceEnd).trim()
  }

  const clipped = window.replace(/\s+\S*$/u, '').trim()

  return clipped || window
}

export const cleanArticleText = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return normalizeArticleText(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return normalizeArticleText(String(value))
  }

  return undefined
}

export const slugifyArticleTitle = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 96)

export const articleTextFromLexical = (content: unknown): string => {
  const textParts: string[] = []

  const visit = (node: unknown) => {
    if (!isRecord(node)) {
      return
    }

    const text = cleanArticleText(node.text)

    if (text) {
      textParts.push(text)
    }

    const fields = isRecord(node.fields) ? node.fields : null

    if (fields) {
      for (const key of ['title', 'body', 'caption', 'description', 'question', 'answer', 'heading']) {
        const fieldText = cleanArticleText(fields[key])

        if (fieldText) {
          textParts.push(fieldText)
        }
      }
    }

    const children = Array.isArray(node.children) ? node.children : []

    for (const child of children) {
      visit(child)
    }
  }

  if (isRecord(content) && isRecord(content.root)) {
    visit(content.root)
  } else {
    visit(content)
  }

  return textParts.join(' ').replace(/\s+/gu, ' ').trim()
}

export const excerptArticleText = (value: unknown, maxChars = 320): string | undefined => {
  const text = cleanArticleText(value) || articleTextFromLexical(value)

  if (!text) {
    return undefined
  }

  return sentenceSafeExcerpt(text, maxChars)
}

export const isLikelyTruncatedArticleText = (value: unknown): boolean => {
  const text = cleanArticleText(value)

  if (!text) {
    return false
  }

  if (terminalSentencePunctuation.test(text)) {
    return false
  }

  if (danglingEnglishWord.test(text)) {
    return true
  }

  const tail = text.slice(-90)

  return !/[.!?]/u.test(tail)
}
