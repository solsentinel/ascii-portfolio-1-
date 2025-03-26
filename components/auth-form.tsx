"use client"

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

interface AuthFormProps {
  onAuthSuccess?: () => void;
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const supabase = createClientComponentClient()
  const [showAuth, setShowAuth] = useState(true)

  // Listen for auth state changes to close the modal
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event)
      
      // Close modal on successful sign in or sign up
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        console.log('User logged in:', session.user.email)
        onAuthSuccess && onAuthSuccess()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, onAuthSuccess])

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-black/70 backdrop-blur-sm rounded-lg border border-white/10">
      <h2 className="text-xl font-bold mb-4 text-center text-cyan-400" style={{ fontFamily: "var(--font-pixel)" }}>
        PROMIXEL ACCESS
      </h2>
      <p className="text-gray-300 text-sm mb-6 text-center">
        Sign in or create an account to generate pixel art
      </p>
      
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          style: {
            button: {
              borderRadius: '4px',
              backgroundColor: '#2dd4bf',
              color: 'black',
              border: 'none',
              fontFamily: 'var(--font-mono)',
            },
            input: {
              borderRadius: '4px',
              backgroundColor: '#0f111a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontFamily: 'var(--font-mono)',
            },
            label: {
              color: '#94a3b8',
              fontFamily: 'var(--font-pixel)',
              fontSize: '0.75rem',
            },
            anchor: {
              color: '#22d3ee',
            },
            message: {
              color: '#f43f5e',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
            },
          },
          className: {
            container: 'auth-container',
            button: 'auth-button',
            input: 'auth-input',
            label: 'auth-label',
            message: 'auth-message',
          },
        }}
        theme="dark"
        providers={[]}
        redirectTo={`${window.location.origin}/auth/callback`}
      />
    </div>
  )
} 