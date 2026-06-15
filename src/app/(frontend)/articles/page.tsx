import {
  ContentCard,
  PublicChrome,
  articleHref,
  createSEOPageMetadata,
  formatDate,
  listPublishedArticles,
  publicSummaryText,
} from '../_content/contentHelpers'

export const dynamic = 'force-dynamic'

export const metadata = createSEOPageMetadata({
  description: 'Published articles, guides, news, and product content.',
  path: '/articles',
  title: 'All Articles',
  type: 'website',
})

export default async function ArticlesIndexPage() {
  const articles = await listPublishedArticles()

  return (
    <PublicChrome kicker="Published content" title="All Articles">
      <section className="public-content__section">
        {articles.length ? (
          <div className="public-content__grid">
            {articles.map((article) => (
              <ContentCard
                href={articleHref(article)}
                image={article.coverImage}
                key={article.id}
                label={formatDate(article.publishedAt, article.languageCode) || article.contentType || article.category || 'Article'}
                summary={publicSummaryText({ content: article.content, summary: article.summary })}
                title={article.title}
              />
            ))}
          </div>
        ) : (
          <p className="public-content__empty">Опубликованных статей пока нет.</p>
        )}
      </section>
    </PublicChrome>
  )
}
