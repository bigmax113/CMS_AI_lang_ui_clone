import React from 'react'

import type { Metadata } from 'next'

import { publicBaseURL } from '@/lib/publicURLs'
import './styles.css'

const fallbackBaseURL = 'https://cms-ai.onrender.com'

export const metadata: Metadata = {
  description: 'Payload AI Workbench for document QA, editor testing, and admin validation.',
  metadataBase: new URL(publicBaseURL() || fallbackBaseURL),
  title: 'Payload AI Workbench',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
