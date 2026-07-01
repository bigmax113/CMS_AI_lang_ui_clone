import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getBlobBytes, geometryBlobToSVGPath, parseFig, resolveVectorNodePaths } from 'openfig-core'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const figPath = process.argv[2] || 'C:/codex/payload/Lorgar Blog.fig'
const outputDir = join(repoRoot, 'public', 'lorgar-figma')

const doc = parseFig(readFileSync(figPath))

const assetTargets = [
  { id: '214:16759', name: 'logo' },
  { id: '214:16784', name: 'blog-badge' },
  { id: '113:4099', name: 'search' },
  { id: '4:12', name: 'chevron-down' },
  { id: '15:6158', name: 'eye' },
  { id: '15:6141', name: 'calendar' },
  { id: '79:2567', name: 'arrow-right-mini' },
  { id: '214:17460', name: 'social-instagram' },
  { id: '214:17465', name: 'social-linkedin' },
  { id: '214:17470', name: 'social-facebook' },
  { id: '214:17475', name: 'social-telegram' },
  { id: '214:17477', name: 'social-whatsapp' },
  { id: '214:17479', name: 'social-youtube' },
  { id: '214:17484', name: 'social-tiktok' },
  { id: '126:16435', name: 'share-facebook', renderDerivedSymbol: true },
  { id: '126:16437', name: 'share-linkedin', renderDerivedSymbol: true },
  { id: '126:16438', name: 'share-telegram', renderDerivedSymbol: true },
  { id: '15:6737', name: 'reaction-like' },
]

mkdirSync(outputDir, { recursive: true })

for (const target of assetTargets) {
  const node = doc.nodeMap.get(target.id)

  if (!node) {
    throw new Error(`Figma node ${target.id} (${target.name}) was not found`)
  }

  const rawWidth = Number(node.size?.x || 24)
  const rawHeight = Number(node.size?.y || 24)
  const width = round(target.outputSize || rawWidth)
  const height = round(target.outputSize || rawHeight)
  const ctx = { clipIndex: 0, defs: [] }
  let body = renderNode(target.id, identity(), { ctx, includeSelfTransform: false, renderDerivedSymbol: Boolean(target.renderDerivedSymbol) })
  if (target.stripOuterCircle) {
    body = stripFirstSVGPath(body)
  }
  if (target.outputSize) {
    body = `<g transform="scale(${round(target.outputSize / rawWidth)} ${round(target.outputSize / rawHeight)})">${body}</g>`
  }
  const defs = ctx.defs.length ? `<defs>${ctx.defs.join('')}</defs>` : ''
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">`,
    defs,
    body,
    '</svg>',
  ].join('')

  writeFileSync(join(outputDir, `${target.name}.svg`), svg)
}

console.log(`Exported ${assetTargets.length} Figma assets to ${outputDir}`)

function renderNode(nodeRef, parentMatrix, options = {}) {
  const id = toID(nodeRef)
  const node = doc.nodeMap.get(id) || (typeof nodeRef === 'object' && nodeRef ? nodeRef : null)

  if (!node || node.phase === 'REMOVED' || node.visible === false) {
    return ''
  }

  const matrix = options.includeSelfTransform === false
    ? parentMatrix
    : multiply(parentMatrix, node.transform || identity())
  const children = getChildren(id)
  const lowerName = String(node.name || '').toLowerCase()

  if (lowerName.includes('clip path group') && children.length > 1) {
    const clipChild = children[0]
    const clipID = `clip-${options.ctx.clipIndex++}`
    const clipPath = renderClipPath(clipChild, matrix)
    const content = children
      .slice(1)
      .map((child) => renderNode(child, matrix, { ctx: options.ctx, renderDerivedSymbol: options.renderDerivedSymbol }))
      .join('')

    if (!clipPath || !content) {
      return content
    }

    options.ctx.defs.push(`<clipPath id="${clipID}">${clipPath}</clipPath>`)

    return `<g clip-path="url(#${clipID})">${content}</g>`
  }

  const own = renderOwnGeometry(node, matrix, options)
  const childContent = children
    .map((child) => renderNode(child, matrix, { ctx: options.ctx }))
    .join('')

  return own + childContent
}

function renderClipPath(nodeRef, parentMatrix) {
  const id = toID(nodeRef)
  const node = doc.nodeMap.get(id) || (typeof nodeRef === 'object' && nodeRef ? nodeRef : null)

  if (!node || node.visible === false) {
    return ''
  }

  const matrix = multiply(parentMatrix, node.transform || identity())
  const resolved = resolveVectorNodePaths(doc, node)
  const resolvedPaths = [...(resolved.fill || []), ...(resolved.stroke || [])]
  const vectorPaths = resolvedPaths.length ? resolvedPaths : getVectorNetworkPaths(node)
  const vectorMatrix = resolvedPaths.length ? matrix : multiply(matrix, vectorGeometryScale(node))
  const own = vectorPaths
    .map((path) => `<path d="${escapeXML(path.svgPath)}" transform="${matrixToSVG(vectorMatrix)}"/>`)
    .join('')
  const children = getChildren(id)
    .map((child) => renderClipPath(child, matrix))
    .join('')

  return own + children
}

function getChildren(id) {
  return id ? doc.childrenMap.get(id) || [] : []
}

function stripFirstSVGPath(svgBody) {
  return String(svgBody).replace(/<path\b[^>]*><\/path>|<path\b[^>]*\/?>/, '')
}

function renderOwnGeometry(node, matrix, options = {}) {
  const output = []
  const fills = getVisiblePaints(node.fillPaints)
  const strokes = getVisiblePaints(node.strokePaints)
  const resolved = resolveVectorNodePaths(doc, node)
  const hasResolvedFill = Boolean(resolved.fill?.length)
  const hasResolvedStroke = Boolean(resolved.stroke?.length)
  const fillPaths = hasResolvedFill ? resolved.fill : getVectorNetworkPaths(node, 'fill')
  const strokePaths = hasResolvedStroke ? resolved.stroke : getVectorNetworkPaths(node, 'stroke')
  const fillMatrix = hasResolvedFill ? matrix : multiply(matrix, vectorGeometryScale(node))
  const strokeMatrix = hasResolvedStroke ? matrix : multiply(matrix, vectorGeometryScale(node))

  if (options.renderDerivedSymbol && shouldRenderFrameFill(node)) {
    for (const paint of getFrameFillPaints(node)) {
      if (paint.type !== 'SOLID') {
        continue
      }

      output.push(renderFrameFill(node, paint, matrix))
    }
  }

  if (options.renderDerivedSymbol && node.derivedSymbolData) {
    output.push(renderDerivedSymbolGeometry(node, matrix))

    return output.join('')
  }

  for (const paint of fills) {
    if (paint.type === 'IMAGE') {
      output.push(renderImage(node, paint, matrix))
      continue
    }

    if (paint.type !== 'SOLID') {
      continue
    }

    for (const path of fillPaths) {
      output.push(
        `<path d="${escapeXML(path.svgPath)}" fill="${paintToColor(paint)}" fill-rule="${svgFillRule(path.windingRule)}" transform="${matrixToSVG(fillMatrix)}"${paintOpacity(paint)}/>`,
      )
    }
  }

  for (const paint of strokes) {
    if (paint.type !== 'SOLID') {
      continue
    }

    for (const path of strokePaths) {
      if (path.open) {
        output.push(
          `<path d="${escapeXML(path.svgPath)}" fill="none" stroke="${paintToColor(paint)}" stroke-width="${round(node.strokeWeight || 1)}" stroke-linecap="${svgStrokeCap(node.strokeCap)}" stroke-linejoin="${svgStrokeJoin(node.strokeJoin)}" transform="${matrixToSVG(strokeMatrix)}"${paintOpacity(paint)}/>`,
        )

        continue
      }

      output.push(
        `<path d="${escapeXML(path.svgPath)}" fill="${paintToColor(paint)}" fill-rule="${svgFillRule(path.windingRule)}" transform="${matrixToSVG(strokeMatrix)}"${paintOpacity(paint)}/>`,
      )
    }
  }

  return output.join('')
}

function vectorGeometryScale(node) {
  const normalizedSize = node.vectorData?.normalizedSize

  if (!normalizedSize || !node.size?.x || !node.size?.y || !normalizedSize.x || !normalizedSize.y) {
    return identity()
  }

  return {
    m00: node.size.x / normalizedSize.x,
    m01: 0,
    m02: 0,
    m10: 0,
    m11: node.size.y / normalizedSize.y,
    m12: 0,
  }
}

function getNodePaths(node) {
  const resolved = resolveVectorNodePaths(doc, node)

  const resolvedPaths = [...(resolved.fill || []), ...(resolved.stroke || [])]

  return resolvedPaths.length ? resolvedPaths : getVectorNetworkPaths(node)
}

function shouldRenderFrameFill(node) {
  return ['FRAME', 'INSTANCE', 'SYMBOL'].includes(node.type) && Boolean(node.size?.x && node.size?.y && node.cornerRadius !== undefined)
}

function renderFrameFill(node, paint, matrix) {
  const width = round(node.size?.x || 0)
  const height = round(node.size?.y || 0)
  const radius = round(Math.min(Number(node.cornerRadius || 0), Number(node.size?.x || 0) / 2, Number(node.size?.y || 0) / 2))

  return `<rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${paintToColor(paint)}" transform="${matrixToSVG(matrix)}"${paintOpacity(paint)}/>`
}

function renderDerivedSymbolGeometry(node, matrix) {
  return Object.values(node.derivedSymbolData || {})
    .flatMap((entry) => {
      const paints = getDerivedSymbolPaints(node, entry)

      if (!paints.length) {
        return []
      }

      return (entry.fillGeometry || []).flatMap((geometry) => {
        const bytes = getBlobBytes(doc, geometry.commandsBlob)
        const svgPath = bytes ? geometryBlobToSVGPath(bytes) : ''

        if (!svgPath) {
          return []
        }

        return paints
          .filter((paint) => paint.type === 'SOLID')
          .map((paint) => `<path d="${escapeXML(svgPath)}" fill="${paintToColor(paint)}" fill-rule="${svgFillRule(geometry.windingRule)}" transform="${matrixToSVG(centerDerivedGeometryMatrix(node, svgPath, matrix))}"${paintOpacity(paint)}/>`)
      })
    })
    .join('')
}

function centerDerivedGeometryMatrix(node, svgPath, matrix) {
  const bounds = getSVGPathBounds(svgPath)

  if (!bounds || !node.size?.x || !node.size?.y) {
    return matrix
  }

  const x = (Number(node.size.x) - bounds.width) / 2 - bounds.minX
  const y = (Number(node.size.y) - bounds.height) / 2 - bounds.minY

  return multiply(matrix, {
    m00: 1,
    m01: 0,
    m02: x,
    m10: 0,
    m11: 1,
    m12: y,
  })
}

function getSVGPathBounds(svgPath) {
  const values = String(svgPath)
    .match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)
    ?.map(Number)

  if (!values?.length) {
    return null
  }

  const xs = []
  const ys = []

  for (let index = 0; index < values.length; index += 2) {
    if (Number.isFinite(values[index])) {
      xs.push(values[index])
    }

    if (Number.isFinite(values[index + 1])) {
      ys.push(values[index + 1])
    }
  }

  if (!xs.length || !ys.length) {
    return null
  }

  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function getFrameFillPaints(node) {
  const override = (node.symbolData?.symbolOverrides || []).find((item) => (
    item.size?.x === node.size?.x &&
    item.size?.y === node.size?.y &&
    item.styleIdForFill
  ))

  return override ? getStylePaints(override.styleIdForFill) : getVisiblePaints(node.fillPaints)
}

function getDerivedSymbolPaints(node, entry) {
  const entryKey = guidPathKey(entry.guidPath)
  const override = (node.symbolData?.symbolOverrides || []).find((item) => (
    item.styleIdForFill && guidPathKey(item.guidPath) === entryKey
  ))

  return override ? getStylePaints(override.styleIdForFill) : []
}

function getStylePaints(styleRef) {
  const key = styleRef?.assetRef?.key
  const style = key ? [...doc.nodeMap.values()].find((node) => node.key === key && node.styleType === 'FILL') : null

  return getVisiblePaints(style?.fillPaints)
}

function guidPathKey(guidPath) {
  return (guidPath?.guids || [])
    .map((guid) => `${guid.sessionID}:${guid.localID}`)
    .join('/')
}

function getVectorNetworkPaths(node, mode = 'all') {
  const blobIndex = node.vectorData?.vectorNetworkBlob

  if (blobIndex === undefined || blobIndex === null) {
    return []
  }

  const bytes = getBlobBytes(doc, blobIndex)

  if (!bytes) {
    return []
  }

  let decodedPaths = []

  try {
    decodedPaths = decodeVectorNetwork(bytes)
  } catch (error) {
    console.warn(`Skipping unsupported vector network in ${toID(node)} (${node.name}): ${error.message}`)

    return []
  }

  const paths = decodedPaths.map((path, index) => ({
    open: typeof path === 'object' ? path.open : false,
    svgPath: typeof path === 'object' ? path.svgPath : path,
    styleID: index,
    windingRule: 'NONZERO',
  }))

  if (mode === 'fill' && getVisiblePaints(node.fillPaints).length) {
    return paths
  }

  if (mode === 'stroke' && getVisiblePaints(node.strokePaints).length) {
    return paths
  }

  return mode === 'all' ? paths : []
}

function decodeVectorNetwork(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 0
  const vertexCount = view.getUint32(offset, true)
  offset += 4
  const segmentCount = view.getUint32(offset, true)
  offset += 4
  const regionCount = view.getUint32(offset, true)
  offset += 4

  const modernHeaderLength = 16
  const legacyHeaderLength = 12
  const minimumModernLength = modernHeaderLength + vertexCount * 12 + segmentCount * 28

  const isModernVectorNetwork = minimumModernLength <= bytes.byteLength

  if (isModernVectorNetwork) {
    offset += 4
  } else {
    offset = legacyHeaderLength
  }

  const vertices = []

  for (let index = 0; index < vertexCount; index += 1) {
    const x = isModernVectorNetwork
      ? view.getFloat32(offset, true)
      : view.getFloat32(offset + 4, true)
    const y = isModernVectorNetwork
      ? view.getFloat32(offset + 4, true)
      : view.getFloat32(offset + 8, true)

    vertices.push({ x, y })
    offset += 12
  }

  const segments = []

  for (let index = 0; index < segmentCount; index += 1) {
    segments.push({
      s: view.getUint32(offset, true),
      tsx: view.getFloat32(offset + 4, true),
      tsy: view.getFloat32(offset + 8, true),
      e: view.getUint32(offset + 12, true),
      tex: view.getFloat32(offset + 16, true),
      tey: view.getFloat32(offset + 20, true),
      t: view.getUint32(offset + 24, true),
    })
    offset += 28
  }

  if (regionCount === 0) {
    return segments.length ? [{ open: true, svgPath: segmentsToOpenPath(segments, vertices) }] : []
  }

  const paths = []

  for (let regionIndex = 0; regionIndex < regionCount; regionIndex += 1) {
    offset += 4
    const regionLength = view.getUint32(offset, true)
    offset += 4
    const segmentIndexes = []

    for (let segmentIndex = 0; segmentIndex < regionLength; segmentIndex += 1) {
      segmentIndexes.push(view.getUint32(offset, true))
      offset += 4
    }

    offset += 4

    if (!segmentIndexes.length) {
      continue
    }

    paths.push({
      open: false,
      svgPath: segmentsToClosedPath(segmentIndexes.map((segmentIndex) => segments[segmentIndex]), vertices),
    })
  }

  return paths
}

function segmentsToOpenPath(segments, vertices) {
  const first = segments[0]
  const start = vertices[first.s]
  const parts = [`M${round(start.x)} ${round(start.y)}`]

  for (const segment of segments) {
    const s = vertices[segment.s]
    const e = vertices[segment.e]

    if (segment.t === 4) {
      parts.push(
        `C${round(s.x + segment.tsx)} ${round(s.y + segment.tsy)} ${round(e.x + segment.tex)} ${round(e.y + segment.tey)} ${round(e.x)} ${round(e.y)}`,
      )
    } else {
      parts.push(`L${round(e.x)} ${round(e.y)}`)
    }
  }

  return parts.join('')
}

function segmentsToClosedPath(segments, vertices) {
  const path = segmentsToOpenPath(segments, vertices)

  return `${path}Z`
}

function renderImage(node, paint, matrix) {
  const hash = imageHash(paint)
  const data = hash ? doc.images.get(hash) : null

  if (!data) {
    return ''
  }

  const mime = imageMime(data)
  const href = `data:${mime};base64,${Buffer.from(data).toString('base64')}`

  return `<image href="${href}" width="${round(node.size?.x || 0)}" height="${round(node.size?.y || 0)}" preserveAspectRatio="xMidYMid slice" transform="${matrixToSVG(matrix)}"${paintOpacity(paint)}/>`
}

function imageHash(paint) {
  const hash = paint.image?.hash || paint.imageHash || paint.imageRef

  if (hash instanceof Uint8Array) {
    return [...hash].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return typeof hash === 'string' ? hash : null
}

function imageMime(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return 'image/png'
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'image/jpeg'
  }

  if (bytes[0] === 0x52 && bytes[1] === 0x49) {
    return 'image/webp'
  }

  return 'application/octet-stream'
}

function getVisiblePaints(paints) {
  return (paints || []).filter((paint) => paint?.visible !== false && paint.opacity !== 0)
}

function paintToColor(paint) {
  const color = paint.color || { r: 1, g: 1, b: 1, a: 1 }

  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a ?? 1})`
}

function paintOpacity(paint) {
  const opacity = paint.opacity ?? 1

  return opacity < 1 ? ` opacity="${round(opacity)}"` : ''
}

function svgFillRule(rule) {
  return rule === 'EVENODD' || rule === 'ODD' ? 'evenodd' : 'nonzero'
}

function svgStrokeCap(cap) {
  return cap === 'SQUARE' ? 'square' : cap === 'NONE' ? 'butt' : 'round'
}

function svgStrokeJoin(join) {
  return join === 'BEVEL' ? 'bevel' : join === 'ROUND' ? 'round' : 'miter'
}

function toID(node) {
  if (typeof node === 'string') {
    return node
  }

  return node?.guid ? `${node.guid.sessionID}:${node.guid.localID}` : node?.id
}

function identity() {
  return { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
}

function multiply(parent, child) {
  return {
    m00: parent.m00 * child.m00 + parent.m01 * child.m10,
    m01: parent.m00 * child.m01 + parent.m01 * child.m11,
    m02: parent.m00 * child.m02 + parent.m01 * child.m12 + parent.m02,
    m10: parent.m10 * child.m00 + parent.m11 * child.m10,
    m11: parent.m10 * child.m01 + parent.m11 * child.m11,
    m12: parent.m10 * child.m02 + parent.m11 * child.m12 + parent.m12,
  }
}

function matrixToSVG(matrix) {
  return `matrix(${round(matrix.m00)} ${round(matrix.m10)} ${round(matrix.m01)} ${round(matrix.m11)} ${round(matrix.m02)} ${round(matrix.m12)})`
}

function round(value) {
  const rounded = Math.round(Number(value) * 1000) / 1000

  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function escapeXML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
