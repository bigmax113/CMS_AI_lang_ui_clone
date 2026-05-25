import { ContentCard, PublicChrome, articleHref, formatDate, listPublishedArticles } from '../_content/contentHelpers'

export const dynamic = 'force-dynamic'

export const metadata = {
  description: 'Published CMS AI content materials.',
  title: 'Content - CMS AI',
}

export default async function ArticlesIndexPage() {
  const articles = await listPublishedArticles()

  return (
    <PublicChrome kicker="Published content" title="Content">
      <section className="public-content__section">
        {articles.length ? (
          <div className="public-content__grid">
            {articles.map((article) => (
              <ContentCard
                href={articleHref(article)}
                key={article.id}
                label={formatDate(article.publishedAt) || article.contentType || article.category || 'Article'}
                summary={article.summary}
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
