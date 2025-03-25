"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import VideoPlaceholder from "./video-placeholder"

interface VideoDemo {
  videoUrl?: string;
  title?: string;
}

export default function VideoDemo({ 
  videoUrl,
  title = "Watch PROMIXEL in action"
}: VideoDemo) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  return (
    <div className="w-full max-w-4xl mx-auto mt-8 rounded-lg overflow-hidden border border-white/10">
      <div className="bg-black/60 p-3 backdrop-blur-sm border-b border-white/10">
        <h2 style={{ fontFamily: "var(--font-pixel)" }} className="text-cyan-400 text-lg">Demo Video</h2>
        <p className="text-gray-300 text-xs" style={{ fontFamily: "var(--font-pixel)" }}>
          {title}
        </p>
      </div>
      
      <div className="relative aspect-video bg-black/70">
        {isPlaying && videoUrl ? (
          <iframe 
            src={videoUrl} 
            className="absolute inset-0 w-full h-full"
            title="PROMIXEL Demo Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <VideoPlaceholder />
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer group opacity-0 hover:opacity-100 transition-opacity duration-300"
              onClick={() => videoUrl && setIsPlaying(true)}
            >
              <div className="bg-black/50 rounded-full p-5 group-hover:bg-black/70 transition-all duration-300 border border-white/20">
                <Play className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 