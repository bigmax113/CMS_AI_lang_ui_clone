import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import {
  aiDocsEndpoint,
  aiFoldersEndpoint,
  askEndpoint,
  generateArticleEndpoint,
  generateImageEndpoint,
  generateVideoEndpoint,
  saveArticleDraftEndpoint,
  translateArticlesEndpoint,
  translateUiEndpoint,
  updateArticleStatusesEndpoint,
  videoStatusEndpoint,
} from './ai/endpoints'
import { AIProjectsCollection, aiProjectsSlug } from './collections/AIProjects'
import { ArticlesCollection, articlesSlug } from './collections/Articles'
import { AuthorsCollection, authorsSlug } from './collections/Authors'
import { BlogPostsCollection, blogPostsSlug } from './collections/BlogPosts'
import { BlogTemplatesCollection, blogTemplatesSlug } from './collections/BlogTemplates'
import { Media, mediaSlug } from './collections/Media'
import { PromptTemplatesCollection, promptTemplatesSlug } from './collections/PromptTemplates'
import { SiteLinksCollection, siteLinksSlug } from './collections/SiteLinks'
import { SitesCollection, sitesSlug } from './collections/Sites'
import { TestRunsCollection, testRunsSlug } from './collections/TestRuns'
import { Users, usersSlug } from './collections/Users'
import { migrations } from './migrations'
import {
  articleReactionEndpoint,
  newsletterSubscriptionEndpoint,
} from './publicInteractions/endpoints'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const payloadSecret =
  process.env.PAYLOAD_SECRET ||
  process.env.PAYLOAD_ADMIN_PASSWORD ||
  'payload-ai-tester-workbench-secret-change-me'
const databaseSchemaName = process.env.PAYLOAD_DB_SCHEMA || undefined
const plugPlayDemoImages: Record<string, string> = {
  'PlugPlay_750x350.jpg': '/seo/grok-test-blog.jpeg',
  'PlugPlay_750x350-2.jpg': '/seo/grok-test-blog-inline-2.jpeg',
  'PlugPlay_750x350-3.jpg': '/seo/grok-test-blog-inline-1.jpeg',
}

const richTextParagraph = ({ text }: { text: string }) => ({
  root: {
    children: [
      {
        children: [
          {
            text,
            type: 'text' as const,
          },
        ],
        direction: null,
        format: '' as const,
        indent: 0,
        type: 'paragraph' as const,
        version: 1,
      },
    ],
    direction: null,
    format: '' as const,
    indent: 0,
    type: 'root' as const,
    version: 1,
  },
})

type SeedRichTextBlock =
  | {
      text: string
      type: 'paragraph'
    }
  | {
      tag: 'h2' | 'h3'
      text: string
      type: 'heading'
    }

const richTextDocument = (blocks: readonly SeedRichTextBlock[]) => ({
  root: {
    children: blocks.map((block) =>
      block.type === 'heading'
        ? {
            children: [
              {
                text: block.text,
                type: 'text' as const,
              },
            ],
            direction: null,
            format: '' as const,
            indent: 0,
            tag: block.tag,
            type: 'heading' as const,
            version: 1,
          }
        : {
            children: [
              {
                text: block.text,
                type: 'text' as const,
              },
            ],
            direction: null,
            format: '' as const,
            indent: 0,
            type: 'paragraph' as const,
            version: 1,
          },
    ),
    direction: null,
    format: '' as const,
    indent: 0,
    type: 'root' as const,
    version: 1,
  },
})

const resolveSeedPublicAssetPath = (assetPath: string) =>
  path.resolve(process.cwd(), 'public', assetPath.replace(/^\/+/u, ''))

const seedMediaDefinitions = [
  {
    alt: 'LORGAR gaming chair hero',
    externalImageURL: '/lorgar-blog-hero.webp',
    filename: 'lorgar-blog-hero.webp',
    mimeType: 'image/webp',
  },
  {
    alt: 'LORGAR esports team and event stage',
    externalImageURL: '/seo/grok-test-blog.jpeg',
    filename: 'lorgar-esports-stage.jpeg',
    mimeType: 'image/jpeg',
  },
  {
    alt: 'LORGAR product detail close-up',
    externalImageURL: '/seo/grok-test-blog-inline-1.jpeg',
    filename: 'lorgar-product-closeup-1.jpeg',
    mimeType: 'image/jpeg',
  },
  {
    alt: 'LORGAR product and audience showcase',
    externalImageURL: '/seo/grok-test-blog-inline-2.jpeg',
    filename: 'lorgar-product-closeup-2.jpeg',
    mimeType: 'image/jpeg',
  },
] as const

const seedArticleDefinitions = [
  {
    blocks: [
      {
        text: 'From May 22-24, the Lithuanian Exhibition and Congress Centre LITEXPO welcomed thousands of visitors for Comic Con Baltics 2026, bringing together gaming communities, creators, and leading entertainment brands.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'Why this activation mattered',
        type: 'heading' as const,
      },
      {
        text: 'LORGAR used the event to demonstrate complete gaming-ready setups, hands-on product testing, and a stronger brand presence inside one of the region’s most visible community stages.',
        type: 'paragraph' as const,
      },
    ],
    category: 'release-note',
    contentType: 'news',
    coverImageKey: 'lorgar-esports-stage.jpeg',
    languageCode: 'en',
    publishedAt: '2026-05-26T09:00:00.000Z',
    slug: 'lorgar-powers-the-rainbow-six-siege-experience-at-comic-con-baltics-2026',
    summary:
      'From May 22-24, the Lithuanian Exhibition and Congress Centre LITEXPO welcomed 36,900 visitors for the annual Comic Con Baltics 2026, where LORGAR delivered a complete Rainbow Six Siege experience.',
    tags: ['esports', 'events', 'products', 'rainbow-six-siege', 'rankings', 'passion', 'stake-ranked'],
    title: 'LORGAR Powers the Rainbow Six Siege Experience at Comic Con Baltics 2026',
  },
  {
    blocks: [
      {
        text: 'LORGAR continues to bring its Ready To Play ecosystem into real competitive environments by equipping the A&P Performance Lab bootcamp base in Riga with desks, seating, and peripherals built for long practice blocks.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'Bootcamp-ready environment',
        type: 'heading' as const,
      },
      {
        text: 'The installation was designed to support repeatable performance routines, fast changeovers, and comfortable day-long use for competitive teams and training staff.',
        type: 'paragraph' as const,
      },
    ],
    category: 'release-note',
    contentType: 'news',
    coverImageKey: 'lorgar-product-closeup-2.jpeg',
    languageCode: 'en',
    publishedAt: '2026-05-24T09:00:00.000Z',
    slug: 'lorgar-fully-equips-ap-performance-lab-bootcamp-base-in-riga',
    summary:
      'LORGAR fully equips the A&P Performance Lab bootcamp base in Riga with a coordinated ecosystem of competitive gaming hardware and furniture.',
    tags: ['esports', 'platform', 'performance-lab', 'partners', 'astral-esports'],
    title: 'LORGAR Fully Equips A&P Performance Lab Bootcamp Base in Riga',
  },
  {
    blocks: [
      {
        text: 'Choosing a gaming mouse starts with fit, sensor consistency, weight balance, and the way the shell supports your grip during longer sessions.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'Key selection criteria',
        type: 'heading' as const,
      },
      {
        text: 'Editors and buyers should compare polling rate, switch feel, cable drag or wireless latency, and the software controls that make the mouse easier to adapt for different play styles.',
        type: 'paragraph' as const,
      },
    ],
    category: 'product-content',
    contentType: 'guide',
    coverImageKey: 'lorgar-product-closeup-1.jpeg',
    languageCode: 'en',
    publishedAt: '2026-05-22T09:00:00.000Z',
    slug: 'how-to-choose-a-gaming-mouse-weight-sensor-polling-rate-and-more',
    summary:
      'A practical guide to choosing a gaming mouse by weight, sensor quality, polling rate, grip support, and everyday comfort.',
    tags: ['for-users', 'products', 'gaming-mice', 'mouse-buying-guide', 'gaming-mousepads', 'gaming-accessories'],
    title: 'How to Choose a Gaming Mouse: Weight, Sensor, Polling Rate and More',
  },
  {
    blocks: [
      {
        text: 'A streaming solution needs clean audio, consistent lighting, stable desk space, and accessories that reduce friction when a creator switches between gaming and live production.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'Building a balanced streaming desk',
        type: 'heading' as const,
      },
      {
        text: 'The best streaming solution combines a microphone, webcam, lighting, and ergonomic placement so the setup remains practical during longer recording and broadcast sessions.',
        type: 'paragraph' as const,
      },
    ],
    category: 'internal-guide',
    contentType: 'guide',
    coverImageKey: 'lorgar-product-closeup-2.jpeg',
    languageCode: 'en',
    publishedAt: '2026-05-20T09:00:00.000Z',
    slug: 'streaming-solution-for-creator-setups',
    summary:
      'A streaming solution blueprint for creators who need a practical mix of camera, microphone, desk, and comfort hardware.',
    tags: ['solutions', 'streaming-solution', 'for-users', 'webcams', 'gaming-microphones', 'gaming-accessories'],
    title: 'Streaming Solution for Creator Setups',
  },
  {
    blocks: [
      {
        text: 'A PC gaming solution should balance monitor response, desk footprint, cable management, input devices, and a seating position that supports both ranked play and everyday use.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'What makes a strong PC gaming solution',
        type: 'heading' as const,
      },
      {
        text: 'Instead of building around isolated parts, this guide looks at the full PC gaming solution: screen, chair, microphone, headset, and the accessories that keep the setup cohesive.',
        type: 'paragraph' as const,
      },
    ],
    category: 'product-content',
    contentType: 'guide',
    coverImageKey: 'lorgar-blog-hero.webp',
    languageCode: 'en',
    publishedAt: '2026-05-18T09:00:00.000Z',
    slug: 'pc-gaming-solution-for-competitive-and-everyday-play',
    summary:
      'A PC gaming solution guide that connects monitors, desks, chairs, microphones, and accessories into one practical setup.',
    tags: ['solutions', 'pc-gaming-solution', 'products', 'pc', 'monitors', 'gaming-desks', 'gaming-controllers'],
    title: 'PC Gaming Solution for Competitive and Everyday Play',
  },
  {
    blocks: [
      {
        text: 'The Sim Racing Flex Solution is built for players who want a modular cockpit foundation that can evolve with pedals, wheel bases, seating, and accessory mounts over time.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'Flexible growth path',
        type: 'heading' as const,
      },
      {
        text: 'It focuses on entry comfort, reliable structural support, and the ability to scale without replacing the full foundation too early.',
        type: 'paragraph' as const,
      },
    ],
    category: 'product-content',
    contentType: 'guide',
    coverImageKey: 'lorgar-product-closeup-1.jpeg',
    languageCode: 'en',
    publishedAt: '2026-05-16T09:00:00.000Z',
    slug: 'sim-racing-flex-solution-modular-cockpit-starter-guide',
    summary:
      'A Sim Racing Flex Solution overview for players who need a modular cockpit starter configuration with room to grow.',
    tags: ['solutions', 'sim-racing-flex-solution', 'racing-cockpits', 'for-users'],
    title: 'Sim Racing Flex Solution: Modular Cockpit Starter Guide',
  },
  {
    blocks: [
      {
        text: 'The Sim Racing Pro Solution targets higher-load setups that demand stronger rigidity, more precise positioning, and upgrade headroom for advanced wheel and pedal combinations.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'Performance-first cockpit design',
        type: 'heading' as const,
      },
      {
        text: 'This article explains how a Sim Racing Pro Solution keeps ergonomics, mounting stability, and long-session comfort in balance for experienced drivers.',
        type: 'paragraph' as const,
      },
    ],
    category: 'product-content',
    contentType: 'guide',
    coverImageKey: 'lorgar-product-closeup-2.jpeg',
    languageCode: 'en',
    publishedAt: '2026-05-14T09:00:00.000Z',
    slug: 'sim-racing-pro-solution-performance-cockpit-build',
    summary:
      'A Sim Racing Pro Solution guide for advanced cockpit builds focused on rigidity, adjustability, and repeatable comfort.',
    tags: ['solutions', 'sim-racing-pro-solution', 'racing-cockpits', 'products'],
    title: 'Sim Racing Pro Solution: Performance Cockpit Build',
  },
  {
    blocks: [
      {
        text: 'The CHA41 series expands the gaming chair lineup with a focus on long-session support, durable materials, and a clearer fit between everyday comfort and competitive use.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'Built for long sessions',
        type: 'heading' as const,
      },
      {
        text: 'Cold-moulded foam, full-metal framing, and fabric finishes help position the CHA41 as a practical chair family for users who need comfort without losing visual identity.',
        type: 'paragraph' as const,
      },
    ],
    category: 'product-content',
    contentType: 'news',
    coverImageKey: 'lorgar-blog-hero.webp',
    languageCode: 'en',
    publishedAt: '2026-05-11T09:00:00.000Z',
    slug: 'lorgar-introduces-the-cha41-gaming-chair-series-built-for-long-sessions-designed-to-last',
    summary:
      'LORGAR expands its gaming furniture line with the CHA41 gaming chair series built for long sessions, lasting comfort, and ergonomic support.',
    tags: ['products', 'gaming-chairs', 'chairs'],
    title: 'LORGAR Introduces the CHA41 Gaming Chair Series - Built for Long Sessions, Designed to Last',
  },
  {
    blocks: [
      {
        text: 'The LORGAR platform keeps products, event activations, retailer stories, and user guides connected through a single editorial ecosystem that scales across categories and markets.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'One ecosystem for content and products',
        type: 'heading' as const,
      },
      {
        text: 'This update highlights how the platform brings product launches, esports partnerships, and educational content into one coherent brand surface.',
        type: 'paragraph' as const,
      },
    ],
    category: 'knowledge-base',
    contentType: 'article',
    coverImageKey: 'lorgar-esports-stage.jpeg',
    languageCode: 'en',
    publishedAt: '2026-05-09T09:00:00.000Z',
    slug: 'whats-new-in-the-lorgar-platform-ecosystem',
    summary:
      'A closer look at the LORGAR platform ecosystem and the way it connects product content, partnerships, and user-facing stories.',
    tags: ['platform', 'about', 'ecosystem'],
    title: 'What’s New in the LORGAR Platform Ecosystem',
  },
  {
    blocks: [
      {
        text: 'Gaming headsets should be judged by comfort over time, positional clarity, voice pickup, and the way the tuning supports both everyday listening and competitive sessions.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'What to compare before buying',
        type: 'heading' as const,
      },
      {
        text: 'This guide covers earcup fit, clamp force, microphone behavior, and the practical tradeoffs between closed, open, wired, and wireless headset designs.',
        type: 'paragraph' as const,
      },
    ],
    category: 'product-content',
    contentType: 'guide',
    coverImageKey: 'lorgar-product-closeup-2.jpeg',
    languageCode: 'en',
    publishedAt: '2026-05-07T09:00:00.000Z',
    slug: 'how-to-choose-a-gaming-headset-for-daily-play-and-tournaments',
    summary:
      'How to choose a gaming headset by comfort, positional clarity, microphone quality, and daily usability.',
    tags: ['for-users', 'products', 'gaming-headsets'],
    title: 'How to Choose a Gaming Headset for Daily Play and Tournaments',
  },
  {
    blocks: [
      {
        text: 'Gaming keyboards influence comfort, consistency, and confidence through switch feel, layout, stabilizer quality, and the way the board fits the rest of the setup.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'Finding the right keyboard profile',
        type: 'heading' as const,
      },
      {
        text: 'We compare full-size and compact layouts, acoustic behavior, keycap feel, and the details that matter once a keyboard becomes part of a daily gaming routine.',
        type: 'paragraph' as const,
      },
    ],
    category: 'product-content',
    contentType: 'guide',
    coverImageKey: 'lorgar-product-closeup-1.jpeg',
    languageCode: 'en',
    publishedAt: '2026-05-05T09:00:00.000Z',
    slug: 'how-to-choose-a-gaming-keyboard-for-precision-and-comfort',
    summary:
      'A practical guide to choosing a gaming keyboard by switch feel, layout, sound, and long-session comfort.',
    tags: ['for-users', 'products', 'gaming-keyboards'],
    title: 'How to Choose a Gaming Keyboard for Precision and Comfort',
  },
  {
    blocks: [
      {
        text: 'A brand story matters when it explains how products, support, events, and community activations fit together in a way that feels coherent across different regions and audiences.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'About LORGAR',
        type: 'heading' as const,
      },
      {
        text: 'This article outlines how the brand builds ready-to-play ecosystems across content, hardware, partnerships, and competitive gaming visibility.',
        type: 'paragraph' as const,
      },
    ],
    category: 'knowledge-base',
    contentType: 'article',
    coverImageKey: 'lorgar-esports-stage.jpeg',
    languageCode: 'en',
    publishedAt: '2026-05-03T09:00:00.000Z',
    slug: 'about-lorgar-how-the-brand-builds-ready-to-play-ecosystems',
    summary:
      'About LORGAR: how the brand connects products, communities, and editorial storytelling into one ready-to-play ecosystem.',
    tags: ['about', 'platform'],
    title: 'About LORGAR: How the Brand Builds Ready-To-Play Ecosystems',
  },
  {
    blocks: [
      {
        text: 'Where to buy should be more than a static list. It should explain regional availability, partner coverage, and the types of retail experiences readers can expect when moving from blog content into purchase research.',
        type: 'paragraph' as const,
      },
      {
        tag: 'h2' as const,
        text: 'Where to buy LORGAR',
        type: 'heading' as const,
      },
      {
        text: 'This guide outlines how partner and retail availability can be presented as a useful continuation of product and brand content rather than a disconnected destination.',
        type: 'paragraph' as const,
      },
    ],
    category: 'knowledge-base',
    contentType: 'article',
    coverImageKey: 'lorgar-product-closeup-1.jpeg',
    languageCode: 'en',
    publishedAt: '2026-05-01T09:00:00.000Z',
    slug: 'where-to-buy-lorgar-partner-and-retail-availability-guide',
    summary:
      'Where to buy LORGAR: a guide to partner and retail availability for readers moving from editorial content into purchase research.',
    tags: ['where-to-buy', 'partners'],
    title: 'Where to Buy LORGAR: Partner and Retail Availability Guide',
  },
] as const

const ensureSeedMediaDocument = async (
  payload: any,
  {
    alt,
    externalImageURL,
    filename,
    mimeType,
  }: {
    alt: string
    externalImageURL: string
    filename: string
    mimeType: string
  },
) => {
  const existing = await payload.find({
    collection: mediaSlug,
    limit: 1,
    where: {
      filename: {
        equals: filename,
      },
    },
  })
  const mediaDoc = existing.docs[0]

  if (mediaDoc) {
    return payload.update({
      collection: mediaSlug,
      data: {
        alt,
        externalImageURL,
        mimeType,
      },
      id: mediaDoc.id,
    })
  }

  return payload.create({
    collection: mediaSlug,
    data: {
      alt,
      externalImageURL,
      filename,
      mimeType,
    },
    filePath: resolveSeedPublicAssetPath(externalImageURL),
  })
}

export const ensureLorgarFrontendSeed = async (payload: any) => {
  const demoAuthors = await payload.find({
    collection: authorsSlug,
    limit: 1,
    where: {
      name: {
        equals: 'ASBIS Editorial Team',
      },
    },
  })

  let demoAuthorID = demoAuthors.docs[0]?.id

  if (!demoAuthorID) {
    const author = await payload.create({
      collection: authorsSlug,
      data: {
        name: 'ASBIS Editorial Team',
        role: 'Content team',
        shortDescription:
          'Editorial owner for product guides, knowledge base materials, and AI-assisted CMS content tests.',
        slug: 'asbis-editorial-team',
        status: 'active',
      },
    })

    demoAuthorID = author.id
  }

  const seedMediaByKey = Object.fromEntries(
    await Promise.all(
      seedMediaDefinitions.map(async (definition) => [
        definition.filename,
        await ensureSeedMediaDocument(payload, definition),
      ]),
    ),
  )

  for (const definition of seedArticleDefinitions) {
    const existing = await payload.find({
      collection: articlesSlug,
      limit: 1,
      where: {
        slug: {
          equals: definition.slug,
        },
      },
    })
    const coverImage = seedMediaByKey[definition.coverImageKey]
    const data = {
      authors: [demoAuthorID],
      category: definition.category,
      content: richTextDocument(definition.blocks),
      contentType: definition.contentType,
      coverImage: coverImage?.id,
      languageCode: definition.languageCode,
      owner: 'LORGAR Editorial',
      publishedAt: definition.publishedAt,
      seo: {
        description: definition.summary,
        image: coverImage?.id,
        title: definition.title,
      },
      slug: definition.slug,
      status: 'published' as const,
      summary: definition.summary,
      tags: definition.tags.map((tag) => ({ tag })),
      title: definition.title,
      translationGroup: definition.slug,
    }

    if (existing.docs[0]) {
      await payload.update({
        collection: articlesSlug,
        data,
        id: existing.docs[0].id,
      })
    } else {
      await payload.create({
        collection: articlesSlug,
        data,
      })
    }
  }

  return {
    authorID: demoAuthorID,
    articleCount: seedArticleDefinitions.length,
    mediaCount: seedMediaDefinitions.length,
  }
}

export default buildConfig({
  admin: {
    user: usersSlug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' - AI Workbench',
    },
    components: {
      beforeNavLinks: ['/admin/components/AdminNavLinks#AdminNavLinks'],
      beforeDashboard: ['/admin/components/AdminDashboard#AdminDashboard'],
    },
  },
  collections: [
    AIProjectsCollection,
    PromptTemplatesCollection,
    SitesCollection,
    AuthorsCollection,
    BlogTemplatesCollection,
    BlogPostsCollection,
    SiteLinksCollection,
    TestRunsCollection,
    ArticlesCollection,
    Media,
    Users,
  ],
  editor: lexicalEditor(),
  endpoints: [
    aiDocsEndpoint,
    aiFoldersEndpoint,
    askEndpoint,
    generateArticleEndpoint,
    generateImageEndpoint,
    generateVideoEndpoint,
    saveArticleDraftEndpoint,
    translateArticlesEndpoint,
    updateArticleStatusesEndpoint,
    translateUiEndpoint,
    videoStatusEndpoint,
    articleReactionEndpoint,
    newsletterSubscriptionEndpoint,
  ],
  secret: payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
    },
    prodMigrations: process.env.PAYLOAD_RUN_MIGRATIONS === 'true' ? migrations : undefined,
    push: false,
    schemaName: databaseSchemaName,
  }),
  onInit: async (payload) => {
    const adminEmail = process.env.PAYLOAD_ADMIN_EMAIL || 'dev@payloadcms.com'
    const adminPassword = process.env.PAYLOAD_ADMIN_PASSWORD || 'test'
    const users = await payload.find({
      collection: usersSlug,
      limit: 1,
      where: {
        email: {
          equals: adminEmail,
        },
      },
    })

    if (!users.totalDocs) {
      await payload.create({
        collection: usersSlug,
        data: {
          email: adminEmail,
          password: adminPassword,
        },
      })
    }

    for (const [filename, externalImageURL] of Object.entries(plugPlayDemoImages)) {
      await ensureSeedMediaDocument(payload, {
        alt: filename,
        externalImageURL,
        filename,
        mimeType: 'image/jpeg',
      })
    }

    const demoProjects = await payload.find({
      collection: aiProjectsSlug,
      limit: 1,
      where: {
        name: {
          equals: 'AI Docs Workbench Demo',
        },
      },
    })

    let demoProjectID = demoProjects.docs[0]?.id

    if (!demoProjectID) {
      const project = await payload.create({
        collection: aiProjectsSlug,
        data: {
          defaultModel: 'grok-4.3',
          docsFolder: 'all',
          goal: 'Let a non-technical tester ask questions over local product documents, inspect sources, and save validation notes in the admin panel.',
          name: 'AI Docs Workbench Demo',
          owner: 'Content QA',
          status: 'testing',
          successCriteria: [
            {
              criterion: 'Open /ai and preview retrieved sources before calling the model.',
            },
            {
              criterion: 'Open /admin and manage articles, prompts, media, and test runs.',
            },
          ],
        },
      })

      demoProjectID = project.id
    }

    const demoPrompts = await payload.find({
      collection: promptTemplatesSlug,
      limit: 1,
      where: {
        title: {
          equals: 'Document QA starter',
        },
      },
    })

    let demoPromptID = demoPrompts.docs[0]?.id

    if (!demoPromptID) {
      const prompt = await payload.create({
        collection: promptTemplatesSlug,
        data: {
          isEnabled: true,
          maxChunks: 8,
          mode: 'qa',
          systemPrompt:
            'Answer in the same language as the question. Use only the retrieved context. If the answer is not present, say what is missing and list the closest sources.',
          temperature: 0.2,
          title: 'Document QA starter',
          userPrompt:
            'Summarize the answer for a business tester and cite the most relevant files.',
        },
      })

      demoPromptID = prompt.id
    }

    const blogPlannerPrompts = await payload.find({
      collection: promptTemplatesSlug,
      limit: 1,
      where: {
        title: {
          equals: 'Blog and cross-site linking planner',
        },
      },
    })

    if (!blogPlannerPrompts.totalDocs) {
      await payload.create({
        collection: promptTemplatesSlug,
        data: {
          isEnabled: true,
          maxChunks: 6,
          mode: 'draft',
          systemPrompt:
            'Act as a CMS editor. Create blog briefs and link suggestions from the managed Sites, Blog Templates, Blog Posts, Articles, and Site Links collections.',
          tags: [
            {
              tag: 'blog',
            },
            {
              tag: 'cross-site-linking',
            },
          ],
          temperature: 0.3,
          title: 'Blog and cross-site linking planner',
          userPrompt:
            'Draft a blog outline, list required internal links, propose cross-site transitions, and explain why each link belongs in the post.',
        },
      })
    }

    const { authorID: demoAuthorID } = await ensureLorgarFrontendSeed(payload)

    const demoArticles = await payload.find({
      collection: articlesSlug,
      limit: 1,
      where: {
        slug: {
          equals: 'payload-ai-workbench-demo',
        },
      },
    })

    let demoArticleID = demoArticles.docs[0]?.id

    if (!demoArticleID) {
      const article = await payload.create({
        collection: articlesSlug,
        data: {
          authors: [demoAuthorID],
          category: 'knowledge-base',
          content: richTextParagraph({
            text: 'This starter article demonstrates the Payload editor, drafts, media fields, SEO fields, and related content links for a tester-friendly AI CMS workflow.',
          }),
          contentType: 'article',
          languageCode: 'en',
          owner: 'Content QA',
          slug: 'payload-ai-workbench-demo',
          status: 'draft',
          summary: 'A ready-made article for testing the Payload admin editor.',
          title: 'Payload AI Workbench demo article',
          translationGroup: 'payload-ai-workbench-demo',
        },
      })

      demoArticleID = article.id
    }

    const mainSites = await payload.find({
      collection: sitesSlug,
      limit: 1,
      where: {
        slug: {
          equals: 'main-commerce-site',
        },
      },
    })

    let mainSiteID = mainSites.docs[0]?.id

    if (!mainSiteID) {
      const site = await payload.create({
        collection: sitesSlug,
        data: {
          defaultBlogPath: '/resources',
          locale: 'en',
          name: 'Main commerce site',
          notes: 'Primary destination for product and conversion-oriented pages.',
          owner: 'Digital Commerce',
          primaryDomain: 'main.example.com',
          siteRole: 'store',
          slug: 'main-commerce-site',
          status: 'live',
        },
      })

      mainSiteID = site.id
    }

    const hubSites = await payload.find({
      collection: sitesSlug,
      limit: 1,
      where: {
        slug: {
          equals: 'knowledge-hub',
        },
      },
    })

    let hubSiteID = hubSites.docs[0]?.id

    if (!hubSiteID) {
      const site = await payload.create({
        collection: sitesSlug,
        data: {
          defaultBlogPath: '/blog',
          locale: 'en',
          name: 'Knowledge hub',
          notes: 'Blog and education surface used to introduce readers to deeper product pages.',
          owner: 'Content QA',
          primaryDomain: 'blog.example.com',
          siteRole: 'content-hub',
          slug: 'knowledge-hub',
          status: 'live',
        },
      })

      hubSiteID = site.id
    }

    const blogTemplates = await payload.find({
      collection: blogTemplatesSlug,
      limit: 1,
      where: {
        key: {
          equals: 'buyer-guide-cross-site',
        },
      },
    })

    let demoBlogTemplateID = blogTemplates.docs[0]?.id

    if (!demoBlogTemplateID) {
      const blogTemplate = await payload.create({
        collection: blogTemplatesSlug,
        data: {
          aiPrompts: {
            briefPrompt:
              'Turn the business goal, audience, and available source documents into a concise blog brief.',
            linkingPrompt:
              'Suggest contextual links to related articles and approved cross-site transitions. Explain the reader intent for each link.',
            outlinePrompt:
              'Create a practical outline with an intro, selection criteria, proof points, FAQ, and a final CTA.',
          },
          anchorTextGuidance:
            'Use descriptive anchors that match reader intent. Avoid generic anchors like "click here".',
          editorialGoal:
            'Help editors produce buyer-friendly blog posts that connect education content to product or support destinations.',
          key: 'buyer-guide-cross-site',
          relatedContentStrategy:
            'Every post should link to one supporting article, one same-site related blog post when available, and one approved destination on another managed site.',
          requiredCrossSiteLinks: 1,
          requiredInternalLinks: 2,
          seo: {
            keywordGuidance:
              'Include product category terms, problem phrases, and comparison language when it is natural.',
            metaDescriptionPattern:
              'A practical guide to {topic}, with next steps and related resources.',
            metaTitlePattern: '{Topic}: practical buyer guide',
          },
          status: 'active',
          structure: [
            {
              instructions: 'State the reader problem and the outcome of the guide.',
              isRequired: true,
              sectionRole: 'intro',
              sectionTitle: 'Problem and promise',
            },
            {
              instructions: 'List the criteria readers should use before comparing solutions.',
              isRequired: true,
              sectionRole: 'body',
              sectionTitle: 'Selection criteria',
            },
            {
              instructions: 'Add supporting proof, examples, or source-backed notes.',
              isRequired: true,
              sectionRole: 'proof',
              sectionTitle: 'Proof points',
            },
            {
              instructions: 'Offer a contextual handoff to the best destination site.',
              isRequired: true,
              sectionRole: 'related-links',
              sectionTitle: 'Next step links',
            },
          ],
          summaryPattern:
            'Short summary for readers who need to understand the problem, compare options, and continue to the right destination site.',
          templateType: 'guide',
          title: 'Buyer guide with cross-site handoff',
          titlePattern: 'How to choose {product category} for {audience}',
        },
      })

      demoBlogTemplateID = blogTemplate.id
    }

    const blogPosts = await payload.find({
      collection: blogPostsSlug,
      limit: 1,
      where: {
        slug: {
          equals: 'choosing-ai-ready-cms-workflows',
        },
      },
    })

    let demoBlogPostID = blogPosts.docs[0]?.id
    let hasCreatedBlogPost = false

    if (!demoBlogPostID) {
      const blogPost = await payload.create({
        collection: blogPostsSlug,
        data: {
          aiAssist: {
            brief:
              'Create a blog post that explains how an editor can move from document QA to publishable CMS content using approved templates and cross-site links.',
            linkingNotes:
              'Mention the demo article as supporting context and route readers to the main commerce site through the approved transition link.',
            questionsToAnswer: [
              {
                question: 'What should editors prepare before asking AI to draft a post?',
              },
              {
                question: 'How should a blog post link readers to another managed site?',
              },
            ],
            targetKeywords: [
              {
                keyword: 'AI CMS workflow',
              },
              {
                keyword: 'cross-site content linking',
              },
            ],
          },
          audience: 'internal-editor',
          authors: [demoAuthorID],
          category: 'buying-guide',
          content: richTextParagraph({
            text: 'This demo post shows how the blog system, templates, AI briefs, and cross-site transition links work together inside the Payload admin.',
          }),
          owner: 'Content QA',
          relatedArticles: [demoArticleID],
          site: hubSiteID,
          slug: 'choosing-ai-ready-cms-workflows',
          status: 'draft',
          summary:
            'A seeded blog post for validating template-driven blogging and managed cross-site links.',
          tags: [
            {
              tag: 'blog-system',
            },
            {
              tag: 'linking',
            },
          ],
          template: demoBlogTemplateID,
          title: 'Choosing AI-ready CMS workflows',
        },
      })

      demoBlogPostID = blogPost.id
      hasCreatedBlogPost = true
    }

    const siteLinks = await payload.find({
      collection: siteLinksSlug,
      limit: 1,
      where: {
        title: {
          equals: 'Blog guide to commerce destination',
        },
      },
    })

    let demoSiteLinkID = siteLinks.docs[0]?.id

    if (!demoSiteLinkID) {
      const siteLink = await payload.create({
        collection: siteLinksSlug,
        data: {
          aiReview: {
            rationale:
              'Readers who understand the CMS workflow should be handed to the destination site where they can continue with product or conversion content.',
            risk: 'low',
            suggestedBy: 'seed',
          },
          anchorText: 'Continue to the main commerce workflow',
          editorNotes:
            'Use this as the starter example for client-requested transitions and cross-site linking.',
          linkType: 'campaign-transition',
          placement: 'transition-page',
          priority: 10,
          sourceContent: {
            relationTo: blogPostsSlug,
            value: demoBlogPostID,
          },
          sourcePath: '/blog/choosing-ai-ready-cms-workflows',
          sourceSite: hubSiteID,
          status: 'approved',
          targetContent: {
            relationTo: articlesSlug,
            value: demoArticleID,
          },
          targetSite: mainSiteID,
          targetURL: 'https://main.example.com/resources/payload-ai-workbench-demo',
          title: 'Blog guide to commerce destination',
          transitionTemplate: {
            ctaLabel: 'Continue',
            description:
              'You are leaving the knowledge hub for the main site with the practical next steps.',
            headline: 'Continue with the implementation guide',
            mode: 'soft-handoff',
            preserveQueryParams: true,
          },
        },
      })

      demoSiteLinkID = siteLink.id
    }

    if (hasCreatedBlogPost && demoSiteLinkID) {
      await payload.update({
        collection: blogPostsSlug,
        data: {
          linkPlan: [demoSiteLinkID],
        },
        id: demoBlogPostID,
      })
    }

    const demoRuns = await payload.find({
      collection: testRunsSlug,
      limit: 1,
      where: {
        title: {
          equals: 'First tester run',
        },
      },
    })

    if (!demoRuns.totalDocs) {
      await payload.create({
        collection: testRunsSlug,
        data: {
          project: demoProjectID,
          promptTemplate: demoPromptID,
          question: 'What should a tester check first in this workspace?',
          status: 'new',
          title: 'First tester run',
        },
      })
    }
  },
  sharp,
  plugins: [],
})
