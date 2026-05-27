import Link from 'next/link'
import React from 'react'

export const AdminNavLinks: React.FC = () => {
  return (
    <div
      aria-label="AI Workbench shortcut"
      style={{
        borderBottom: '1px solid var(--theme-elevation-100)',
        margin: '0 0 18px',
        padding: '0 0 18px',
      }}
    >
      <Link
        href="/ai"
        style={{
          alignItems: 'center',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 6,
          color: 'var(--theme-text)',
          display: 'flex',
          fontWeight: 600,
          justifyContent: 'space-between',
          padding: '12px 14px',
          textDecoration: 'none',
        }}
      >
        <span>Open AI Workbench</span>
        <span aria-hidden="true">/ai</span>
      </Link>
    </div>
  )
}

export default AdminNavLinks
