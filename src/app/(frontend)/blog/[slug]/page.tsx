import { notFound } from 'next/navigation'

import { blogPostPublicPath } from '@/lib/publicURLs'
import {
  AuthorByline,
  Breadcrumbs,
  PublicChrome,
  RichText,
  StructuredData,
  createSEOPageMetadata,
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

  const site = isSite(post.site) ? post.site : null

  return createSEOPageMetadata({
    canonicalURL: post.canonicalURL,
    description: post.seo?.description || post.summary,
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
  const kicker = [site?.name, formatDate(post.publishedAt) || post.category].filter(Boolean).join(' / ')
  const postPath = blogPostPublicPath({ site, slug: post.slug }) || '/blog'

  return (
    <PublicChrome backgroundImage={post.coverImage} kicker={kicker || 'Blog post'} title={post.title}>
      <StructuredData
        authors={post.authors}
        content={post.content}
        contentType="BlogPosting"
        description={post.seo?.description || post.summary}
        image={post.seo?.image || post.coverImage}
        publishedAt={post.publishedAt}
        title={post.seo?.title || post.title}
        updatedAt={post.updatedAt}
        url={blogPostPublicPath({ site, slug: post.slug })}
      />
      <article className="public-content__article">
        <Breadcrumbs
          items={[
            { href: '/', label: 'Home' },
            { href: '/blog', label: 'Blog' },
            { href: postPath, label: post.title },
          ]}
        />
        <AuthorByline authors={post.authors} />
        {post.summary ? <p className="public-content__summary">{post.summary}</p> : null}
        <RichText content={post.content} />
      </article>
    </PublicChrome>
  )
}
