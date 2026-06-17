import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const out = path.resolve('qa-artifacts', 'node-no-docker')
await fs.mkdir(out, { recursive: true })
const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  deviceScaleFactor: 1,
  viewport: { height: 1200, width: 1440 },
})

const errors = []
const badResponses = []
page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type())) {
    errors.push(`${message.type()}: ${message.text()}`)
  }
})
page.on('response', (response) => {
  if (response.status() >= 400) {
    badResponses.push({
      status: response.status(),
      url: response.url(),
    })
  }
})

await page.goto(`${baseURL}/articles`, {
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

await page.locator('a[href^="/articles/"]').first().click()
await page.waitForURL('**/articles/**', { timeout: 45000 })
await page.waitForLoadState('networkidle', { timeout: 45000 })
await page.locator('h1').first().waitFor({ state: 'visible', timeout: 45000 })
const articleHeading = (await page.locator('h1').first().textContent())?.trim()
if (!articleHeading) {
  throw new Error('Article page opened, but h1 is empty')
}
await page.screenshot({ fullPage: true, path: path.join(out, 'article-detail.png') })
const articleUrl = page.url()

await page.goto(`${baseURL}/platform`, {
  timeout: 45000,
  waitUntil: 'networkidle',
})
await page.screenshot({ fullPage: true, path: path.join(out, 'platform.png') })

console.log(
  JSON.stringify(
    {
      articleLinks,
      articleHeading,
      articleUrl,
      artifactDir: out,
      baseURL,
      badResponses,
      errors,
    },
    null,
    2,
  ),
)

await browser.close()
