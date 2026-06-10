const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const cleanArticleText = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const text = value.trim()

    return text || undefined
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
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

  if (text.length <= maxChars) {
    return text
  }

  const clipped = text.slice(0, maxChars).replace(/\s+\S*$/u, '').trim()

  return clipped || text.slice(0, maxChars).trim()
}
