import { notFound } from 'next/navigation'

import { blogPostPublicPath } from '@/lib/publicURLs'
import {
  ArticleMetaLine,
  PublicChrome,
  PublicImage,
  RichText,
  StructuredData,
  createSEOPageMetadata,
  findPublishedBlogPostBySitePath,
  isSite,
  publicSummaryText,
} from '../../../_content/contentHelpers'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{
    segments: string[]
    siteSlug: string
  }>
}

export const generateMetadata = async ({ params }: PageProps) => {
  const { segments, siteSlug } = await params
  const post = await findPublishedBlogPostBySitePath({ segments, siteSlug })

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
    title: `${post.seo?.title || post.title} - CMS AI`,
  })
}

export default async function SiteBlogPostPage({ params }: PageProps) {
  const { segments, siteSlug } = await params
  const post = await findPublishedBlogPostBySitePath({ segments, siteSlug })

  if (!post) {
    notFound()
  }

  const site = isSite(post.site) ? post.site : null
  const kicker = [site?.name, post.category].filter(Boolean).join(' / ')
  const summary = publicSummaryText({ content: post.content, summary: post.summary })

  return (
    <PublicChrome
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
        {summary ? <p className="public-content__summary">{summary}</p> : null}
        {post.coverImage ? (
          <PublicImage alt={post.title} className="public-content__cover" media={post.coverImage} />
        ) : null}
        <RichText content={post.content} />
      </article>
    </PublicChrome>
  )
}
