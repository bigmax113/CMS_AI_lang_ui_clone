import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Payload AI Workbench for document QA, editor testing, and admin validation.',
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
