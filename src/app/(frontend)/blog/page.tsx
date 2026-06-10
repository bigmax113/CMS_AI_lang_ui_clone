import {
  ContentCard,
  PublicChrome,
  blogPostHref,
  createSEOPageMetadata,
  formatDate,
  isSite,
  listPublishedBlogPosts,
} from '../_content/contentHelpers'

export const dynamic = 'force-dynamic'

export const metadata = createSEOPageMetadata({
  description: 'Published blog posts, guides, and product stories.',
  path: '/blog',
  title: 'Blog',
  type: 'website',
})

export default async function BlogIndexPage() {
  const posts = await listPublishedBlogPosts()

  return (
    <PublicChrome kicker="Published content" title="Blog">
      <section className="public-content__section">
        {posts.length ? (
          <div className="public-content__grid">
            {posts.map((post) => {
              const site = isSite(post.site) ? post.site : null
              const label = [site?.name, formatDate(post.publishedAt) || post.category].filter(Boolean).join(' / ')

              return (
                <ContentCard
                  href={blogPostHref(post)}
                  image={post.coverImage}
                  key={post.id}
                  label={label || 'Blog post'}
                  summary={post.summary}
                  title={post.title}
                />
              )
            })}
          </div>
        ) : (
          <p className="public-content__empty">Опубликованных постов пока нет.</p>
        )}
      </section>
    </PublicChrome>
  )
}
