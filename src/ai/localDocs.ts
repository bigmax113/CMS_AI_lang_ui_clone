import { execFile } from 'node:child_process'
import { Buffer } from 'node:buffer'
import type { Dirent } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import zlib from 'node:zlib'

const execFileAsync = promisify(execFile)

const DEFAULT_DOCS_DIR = path.resolve(process.cwd(), 'docs')
const DEFAULT_UPLOAD_DIR = path.resolve(process.cwd(), 'media')
const MAX_EXTRACTED_CHARS = 80_000

const extractableExtensions = new Set(['.docx', '.md', '.pdf', '.txt', '.xlf', '.xliff', '.xml'])

type DocumentRoot = {
  dir: string
  folderPrefix?: string
  label: string
}

type DocumentCandidate = {
  extension: string
  fileName: string
  fullPath: string
  folder: string
  mtimeMs: number
  relativePath: string
  rootLabel: string
  size: number
}

type ExtractedDocument = DocumentCandidate & {
  extractor: string
  text: string
  warning?: string
}

export type ContextChunk = {
  fileName: string
  folder: string
  path: string
  relativePath: string
  score: number
  text: string
}

export type ContextChunkRanker = (args: {
  chunks: ContextChunk[]
  maxChunks: number
  question: string
}) => Promise<{
  chunks: ContextChunk[]
  ranker: string
  warnings?: string[]
}>

type ZipEntry = {
  compressedSize: number
  compressionMethod: number
  localHeaderOffset: number
  name: string
}

const textCache = new Map<string, ExtractedDocument>()

export type LocalDocContext = {
  chunks: ContextChunk[]
  context: string
  docsDir: string
  retrieval: {
    candidateChunks: number
    ranker: string
  }
  scanned: number
  sources: Array<{
    chars: number
    extractor: string
    fileName: string
    folder: string
    path: string
    relativePath: string
    score: number
    warning?: string
  }>
  warnings: string[]
}

export type LocalDocInventory = {
  docsDir: string
  files: Array<{
    extension: string
    fileName: string
    folder: string
    path: string
    relativePath: string
    size: number
  }>
  totalFiles: number
}

export type LocalDocFolders = {
  docsDir: string
  folders: Array<{
    extensions: Record<string, number>
    folder: string
    size: number
    totalFiles: number
  }>
  totalFiles: number
  totalFolders: number
}

export async function getLocalDocInventory(limit = 100): Promise<LocalDocInventory> {
  const documentRoots = getDocumentRoots()
  const files = await listAllDocuments(documentRoots)

  return {
    docsDir: formatDocumentRoots(documentRoots),
    files: files.slice(0, limit).map((file) => ({
      extension: file.extension,
      fileName: file.fileName,
      folder: file.folder,
      path: file.fullPath,
      relativePath: file.relativePath,
      size: file.size,
    })),
    totalFiles: files.length,
  }
}

export async function getLocalDocFolders(): Promise<LocalDocFolders> {
  const documentRoots = getDocumentRoots()
  const files = await listAllDocuments(documentRoots)
  const folderMap = new Map<
    string,
    {
      extensions: Record<string, number>
      folder: string
      size: number
      totalFiles: number
    }
  >()

  for (const file of files) {
    const existing =
      folderMap.get(file.folder) ||
      ({
        extensions: {},
        folder: file.folder,
        size: 0,
        totalFiles: 0,
      } satisfies LocalDocFolders['folders'][number])

    existing.extensions[file.extension] = (existing.extensions[file.extension] || 0) + 1
    existing.size += file.size
    existing.totalFiles += 1
    folderMap.set(file.folder, existing)
  }

  const folders = Array.from(folderMap.values()).sort(
    (a, b) => b.totalFiles - a.totalFiles || a.folder.localeCompare(b.folder),
  )

  return {
    docsDir: formatDocumentRoots(documentRoots),
    folders,
    totalFiles: files.length,
    totalFolders: folders.length,
  }
}

export async function buildLocalDocContext(args: {
  folder?: string | string[]
  include?: string | string[]
  includePDF?: boolean
  maxChunks?: number
  maxContextChars?: number
  maxFiles?: number
  question: string
  rankChunks?: ContextChunkRanker
}): Promise<LocalDocContext> {
  const documentRoots = getDocumentRoots()
  const docsDir = formatDocumentRoots(documentRoots)
  const maxFiles = clampNumber(args.maxFiles, 1, 500, 8)
  const maxChunks = clampNumber(args.maxChunks, 1, 20, 8)
  const maxContextChars = clampNumber(args.maxContextChars, 2_000, 40_000, 14_000)
  const folderTerms = toArray(args.folder).map(normalizePathFilter).filter(Boolean)
  const includeTerms = toArray(args.include).map((term) => term.toLowerCase())
  const questionTokens = tokenize(args.question)
  const warnings: string[] = []

  let documents = await listAllDocuments(documentRoots)

  if (!args.includePDF) {
    documents = documents.filter((doc) => doc.extension !== '.pdf')
  }

  if (folderTerms.length && !folderTerms.includes('all')) {
    documents = documents.filter((doc) => {
      const folder = normalizePathFilter(doc.folder)

      return folderTerms.some((term) => folder === term || folder.startsWith(`${term}/`))
    })
  }

  if (includeTerms.length) {
    documents = documents.filter((doc) => {
      const haystack = `${doc.fileName}\n${doc.relativePath}`.toLowerCase()

      return includeTerms.some((term) => haystack.includes(term))
    })
  }

  const rankedDocuments = documents
    .map((doc) => ({
      doc,
      score: scoreText(doc.fileName, questionTokens) * 20 + (doc.extension === '.docx' ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.doc.fileName.localeCompare(b.doc.fileName))
    .slice(0, maxFiles)
    .map(({ doc }) => doc)

  const extracted = await Promise.all(
    rankedDocuments.map(async (doc) => {
      try {
        return await extractDocument(doc)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        warnings.push(`${doc.fileName}: ${message}`)

        return {
          ...doc,
          extractor: 'failed',
          folder: doc.folder,
          relativePath: doc.relativePath,
          text: '',
          warning: message,
        }
      }
    }),
  )

  const chunks = extracted
    .flatMap((doc) =>
      splitIntoChunks(doc.text).map((text) => ({
        fileName: doc.fileName,
        folder: doc.folder,
        path: doc.fullPath,
        relativePath: doc.relativePath,
        score: scoreText(`${doc.fileName}\n${text}`, questionTokens),
        text,
      })),
    )
    .sort((a, b) => b.score - a.score || a.fileName.localeCompare(b.fileName))

  let ranker = 'keyword'
  let rankedChunks = chunks

  if (args.rankChunks && chunks.length) {
    try {
      const ranked = await args.rankChunks({
        chunks,
        maxChunks,
        question: args.question,
      })

      rankedChunks = ranked.chunks
      ranker = ranked.ranker

      if (ranked.warnings?.length) {
        warnings.push(...ranked.warnings)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      warnings.push(`Embedding ranking failed, using keyword ranking: ${message}`)
    }
  }

  const selectedChunks = rankedChunks.slice(0, maxChunks)

  let usedChars = 0
  const contextParts: string[] = []

  for (const chunk of selectedChunks) {
    const available = maxContextChars - usedChars

    if (available <= 0) {
      break
    }

    const text = chunk.text.slice(0, available)
    usedChars += text.length
    contextParts.push(`SOURCE: ${chunk.fileName}\n${text}`)
  }

  return {
    chunks: selectedChunks,
    context: contextParts.join('\n\n---\n\n'),
    docsDir,
    retrieval: {
      candidateChunks: chunks.length,
      ranker,
    },
    scanned: rankedDocuments.length,
    sources: extracted.map((doc) => ({
      chars: doc.text.length,
      extractor: doc.extractor,
      fileName: doc.fileName,
      folder: doc.folder,
      path: doc.fullPath,
      relativePath: doc.relativePath,
      score: scoreText(`${doc.fileName}\n${doc.text}`, questionTokens),
      warning: doc.warning,
    })),
    warnings,
  }
}

function getDocsDir(): string {
  return resolveConfiguredPath(process.env.AI_DOCS_DIR, DEFAULT_DOCS_DIR)
}

function getUploadDir(): string {
  return resolveConfiguredPath(process.env.PAYLOAD_UPLOAD_DIR, DEFAULT_UPLOAD_DIR)
}

function getDocumentRoots(): DocumentRoot[] {
  const roots: DocumentRoot[] = [
    {
      dir: getDocsDir(),
      label: 'Seed docs',
    },
    {
      dir: getUploadDir(),
      folderPrefix: 'Uploaded media',
      label: 'Uploaded media',
    },
  ]
  const seen = new Set<string>()

  return roots.filter((root) => {
    const key = path.resolve(root.dir).toLowerCase()

    if (seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })
}

function formatDocumentRoots(roots: DocumentRoot[]): string {
  return roots.map((root) => `${root.label}: ${root.dir}`).join(' | ')
}

function resolveConfiguredPath(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback

  return path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate)
}

async function listAllDocuments(roots: DocumentRoot[]): Promise<DocumentCandidate[]> {
  const nested = await Promise.all(roots.map((root) => listDocuments(root)))

  return nested.flat().sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

async function listDocuments(root: DocumentRoot): Promise<DocumentCandidate[]> {
  const files: DocumentCandidate[] = []

  async function walk(currentDir: string): Promise<void> {
    let entries: Dirent[]

    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true })
    } catch (error) {
      if (isMissingOrUnreadableDirectory(error)) {
        return
      }

      throw error
    }

    for (const entry of entries) {
      if (entry.name.startsWith('~$')) {
        continue
      }

      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const extension = path.extname(entry.name).toLowerCase()

      if (!extractableExtensions.has(extension)) {
        continue
      }

      const stat = await fs.stat(fullPath)
      const pathWithinRoot = toPortablePath(path.relative(root.dir, fullPath))
      const relativePath = root.folderPrefix
        ? `${root.folderPrefix}/${pathWithinRoot}`
        : pathWithinRoot
      const folder = path.posix.dirname(relativePath)

      files.push({
        extension,
        fileName: entry.name,
        folder: folder === '.' ? '' : folder,
        fullPath,
        mtimeMs: stat.mtimeMs,
        relativePath,
        rootLabel: root.label,
        size: stat.size,
      })
    }
  }

  await walk(root.dir)

  return files.sort((a, b) => a.fileName.localeCompare(b.fileName))
}

function isMissingOrUnreadableDirectory(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    ['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM'].includes(String(error.code))
  )
}

function toPortablePath(value: string): string {
  return value.replace(/\\/gu, '/')
}

async function extractDocument(doc: DocumentCandidate): Promise<ExtractedDocument> {
  const cacheKey = `${doc.fullPath}:${doc.size}:${doc.mtimeMs}`
  const cached = textCache.get(cacheKey)

  if (cached) {
    return cached
  }

  let extracted: Pick<ExtractedDocument, 'extractor' | 'text' | 'warning'>

  if (doc.extension === '.docx') {
    extracted = await extractDocx(doc.fullPath)
  } else if (doc.extension === '.pdf') {
    extracted = await extractPDF(doc.fullPath)
  } else if (doc.extension === '.xlf' || doc.extension === '.xliff' || doc.extension === '.xml') {
    const text = await fs.readFile(doc.fullPath, 'utf8')
    extracted = {
      extractor: 'xml-strip',
      text: cleanText(stripXml(text)),
    }
  } else {
    extracted = {
      extractor: 'plain-text',
      text: cleanText(await fs.readFile(doc.fullPath, 'utf8')),
    }
  }

  const result: ExtractedDocument = {
    ...doc,
    ...extracted,
    text: extracted.text.slice(0, MAX_EXTRACTED_CHARS),
  }

  textCache.set(cacheKey, result)

  return result
}

async function extractDocx(
  filePath: string,
): Promise<Pick<ExtractedDocument, 'extractor' | 'text'>> {
  const buffer = await fs.readFile(filePath)
  const entries = readZipEntries(buffer)
  const xmlNames = entries
    .map((entry) => entry.name)
    .filter((name) =>
      /^word\/(document|footnotes|endnotes|comments|header\d+|footer\d+)\.xml$/u.test(name),
    )
    .sort((a, b) => Number(a !== 'word/document.xml') - Number(b !== 'word/document.xml'))

  const parts: string[] = []

  for (const xmlName of xmlNames) {
    const entryBuffer = extractZipEntry(buffer, entries, xmlName)

    if (entryBuffer) {
      parts.push(docxXmlToText(entryBuffer.toString('utf8')))
    }
  }

  return {
    extractor: 'docx-xml',
    text: cleanText(parts.join('\n\n')),
  }
}

async function extractPDF(
  filePath: string,
): Promise<Pick<ExtractedDocument, 'extractor' | 'text' | 'warning'>> {
  try {
    const { stdout } = await execFileAsync(
      process.env.PDFTOTEXT_PATH || 'pdftotext',
      ['-enc', 'UTF-8', '-q', filePath, '-'],
      {
        encoding: 'utf8',
        maxBuffer: 15 * 1024 * 1024,
        timeout: 20_000,
        windowsHide: true,
      },
    )

    return {
      extractor: 'pdftotext',
      text: cleanText(stdout),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    return {
      extractor: 'pdf-metadata',
      text: '',
      warning: `pdftotext failed: ${message}`,
    }
  }
}

function readZipEntries(buffer: Buffer): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(buffer)
  const entriesCount = buffer.readUInt16LE(eocdOffset + 10)
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16)
  const entries: ZipEntry[] = []
  let offset = centralDirectoryOffset

  for (let index = 0; index < entriesCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('Invalid DOCX central directory')
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const fileNameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localHeaderOffset = buffer.readUInt32LE(offset + 42)
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8')

    entries.push({
      compressedSize,
      compressionMethod,
      localHeaderOffset,
      name,
    })

    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

function extractZipEntry(buffer: Buffer, entries: ZipEntry[], name: string): Buffer | undefined {
  const entry = entries.find((candidate) => candidate.name === name)

  if (!entry) {
    return undefined
  }

  const offset = entry.localHeaderOffset

  if (buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error(`Invalid DOCX local header for ${name}`)
  }

  const fileNameLength = buffer.readUInt16LE(offset + 26)
  const extraLength = buffer.readUInt16LE(offset + 28)
  const dataStart = offset + 30 + fileNameLength + extraLength
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize)

  if (entry.compressionMethod === 0) {
    return Buffer.from(compressed)
  }

  if (entry.compressionMethod === 8) {
    return zlib.inflateRawSync(compressed)
  }

  throw new Error(`Unsupported DOCX compression method ${entry.compressionMethod}`)
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minimumOffset = Math.max(0, buffer.length - 65_557)

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset
    }
  }

  throw new Error('DOCX end of central directory was not found')
}

function docxXmlToText(xml: string): string {
  return stripXml(
    xml
      .replace(/<w:tab\/>/gu, '\t')
      .replace(/<w:br\/>/gu, '\n')
      .replace(/<\/w:p>/gu, '\n')
      .replace(/<\/w:tr>/gu, '\n'),
  )
}

function stripXml(xml: string): string {
  return decodeXmlEntities(xml.replace(/<[^>]+>/gu, ' '))
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&amp;/gu, '&')
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&#(\d+);/gu, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/giu, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
}

function cleanText(text: string): string {
  return repairMojibake(text)
    .replace(/\u0000/gu, ' ')
    .replace(/[ \t]{2,}/gu, ' ')
    .replace(/\r\n?/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

function repairMojibake(text: string): string {
  const mojibakeMarkers = text.match(/[\u00d0\u00d1\u00c2\u00e2][\u0080-\u00bf]*/gu)?.length || 0
  const cyrillicLetters = text.match(/[\u0410-\u042f\u0430-\u044f\u0401\u0451]/gu)?.length || 0

  if (mojibakeMarkers < 20 || mojibakeMarkers < cyrillicLetters) {
    return text
  }

  try {
    return Buffer.from(text, 'latin1').toString('utf8')
  } catch (_error) {
    return text
  }
}

function splitIntoChunks(text: string): string[] {
  const normalized = cleanText(text)

  if (!normalized) {
    return []
  }

  const chunks: string[] = []
  const paragraphs = normalized.split(/\n{2,}/u)
  let current = ''
  const maxChunkLength = 1_800

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChunkLength) {
      if (current) {
        chunks.push(current)
        current = ''
      }

      chunks.push(...splitLongText(paragraph, maxChunkLength))
      continue
    }

    if (current.length + paragraph.length > maxChunkLength && current) {
      chunks.push(current)
      current = ''
    }

    current = current ? `${current}\n\n${paragraph}` : paragraph
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

function splitLongText(text: string, maxChunkLength: number): string[] {
  const chunks: string[] = []
  let cursor = 0

  while (cursor < text.length) {
    const end = Math.min(text.length, cursor + maxChunkLength)
    let splitAt = end

    if (end < text.length) {
      const windowStart = Math.max(cursor + Math.floor(maxChunkLength * 0.55), cursor)
      const candidate = Math.max(
        text.lastIndexOf('\n', end),
        text.lastIndexOf('. ', end),
        text.lastIndexOf('; ', end),
        text.lastIndexOf(' ', end),
      )

      if (candidate > windowStart) {
        splitAt = candidate + 1
      }
    }

    const chunk = text.slice(cursor, splitAt).trim()

    if (chunk) {
      chunks.push(chunk)
    }

    cursor = splitAt
  }

  return chunks
}

function scoreText(text: string, tokens: string[]): number {
  const lower = text.toLowerCase()

  return tokens.reduce((score, token) => score + (lower.includes(token) ? 1 : 0), 0)
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((token) => token.length > 2),
    ),
  )
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Number(value)))
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function normalizePathFilter(value: string): string {
  return value
    .trim()
    .replace(/\\/gu, '/')
    .replace(/^\.?\//u, '')
    .replace(/\/+$/u, '')
    .toLowerCase()
}
