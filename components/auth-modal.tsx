"use client"

import { useEffect, useState } from 'react'
import AuthForm from './auth-form'

interface AuthModalProps {
  show: boolean
  onClose: () => void
}

export default function AuthModal({ show, onClose }: AuthModalProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button 
          className="absolute -top-10 right-0 text-white bg-black/50 hover:bg-black/70 rounded-full p-1 w-8 h-8 flex items-center justify-center"
          onClick={onClose}
        >
          ✕
        </button>
        <AuthForm />
      </div>
    </div>
  )
} 