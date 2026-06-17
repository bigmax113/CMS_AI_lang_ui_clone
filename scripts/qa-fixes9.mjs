import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000'
const outDir = process.env.QA_OUT_DIR || path.resolve('qa-artifacts/fixes9-local')

await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
const errors = []
page.on('console', (message) => {
  const text = message.text()
  if (message.type() === 'warning' && text.includes('preloaded using link preload in Early Hints')) return
  if (['error', 'warning'].includes(message.type())) errors.push(`${message.type()}: ${text}`)
})
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

await page.goto(`${baseURL}/articles`, { waitUntil: 'networkidle', timeout: 60000 })
await page.screenshot({ fullPage: true, path: path.join(outDir, 'articles.png') })

const header = await page.evaluate(() => {
  const brandLogo = document.querySelector('.lorgar-header__brand .lorgar-brand__logo')
  const brandBlog = document.querySelector('.lorgar-header__brand .lorgar-brand__blog')
  const footerLogo = document.querySelector('.lorgar-footer__logo .lorgar-brand__logo')
  const footerBlog = document.querySelector('.lorgar-footer__logo .lorgar-brand__blog')
  const searchIcon = document.querySelector('.lorgar-header__search .lorgar-header__icon')
  const languageChevron = document.querySelector('.lorgar-header__language .lorgar-header__chevron')
  const cardLinks = Array.from(document.querySelectorAll('.lorgar-blog-card')).map((element) => element.getAttribute('href'))
  const footerLabels = Array.from(document.querySelectorAll('.lorgar-footer__nav a, .lorgar-footer__legal a, .lorgar-footer__legal span')).map((element) =>
    element.textContent?.trim(),
  )
  const indexTitle =
    document.querySelector('.lorgar-blog-cover h1')?.textContent?.trim() ||
    document.querySelector('.lorgar-blog-list h2')?.textContent?.trim() ||
    ''
  const topicCount = document.querySelectorAll('.lorgar-blog-topics a').length
  return {
    blogBadgeCount: document.querySelectorAll('.lorgar-blog-badge').length,
    brandBlogHref: brandBlog?.getAttribute('href'),
    brandLogoHref: brandLogo?.getAttribute('href'),
    cardCount: cardLinks.length,
    cardLinks,
    footerBlogHref: footerBlog?.getAttribute('href'),
    footerLogoHref: footerLogo?.getAttribute('href'),
    footerLabels,
    footerSocialCount: document.querySelectorAll('.lorgar-footer__social a svg').length,
    indexTitle,
    languageChevron: Boolean(languageChevron),
    searchIcon: Boolean(searchIcon),
    topicCount,
  }
})

await page.click('.lorgar-header__nav .lorgar-nav-dropdown:nth-of-type(1) summary')
await page.click('.lorgar-header__nav .lorgar-nav-dropdown:nth-of-type(2) summary')
const openMenus = await page.$$eval('.lorgar-header details[data-lorgar-exclusive-menu][open]', (elements) => elements.length)
await page.screenshot({ fullPage: true, path: path.join(outDir, 'dropdown-exclusive.png') })

const firstCardHref = await page.$eval('.lorgar-blog-card', (element) => element.getAttribute('href'))
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
  page.click('.lorgar-blog-card'),
])
const articleURL = page.url()
const articleStatus = await page.locator('.lorgar-article-main h1').first().isVisible({ timeout: 10000 })
await page.screenshot({ fullPage: true, path: path.join(outDir, 'article-click.png') })

const mobilePage = await browser.newPage({ viewport: { width: 368, height: 900 } })
const mobileErrors = []
mobilePage.on('console', (message) => {
  const text = message.text()
  if (message.type() === 'warning' && text.includes('preloaded using link preload in Early Hints')) return
  if (['error', 'warning'].includes(message.type())) mobileErrors.push(`${message.type()}: ${text}`)
})
mobilePage.on('pageerror', (error) => mobileErrors.push(`pageerror: ${error.message}`))
await mobilePage.goto(`${baseURL}/articles`, { waitUntil: 'networkidle', timeout: 60000 })
await mobilePage.click('.lorgar-header__mobile-menu summary')
await mobilePage.screenshot({ fullPage: true, path: path.join(outDir, 'articles-mobile-menu.png') })
const mobileGeometry = await mobilePage.evaluate(() => {
  const menu = document.querySelector('.lorgar-header__mobile-nav')
  const rect = menu?.getBoundingClientRect()
  const overflowingText = Array.from(document.querySelectorAll('.lorgar-header__mobile-nav a, .lorgar-header__mobile-nav summary')).filter((element) => {
    const htmlElement = element
    return htmlElement.scrollWidth > htmlElement.clientWidth + 1
  }).length

  return {
    bodyScrollWidth: document.body.scrollWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    menuInViewport: Boolean(rect && rect.left >= -1 && rect.right <= window.innerWidth + 1),
    overflowingText,
  }
})
await mobilePage.close()

await browser.close()

const report = {
  articleStatus,
  articleURL,
  baseURL,
  errors,
  firstCardHref,
  header,
  openMenus,
  pass:
    header.blogBadgeCount >= 2 &&
    header.brandLogoHref === 'https://lorgar.com' &&
    header.brandBlogHref === '/articles' &&
    header.footerLogoHref === 'https://lorgar.com' &&
    header.footerBlogHref === '/articles' &&
    header.indexTitle.length > 0 &&
    header.cardCount > 0 &&
    header.cardLinks.every((href) => typeof href === 'string' && href.startsWith('/articles/')) &&
    header.topicCount > 0 &&
    header.searchIcon &&
    header.languageChevron &&
    header.footerSocialCount >= 7 &&
    openMenus === 1 &&
    Boolean(firstCardHref) &&
    articleStatus &&
    mobileGeometry.documentScrollWidth <= mobileGeometry.innerWidth + 1 &&
    mobileGeometry.bodyScrollWidth <= mobileGeometry.innerWidth + 1 &&
    mobileGeometry.menuInViewport &&
    mobileGeometry.overflowingText === 0 &&
    mobileErrors.length === 0 &&
    errors.length === 0,
  mobileErrors,
  mobileGeometry,
}

await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
