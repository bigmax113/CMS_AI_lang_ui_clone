'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

type LorgarSubscribeFormProps = {
  languageCode: string
}

export const LorgarSubscribeForm = ({ languageCode }: LorgarSubscribeFormProps) => {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    const form = event.currentTarget
    const formData = new FormData(form)
    const email = String(formData.get('email') || '').trim()

    try {
      const response = await fetch('/api/newsletter-subscriptions', {
        body: JSON.stringify({
          email,
          languageCode,
          sourceURL: window.location.href,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const result = (await response.json()) as { error?: string; ok?: boolean }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Subscription was not saved.')
      }

      form.reset()
      setMessage('Subscription saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Subscription was not saved.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <input aria-label="Email address" name="email" placeholder="Enter your email" required type="email" />
      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Saving...' : 'Subscribe'}
      </button>
      {message ? <p className="lorgar-subscribe__message">{message}</p> : null}
    </form>
  )
}
