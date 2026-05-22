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
  const [hasFailed, setHasFailed] = useState(!src)

  if (hasFailed || !src) {
    return (
      <div className={`public-content__image-missing ${className || ''}`}>
        <strong>Image unavailable</strong>
        <span>{fileName || alt || 'The Media file is missing from storage.'}</span>
        <p>
          On Render free, uploaded files can disappear after redeploy, restart, or spin down. Re-upload
          this image or connect persistent object storage.
        </p>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Payload media URLs can be local, external, or DB data URLs.
    <img alt={alt} className={className} onError={() => setHasFailed(true)} src={src} />
  )
}
