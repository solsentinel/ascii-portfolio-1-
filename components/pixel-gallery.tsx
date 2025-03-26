"use client"

import { useState } from 'react';

interface GalleryItem {
  id: string;
  name: string;
  imageUrl: string;
  description?: string;
}

export default function PixelGallery() {
  // Static gallery items with real pixel art
  const [galleryItems] = useState<GalleryItem[]>([
    { 
      id: '1', 
      name: 'Coca Cola', 
      imageUrl: '/images/gallery/coca-cola.png',
      description: 'Retro-style beverage advertisement'
    },
    { 
      id: '2', 
      name: 'Spiderman', 
      imageUrl: '/images/gallery/spiderman.png',
      description: 'Web-slinging superhero in pixel form'
    },
    { 
      id: '3', 
      name: 'Pixel Landscape', 
      imageUrl: '/images/gallery/pixel-landscape.png',
      description: 'Serene nature scene with retro aesthetics'
    },
    { 
      id: '4', 
      name: 'Beautiful Woman', 
      imageUrl: '/images/gallery/beautiful-woman.png',
      description: 'Elegant portrait in pixel art style'
    },
    { 
      id: '5', 
      name: 'Cute Girl', 
      imageUrl: '/images/gallery/cute-girl.png',
      description: 'Charming character design with pixelated details'
    },
    { 
      id: '6', 
      name: 'Pixel Character', 
      imageUrl: '/images/gallery/pixel-character.png',
      description: 'Original game-style character design'
    },
    { 
      id: '7', 
      name: 'Neon City', 
      imageUrl: '/images/gallery/neon-city.png',
      description: 'Cyberpunk urban landscape with glowing elements'
    },
    { 
      id: '8', 
      name: 'Space Explorer', 
      imageUrl: '/images/gallery/space-explorer.png',
      description: 'Astronaut character in a retro sci-fi style'
    },
    { 
      id: '9', 
      name: 'Fantasy Castle', 
      imageUrl: '/images/gallery/fantasy-castle.png',
      description: 'Magical medieval fortress with pixel details'
    },
    { 
      id: '10', 
      name: 'Pixel Dragon', 
      imageUrl: '/images/gallery/pixel-dragon.png',
      description: 'Mythical creature rendered in classic pixel art'
    },
    { 
      id: '11', 
      name: 'Sunset Beach', 
      imageUrl: '/images/gallery/sunset-beach.png',
      description: 'Tropical shoreline scene with warm pixel colors'
    },
    { 
      id: '12', 
      name: 'Retro Arcade', 
      imageUrl: '/images/gallery/retro-arcade.png',
      description: 'Nostalgic gaming environment with 80s aesthetics'
    },
  ]);

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 rounded-lg overflow-hidden border border-white/10">
      <div className="w-full max-w-6xl mx-auto p-4">
        <div className="mb-8">
          <div className="bg-black/60 p-3 backdrop-blur-sm border-b border-white/10">
            <h2 
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center pixel-effect"
              style={{ fontFamily: "var(--font-pixel)" }}
            >
              Gallery
            </h2>
            <p className="text-gray-300 text-center text-sm md:text-base mt-2 pixel-effect">
              Featured pixel art creations
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-black/70 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryItems.map((item) => (
            <div 
              key={item.id} 
              className="border border-white/10 rounded-md overflow-hidden bg-black/50 transition-all hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-900/20"
            >
              <div className="aspect-square relative flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                <div className="absolute inset-0 border-2 border-dashed border-cyan-900/20 m-1 pointer-events-none rounded"></div>
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-full h-full object-contain p-2"
                  style={{ imageRendering: 'pixelated' }}
                  onError={(e) => {
                    // Customize placeholder based on the item name for variety
                    const placeholderText = encodeURIComponent(item.name);
                    const bgColor = item.id.length > 1 ? 
                      `10${item.id}030` : '102030'; // Slight color variation
                    (e.target as HTMLImageElement).src = `https://placehold.co/256x256/${bgColor}/cyan?text=${placeholderText}`;
                  }}
                />
              </div>
              <div className="p-2">
                <h3 className="text-cyan-300 text-base md:text-lg font-medium truncate" style={{ fontFamily: "var(--font-pixel)" }}>
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">{item.description}</p>
                )}
                <div className="flex justify-between items-center mt-2">
                  <button 
                    className="text-sm bg-black/50 text-white px-2 py-1 rounded hover:bg-black/80 transition-colors font-mono border border-cyan-900/30 hover:border-cyan-400/30"
                    onClick={() => window.open(item.imageUrl, '_blank')}
                  >
                    View
                  </button>
                  <span className="text-gray-400 text-sm font-mono">256×256</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 