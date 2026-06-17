import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { nodeId, parseFig } from 'openfig-core'

const defaultInputPath = 'C:/AI_model/xml/Lorgar.fig'
const defaultOutputDir = path.resolve('figma_source', 'parsed')
const targetFrameIds = ['15:6649', '21:8835', '58:1411', '98:7943', '98:8397', '113:11942', '113:13285']

const figPath = process.argv[2] || defaultInputPath
const outputDir = process.argv[3] ? path.resolve(process.argv[3]) : defaultOutputDir

const pick = (value, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => typeof value?.[key] !== 'undefined')
      .map((key) => [key, value[key]]),
  )

const normalizeValue = (value) => {
  if (value === null || typeof value === 'undefined') {
    return value
  }

  if (typeof value === 'bigint') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item))
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeValue(nestedValue)]),
    )
  }

  return value
}

const summarizePaints = (paints) =>
  Array.isArray(paints)
    ? paints.slice(0, 4).map((paint) =>
        normalizeValue(
          pick(paint, [
            'blendMode',
            'color',
            'gradientHandlePositions',
            'gradientStops',
            'imageRef',
            'imageTransform',
            'opacity',
            'scaleMode',
            'type',
            'visible',
          ]),
        ),
      )
    : undefined

const summarizeNode = ({ node }) => {
  const characters =
    typeof node?.textData?.characters === 'string'
      ? node.textData.characters.replace(/\s+/g, ' ').trim()
      : undefined

  return normalizeValue({
    absoluteBoundingBox: node.absoluteBoundingBox,
    constraints: node.constraints,
    cornerRadius: node.cornerRadius,
    effects: Array.isArray(node.effects)
      ? node.effects.map((effect) =>
          pick(effect, ['blendMode', 'color', 'offset', 'radius', 'spread', 'type', 'visible']),
        )
      : undefined,
    exportSettings: node.exportSettings,
    fills: summarizePaints(node.fillPaints),
    fontName: node.fontName,
    fontSize: node.fontSize,
    id: nodeId(node),
    itemSpacing: node.itemSpacing,
    layoutAlign: node.layoutAlign,
    layoutGrow: node.layoutGrow,
    layoutMode: node.layoutMode,
    layoutPositioning: node.layoutPositioning,
    lineHeight: node.lineHeight,
    name: node.name,
    opacity: node.opacity,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft,
    paddingRight: node.paddingRight,
    paddingTop: node.paddingTop,
    paragraphSpacing: node.paragraphSpacing,
    position: node.transform
      ? {
          x: node.transform.m02,
          y: node.transform.m12,
        }
      : undefined,
    size: node.size,
    stackAlign: node.stackAlign,
    stackCounterAlign: node.stackCounterAlign,
    stackMode: node.stackMode,
    strokes: summarizePaints(node.strokePaints),
    text: characters ? characters.slice(0, 280) : undefined,
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    textAutoResize: node.textAutoResize,
    textCase: node.textCase,
    textDecoration: node.textDecoration,
    type: node.type,
    visible: node.visible,
  })
}

const createTree = ({ doc, rootId, depth = 0, maxDepth = 8 }) => {
  const node = doc.nodeMap.get(rootId)

  if (!node) {
    return null
  }

  const children = depth >= maxDepth ? [] : (doc.childrenMap.get(rootId) ?? [])

  return {
    ...summarizeNode({ node }),
    children: children.map((child) =>
      createTree({
        depth: depth + 1,
        doc,
        maxDepth,
        rootId: nodeId(child),
      }),
    ),
  }
}

const createCanvasSummary = ({ canvas, doc }) => {
  const id = nodeId(canvas)
  const children = doc.childrenMap.get(id) ?? []

  return {
    children: children.map((child) => summarizeNode({ node: child })),
    id,
    name: canvas.name,
    type: canvas.type,
  }
}

const findTextNodes = ({ doc, rootId }) => {
  const results = []
  const queue = [rootId]

  while (queue.length > 0) {
    const currentId = queue.shift()

    if (!currentId) {
      continue
    }

    const node = doc.nodeMap.get(currentId)

    if (!node) {
      continue
    }

    if (node.type === 'TEXT') {
      results.push(
        normalizeValue({
          fontName: node.fontName,
          fontSize: node.fontSize,
          id: currentId,
          name: node.name,
          position: node.transform
            ? {
                x: node.transform.m02,
                y: node.transform.m12,
              }
            : undefined,
          text: typeof node?.textData?.characters === 'string' ? node.textData.characters : '',
        }),
      )
    }

    for (const child of doc.childrenMap.get(currentId) ?? []) {
      const childId = nodeId(child)

      if (childId) {
        queue.push(childId)
      }
    }
  }

  return results
}

const main = async () => {
  const data = new Uint8Array(await readFile(figPath))
  const doc = parseFig(data)
  const canvases = doc.nodes.filter((node) => node.type === 'CANVAS')
  const availableTargets = targetFrameIds.filter((id) => doc.nodeMap.has(id))

  await mkdir(outputDir, { recursive: true })

  await writeFile(
    path.join(outputDir, 'figma-document-summary.json'),
    JSON.stringify(
      normalizeValue({
        canvases: canvases.map((canvas) => createCanvasSummary({ canvas, doc })),
        header: doc.header,
        imagesCount: doc.images.size,
        meta: doc.meta,
        nodeCount: doc.nodes.length,
      }),
      null,
      2,
    ),
  )

  for (const targetId of availableTargets) {
    const node = doc.nodeMap.get(targetId)
    const safeId = targetId.replace(':', '-')

    await writeFile(
      path.join(outputDir, `frame-${safeId}-node.json`),
      JSON.stringify(normalizeValue(node), null, 2),
    )

    await writeFile(
      path.join(outputDir, `frame-${safeId}-tree.json`),
      JSON.stringify(createTree({ doc, rootId: targetId }), null, 2),
    )

    await writeFile(
      path.join(outputDir, `frame-${safeId}-texts.json`),
      JSON.stringify(findTextNodes({ doc, rootId: targetId }), null, 2),
    )
  }

  console.log(
    JSON.stringify(
      {
        availableTargets,
        canvases: canvases.map((canvas) => ({ id: nodeId(canvas), name: canvas.name })),
        outputDir,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
