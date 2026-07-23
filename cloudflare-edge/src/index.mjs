const FRONTEND_ORIGIN = 'https://lorgar-blog-work.onrender.com'
const PAYLOAD_ORIGIN = 'https://lorgar-cms-work.onrender.com'
const EDGE_NAME = 'lorgar-blog-edge'

const isSafeMethod = (method) => method === 'GET' || method === 'HEAD'

const isStaticAsset = (pathname) =>
  pathname.startsWith('/_next/static/') ||
  pathname.startsWith('/lorgar-figma/') ||
  pathname.startsWith('/seo/') ||
  /\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|webp|woff2?)$/i.test(pathname)

const isPreviewRequest = (url, request) =>
  url.searchParams.has('preview') ||
  url.searchParams.has('token') ||
  request.headers.has('rsc') ||
  request.headers.has('next-router-state-tree') ||
  request.headers.has('next-router-prefetch')

const isDocumentRequest = (url, request) =>
  request.headers.get('accept')?.includes('text/html') &&
  !url.searchParams.has('_rsc') &&
  !isPreviewRequest(url, request)

const cacheTTL = (url, request) => {
  if (request.method !== 'GET') {
    return 0
  }

  if (url.pathname.startsWith('/api/') || isPreviewRequest(url, request)) {
    return 0
  }

  if (isStaticAsset(url.pathname)) {
    return 60 * 60 * 24 * 30
  }

  return isDocumentRequest(url, request) ? 60 : 0
}

const cacheKeyFor = (request) => {
  const headers = new Headers()
  const accept = request.headers.get('accept')
  const acceptLanguage = request.headers.get('accept-language')

  if (accept) headers.set('accept', accept)
  if (acceptLanguage) headers.set('accept-language', acceptLanguage)

  return new Request(request.url, {
    headers,
    method: 'GET',
  })
}

const originFor = (pathname) => (pathname.startsWith('/api/') ? PAYLOAD_ORIGIN : FRONTEND_ORIGIN)

const rewriteLocation = (location, requestURL) => {
  if (!location) {
    return location
  }

  const publicOrigin = new URL(requestURL).origin

  return location
    .replace(FRONTEND_ORIGIN, publicOrigin)
    .replace(PAYLOAD_ORIGIN, publicOrigin)
}

const proxyRequest = async (request, url) => {
  const origin = originFor(url.pathname)
  const originURL = new URL(`${url.pathname}${url.search}`, origin)
  const headers = new Headers(request.headers)

  headers.set('x-forwarded-host', url.host)
  headers.set('x-forwarded-proto', 'https')
  headers.set('x-lorgar-edge', EDGE_NAME)

  const response = await fetch(originURL, {
    body: isSafeMethod(request.method) ? undefined : request.body,
    headers,
    method: request.method,
    redirect: 'manual',
  })
  const responseHeaders = new Headers(response.headers)
  const location = responseHeaders.get('location')

  if (location) {
    responseHeaders.set('location', rewriteLocation(location, request.url))
  }

  responseHeaders.set('x-lorgar-edge', EDGE_NAME)
  responseHeaders.set('x-lorgar-origin', new URL(origin).host)

  return new Response(request.method === 'HEAD' ? null : response.body, {
    headers: responseHeaders,
    status: response.status,
    statusText: response.statusText,
  })
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname === '/_edge/health') {
      return Response.json({
        database: 'Render PostgreSQL through Payload',
        edge: EDGE_NAME,
        frontendOrigin: FRONTEND_ORIGIN,
        ok: true,
        payloadOrigin: PAYLOAD_ORIGIN,
      })
    }

    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      const adminURL = new URL(`${url.pathname}${url.search}`, PAYLOAD_ORIGIN)
      return Response.redirect(adminURL, 307)
    }

    const ttl = cacheTTL(url, request)
    const cacheKey = ttl ? cacheKeyFor(request) : null

    if (cacheKey) {
      const cached = await caches.default.match(cacheKey)

      if (cached) {
        const cachedHeaders = new Headers(cached.headers)
        cachedHeaders.set('x-lorgar-edge-cache', 'HIT')

        return new Response(request.method === 'HEAD' ? null : cached.body, {
          headers: cachedHeaders,
          status: cached.status,
          statusText: cached.statusText,
        })
      }
    }

    let response

    try {
      response = await proxyRequest(request, url)
    } catch {
      return Response.json(
        {
          error: 'The accepted Render origin is temporarily unavailable.',
          ok: false,
        },
        {
          headers: {
            'cache-control': 'no-store',
            'x-lorgar-edge': EDGE_NAME,
          },
          status: 502,
        },
      )
    }

    if (cacheKey && response.ok) {
      const cacheHeaders = new Headers(response.headers)

      cacheHeaders.delete('set-cookie')
      cacheHeaders.set(
        'cache-control',
        isStaticAsset(url.pathname)
          ? `public, max-age=${ttl}, immutable`
          : `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=300`,
      )
      cacheHeaders.set('x-lorgar-edge-cache', 'MISS')

      const cacheableResponse = new Response(response.body, {
        headers: cacheHeaders,
        status: response.status,
        statusText: response.statusText,
      })

      ctx.waitUntil(caches.default.put(cacheKey, cacheableResponse.clone()))
      return cacheableResponse
    }

    response.headers.set('cache-control', response.headers.get('cache-control') || 'no-store')
    response.headers.set('x-lorgar-edge-cache', 'BYPASS')

    return response
  },
}
