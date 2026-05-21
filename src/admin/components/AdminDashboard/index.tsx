import React from 'react'

const quickLinks = [
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
    description: 'Create template-driven posts with AI briefs, SEO, and link plans.',
    href: '/admin/collections/blog-posts',
    label: 'Blog Posts',
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
    value: '3',
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
          <a className="custom-admin-dashboard__link" href={item.href} key={item.href}>
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

export default AdminDashboard
