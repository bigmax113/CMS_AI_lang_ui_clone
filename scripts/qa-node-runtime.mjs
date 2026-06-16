import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const out = path.resolve('qa-artifacts', 'node-no-docker')
await fs.mkdir(out, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  deviceScaleFactor: 1,
  viewport: { height: 1200, width: 1440 },
})

const errors = []
page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type())) {
    errors.push(`${message.type()}: ${message.text()}`)
  }
})

await page.goto('http://localhost:3000/articles', {
  timeout: 45000,
  waitUntil: 'networkidle',
})
await page.screenshot({ fullPage: true, path: path.join(out, 'articles-list.png') })

const articleLinks = await page.locator('a[href^="/articles/"]').evaluateAll((links) =>
  links.slice(0, 8).map((link) => ({
    href: link.getAttribute('href'),
    text: link.textContent?.trim(),
  })),
)

if (!articleLinks.length) {
  throw new Error('No article links found on /articles')
}

const firstArticleTitle = articleLinks[0]?.text || ''
await page.locator('a[href^="/articles/"]').first().click()
await page.waitForLoadState('networkidle', { timeout: 45000 })
await page.waitForFunction(
  (expected) => {
    const h1 = document.querySelector('h1')
    return Boolean(h1 && expected && h1.textContent?.includes(expected))
  },
  firstArticleTitle.split('From May')[0].replace(/^.*?2026/, '').trim() || 'LORGAR Powers',
  { timeout: 45000 },
)
await page.screenshot({ fullPage: true, path: path.join(out, 'article-detail.png') })
const articleUrl = page.url()

await page.goto('http://localhost:3000/platform', {
  timeout: 45000,
  waitUntil: 'networkidle',
})
await page.screenshot({ fullPage: true, path: path.join(out, 'platform.png') })

console.log(
  JSON.stringify(
    {
      articleLinks,
      articleUrl,
      artifactDir: out,
      errors,
    },
    null,
    2,
  ),
)

await browser.close()
