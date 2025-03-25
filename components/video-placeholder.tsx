"use client"

export default function VideoPlaceholder() {
  // ASCII art representing a video player with pixel art style
  return (
    <div className="w-full h-full flex items-center justify-center bg-black p-4">
      <pre className="text-xs sm:text-sm font-mono text-center whitespace-pre overflow-hidden">
        <span className="text-cyan-400">
{`
  ┌─────────────────────────────────────────┐
  │                                         │
  │                                         │
  │                                         │
  │            ┌───────────────┐            │
  │            │               │            │
  │            │   PROMIXEL    │            │
  │            │   DEMO VIDEO  │            │
  │            │               │            │
  │            │      ▶️        │            │
  │            │               │            │
  │            └───────────────┘            │
  │                                         │
  │                                         │
  │                                         │
  │                                         │
  │   ╔════════════════════════════════╗    │
  │   ║  Click to watch pixel art      ║    │
  │   ║  generation in action!         ║    │
  │   ╚════════════════════════════════╝    │
  │                                         │
  └─────────────────────────────────────────┘
`}
        </span>
      </pre>
    </div>
  );
} 