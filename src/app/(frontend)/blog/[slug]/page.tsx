import { notFound } from 'next/navigation'

import { blogPostPublicPath } from '@/lib/publicURLs'
import {
  ArticleMetaLine,
  Breadcrumbs,
  PublicChrome,
  RichText,
  StructuredData,
  createSEOPageMetadata,
  findPublishedBlogPostBySlug,
  isSite,
  publicSummaryText,
} from '../../_content/contentHelpers'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export const generateMetadata = async ({ params }: PageProps) => {
  const { slug } = await params
  const post = await findPublishedBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Blog post not found - CMS AI',
    }
  }

  const site = isSite(post.site) ? post.site : null
  const summary = publicSummaryText({ content: post.content, summary: post.summary })

  return createSEOPageMetadata({
    canonicalURL: post.canonicalURL,
    description: post.seo?.description || summary,
    image: post.seo?.image || post.coverImage,
    path: blogPostPublicPath({ site, slug: post.slug }),
    title: post.seo?.title || post.title,
  })
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await findPublishedBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const site = isSite(post.site) ? post.site : null
  const kicker = [site?.name, post.category].filter(Boolean).join(' / ')
  const postPath = blogPostPublicPath({ site, slug: post.slug }) || '/blog'
  const summary = publicSummaryText({ content: post.content, summary: post.summary })

  return (
    <PublicChrome
      backgroundImage={post.coverImage}
      kicker={kicker || 'Blog post'}
      meta={<ArticleMetaLine authors={post.authors} publishedAt={post.publishedAt} />}
      title={post.title}
    >
      <StructuredData
        authors={post.authors}
        content={post.content}
        contentType="BlogPosting"
        description={post.seo?.description || summary}
        image={post.seo?.image || post.coverImage}
        publishedAt={post.publishedAt}
        title={post.seo?.title || post.title}
        updatedAt={post.updatedAt}
        url={blogPostPublicPath({ site, slug: post.slug })}
      />
      <article className="public-content__article">
        <Breadcrumbs
          items={[
            { href: '/blog', label: 'Blog' },
            { href: '/articles', label: 'All Articles' },
            { href: postPath, label: post.title },
          ]}
        />
        {summary ? <p className="public-content__summary">{summary}</p> : null}
        <RichText content={post.content} />
      </article>
    </PublicChrome>
  )
}
