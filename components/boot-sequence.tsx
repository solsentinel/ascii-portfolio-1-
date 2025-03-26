"use client"

import { useEffect, useState } from "react"

const bootMessages = [
  "Initializing system...",
  "Loading pixel rendering engine...",
  "Connecting to RetroFusion API...",
  "Calibrating pixel matrices...",
  "Loading color palettes...",
  "Initializing retro filters...",
  "Booting up terminal interface...",
]

export default function BootSequence() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  useEffect(() => {
    if (currentMessageIndex < bootMessages.length) {
      const timer = setTimeout(() => {
        setCurrentMessageIndex((prev) => prev + 1)
      }, 400)

      return () => clearTimeout(timer)
    }
  }, [currentMessageIndex])

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-2xl bg-black/70 p-8 rounded-md border border-primary/30 font-mono text-primary">
        <div className="mb-8 text-center">
          <pre className="text-sm sm:text-base md:text-xl whitespace-pre overflow-x-auto font-mono">
            {`
  ██████╗ ██████╗  ██████╗ ███╗   ███╗██╗██╗  ██╗███████╗██╗     
  ██╔══██╗██╔══██╗██╔═══██╗████╗ ████║██║╚██╗██╔╝██╔════╝██║     
  ██████╔╝██████╔╝██║   ██║██╔████╔██║██║ ╚███╔╝ █████╗  ██║     
  ██╔═══╝ ██╔══██╗██║   ██║██║╚██╔╝██║██║ ██╔██╗ ██╔══╝  ██║     
  ██║     ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║██║██╔╝ ██╗███████╗███████╗
  ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═╝╚══════╝╚══════╝
                                                                  
`}
          </pre>
        </div>

        <div className="space-y-3">
          {bootMessages.slice(0, currentMessageIndex).map((message, index) => (
            <div key={index} className="flex">
              <span className="text-primary mr-2 font-mono text-lg">&gt;</span>
              <span className="text-foreground/90 font-mono text-lg leading-relaxed">{message}</span>
              {index === currentMessageIndex - 1 && index !== bootMessages.length - 1 && (
                <span className="ml-1 cursor-blink text-lg">_</span>
              )}
            </div>
          ))}

          {currentMessageIndex === bootMessages.length && (
            <div className="flex mt-4">
              <span className="text-primary mr-2 font-mono text-lg">&gt;</span>
              <span className="typing-animation text-foreground/90 font-mono text-lg leading-relaxed font-semibold">
                Boot sequence complete. Promixel pixel art generator ready.
              </span>
              <span className="cursor-blink text-lg">_</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

