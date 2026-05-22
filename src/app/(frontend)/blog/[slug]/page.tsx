import { notFound } from 'next/navigation'

import {
  PublicChrome,
  PublicImage,
  RichText,
  findPublishedBlogPostBySlug,
  formatDate,
  isSite,
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

  return {
    description: post.seo?.description || post.summary || undefined,
    title: `${post.seo?.title || post.title} - CMS AI`,
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await findPublishedBlogPostBySlug(slug)

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
