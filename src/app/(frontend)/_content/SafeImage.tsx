'use client'

import { useState } from 'react'

export const SafeImage = ({
  alt,
  className,
  fileName,
  src,
}: {
  alt: string
  className?: string
  fileName?: null | string
  src?: null | string
}) => {
  const [failedSrc, setFailedSrc] = useState<null | string>(null)
  const hasFailed = !src || failedSrc === src

  if (hasFailed || !src) {
    return (
      <div className={`public-content__image-missing ${className || ''}`}>
        <strong>Image unavailable</strong>
        <span>{fileName || alt || 'The Media file is missing from storage.'}</span>
        <p>
          The media file is missing from cloud media storage or from a legacy local upload. Re-upload
          this file or run the media migration.
        </p>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Payload media URLs can be local, external, or DB data URLs.
    <img alt={alt} className={className} onError={() => setFailedSrc(src)} src={src} />
  )
}
