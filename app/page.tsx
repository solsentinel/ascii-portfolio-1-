"use client"

import { useEffect, useState } from "react"
import Terminal from "@/components/terminal"
import BootSequence from "@/components/boot-sequence"
import { CRTToggle } from "@/components/crt-toggle"
import PixelGallery from "@/components/pixel-gallery"
import Testimonials from "@/components/testimonials"

export default function Home() {
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setBooting(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{
          backgroundImage:
            'url("https://ideogram.ai/assets/image/lossless/response/sovtfre8Qi6iHyHJ0ZGreg")',
          backgroundPosition: "center center",
          backgroundSize: "cover",
          filter: "contrast(1.05) brightness(0.9)",
        }}
        aria-hidden="true"
      />
      
      {/* Overlay gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40 z-0" />

      <div className="absolute top-4 right-4 z-50">
        <CRTToggle />
      </div>

      <div className="container mx-auto px-4 py-8 min-h-screen relative z-10">
        {booting ? <BootSequence /> : (
          <>
            <Terminal />
            <PixelGallery />
            <Testimonials />
            <div className="pb-10" /> {/* Bottom padding for scrolling */}
          </>
        )}
      </div>
    </main>
  )
}

