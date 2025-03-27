'use client'

import { useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState, Suspense } from 'react'

// Separate component that uses useSearchParams
function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const message = searchParams.get('message')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const supabase = createClientComponentClient()

  const handleResendConfirmation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    })

    if (error) {
      console.error('Error resending confirmation:', error)
      setStatus('error')
    } else {
      setStatus('success')
    }
  }

  return (
    <div className="max-w-md w-full bg-black/50 p-6 rounded-lg border border-white/10">
      <h1 className="text-xl font-bold mb-4">Authentication Error</h1>
      <div className="mb-6 text-red-400">
        {message || 'An error occurred during authentication.'}
      </div>

      {error === 'access_denied' && message?.includes('expired') && (
        <form onSubmit={handleResendConfirmation} className="space-y-4">
          <p className="text-sm text-gray-400">
            Your confirmation link has expired. Enter your email to receive a new confirmation link:
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full p-2 bg-black/50 border border-white/10 rounded"
            required
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            {status === 'loading' ? 'Sending...' : 'Resend Confirmation Email'}
          </button>
          {status === 'success' && (
            <p className="text-green-400 text-sm">
              New confirmation email sent! Please check your inbox.
            </p>
          )}
          {status === 'error' && (
            <p className="text-red-400 text-sm">
              Failed to send confirmation email. Please try again.
            </p>
          )}
        </form>
      )}

      <div className="mt-6 text-center">
        <a
          href="/"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  )
}

// Main component with Suspense boundary
export default function AuthError() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="max-w-md w-full bg-black/50 p-6 rounded-lg border border-white/10">
          <h1 className="text-xl font-bold mb-4">Loading...</h1>
        </div>
      }>
        <AuthErrorContent />
      </Suspense>
    </div>
  )
} 