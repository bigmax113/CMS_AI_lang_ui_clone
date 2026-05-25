import React from 'react'
import Link from 'next/link'

const quickLinks = [
  {
    description: 'Open the connected AI workspace for RAG tests, media generation, and UI translation.',
    href: '/ai',
    label: 'AI Workbench',
  },
  {
    description: 'Upload PDFs, DOCX, Markdown, TXT, XML, and XLIFF files for RAG testing.',
    href: '/admin/collections/media',
    label: 'RAG Documents',
  },
  {
    description: 'Manage goals, source folders, model defaults, and acceptance criteria.',
    href: '/admin/collections/ai-projects',
    label: 'AI Projects',
  },
  {
    description: 'Reuse QA, audit, draft, blog planning, and linking prompts.',
    href: '/admin/collections/prompt-templates',
    label: 'Prompt Templates',
  },
  {
    description: 'Save tester questions, model answers, source files, and review notes.',
    href: '/admin/collections/test-runs',
    label: 'Test Runs',
  },
  {
    description: 'Create unified materials with authors, product blocks, video, FAQ, SEO, and AI briefs.',
    href: '/admin/collections/articles',
    label: 'Content / Articles',
  },
  {
    description: 'Manage author photos, names, roles, and public descriptions.',
    href: '/admin/collections/authors',
    label: 'Authors',
  },
  {
    description: 'Legacy template-driven posts kept for existing blog URLs and link plans.',
    href: '/admin/collections/blog-posts',
    label: 'Legacy Blog Posts',
  },
  {
    description: 'Approve anchors, transition copy, redirects, and cross-site handoffs.',
    href: '/admin/collections/site-links',
    label: 'Site Links',
  },
  {
    description: 'Track managed domains, locales, roles, owners, and blog paths.',
    href: '/admin/collections/sites',
    label: 'Sites',
  },
]

const metrics = [
  {
    label: 'AI surfaces',
    value: '4',
  },
  {
    label: 'CMS systems',
    value: '4',
  },
  {
    label: 'Draft autosave',
    value: '1.5s',
  },
]

export const AdminDashboard = () => {
  return (
    <section className="custom-admin-dashboard" aria-label="Custom admin overview">
      <div className="custom-admin-dashboard__intro">
        <div>
          <p className="custom-admin-dashboard__eyebrow">Payload AI Workbench</p>
          <h1>Editorial control room</h1>
          <p>
            A focused admin workspace for AI-assisted document QA, prompt reuse, blog
            templates, and managed cross-site linking.
          </p>
          <div className="custom-admin-dashboard__actions">
            <Link className="custom-admin-dashboard__primary-action" href="/ai">
              Open AI Workbench
            </Link>
            <Link className="custom-admin-dashboard__secondary-action" href="/admin/collections/media">
              Upload RAG documents
            </Link>
          </div>
        </div>
        <div className="custom-admin-dashboard__metrics" aria-label="Admin workspace metrics">
          {metrics.map((metric) => (
            <div className="custom-admin-dashboard__metric" key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="custom-admin-dashboard__grid">
        {quickLinks.map((item) => (
          <Link className="custom-admin-dashboard__link" href={item.href} key={item.href}>
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default AdminDashboard
