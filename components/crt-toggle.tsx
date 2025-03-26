"use client"

import { useState, useEffect } from 'react'
import { Monitor } from 'lucide-react'

export default function CrtToggle() {
  const [isCrt, setIsCrt] = useState(true)

  useEffect(() => {
    // Load state from localStorage on client side
    const savedState = localStorage.getItem('crt-effect')
    if (savedState !== null) {
      setIsCrt(savedState === 'true')
    } else {
      // Default to on if not set
      setIsCrt(true)
    }
  }, [])

  useEffect(() => {
    // Apply/remove CRT class to document body when state changes
    if (isCrt) {
      document.documentElement.classList.add('crt')
    } else {
      document.documentElement.classList.remove('crt')
    }
    
    // Save state to localStorage
    localStorage.setItem('crt-effect', isCrt.toString())
  }, [isCrt])

  return (
    <button
      onClick={() => setIsCrt(!isCrt)}
      className="fixed top-2 right-2 z-50 bg-black/60 backdrop-blur-sm p-2 rounded-full border border-white/20 hover:bg-black/80 transition-colors"
      title={isCrt ? "Disable CRT Effect" : "Enable CRT Effect"}
    >
      <Monitor className={`w-5 h-5 ${isCrt ? 'text-green-400' : 'text-gray-400'}`} />
      <span className="sr-only">{isCrt ? "Disable CRT Effect" : "Enable CRT Effect"}</span>
    </button>
  )
} 