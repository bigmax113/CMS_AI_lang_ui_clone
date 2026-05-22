import { notFound } from 'next/navigation'

import {
  PublicChrome,
  PublicImage,
  RichText,
  findPublishedBlogPostBySitePath,
  formatDate,
  isSite,
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

  return {
    description: post.seo?.description || post.summary || undefined,
    title: `${post.seo?.title || post.title} - CMS AI`,
  }
}

export default async function SiteBlogPostPage({ params }: PageProps) {
  const { segments, siteSlug } = await params
  const post = await findPublishedBlogPostBySitePath({ segments, siteSlug })

  if (!post) {
    notFound()
  }

  const site = isSite(post.site) ? post.site : null
  const kicker = [site?.name, formatDate(post.publishedAt) || post.category].filter(Boolean).join(' / ')

  return (
    <PublicChrome kicker={kicker || 'Blog post'} title={post.title}>
      <article className="public-content__article">
        {post.summary ? <p className="public-content__summary">{post.summary}</p> : null}
        {post.coverImage ? (
          <PublicImage alt={post.title} className="public-content__cover" media={post.coverImage} />
        ) : null}
        <RichText content={post.content} />
      </article>
    </PublicChrome>
  )
}
