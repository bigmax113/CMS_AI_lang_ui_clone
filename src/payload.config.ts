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
    prodMigrations: migrations,
    push: process.env.PAYLOAD_DB_PUSH !== 'false',
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
      const media = await payload.find({
        collection: mediaSlug,
        limit: 1,
        where: {
          filename: {
            equals: filename,
          },
        },
      })
      const mediaDoc = media.docs[0]

      if (mediaDoc && mediaDoc.externalImageURL !== externalImageURL) {
        await payload.update({
          collection: mediaSlug,
          data: {
            externalImageURL,
          },
          id: mediaDoc.id,
        })
      }
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
