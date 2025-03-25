"use client"

import { useState } from 'react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  image: string;
  quote: string;
}

export default function Testimonials() {
  const [testimonials] = useState<Testimonial[]>([
    {
      id: '1',
      name: 'Mika Chen',
      role: 'Game Artist',
      image: 'https://placehold.co/64x64/102030/cyan?text=MC',
      quote: 'Promixel has completely transformed my workflow. The pixel art it generates has become the foundation for all my indie game assets!'
    },
    {
      id: '2',
      name: 'Alex Rivera',
      role: 'Retro Designer',
      image: 'https://placehold.co/64x64/203040/cyan?text=AR',
      quote: 'I\'ve tried every pixel art tool out there, but nothing beats the speed and quality of Promixel. It captures that authentic 8-bit aesthetic perfectly.'
    },
    {
      id: '3',
      name: 'Jordan Taylor',
      role: 'Twitch Streamer',
      image: 'https://placehold.co/64x64/301020/cyan?text=JT',
      quote: 'My stream overlays and emotes have never looked better! Promixel generates pixel art that my audience absolutely loves. Highly recommended!'
    },
    {
      id: '4',
      name: 'Sam Nguyen',
      role: 'Web Developer',
      image: 'https://placehold.co/64x64/103030/cyan?text=SN',
      quote: 'As someone who can\'t draw to save my life, Promixel has been a lifesaver. Now I can create unique pixel art for all my projects with simple prompts!'
    },
    {
      id: '5',
      name: 'Eliza Winters',
      role: 'Digital Artist',
      image: 'https://placehold.co/64x64/202060/cyan?text=EW',
      quote: 'The variety of styles Promixel can generate is mind-blowing. It helps me break creative blocks and explore new directions in my pixel art commissions.'
    },
  ]);

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 mb-8 rounded-lg overflow-hidden border border-white/10">
      <div className="bg-black/60 p-3 backdrop-blur-sm border-b border-white/10">
        <h2 style={{ fontFamily: "var(--font-pixel)" }} className="text-cyan-400 text-lg">User Testimonials</h2>
        <p className="text-gray-300 text-xs" style={{ fontFamily: "var(--font-pixel)" }}>
          What pixelers are saying about Promixel
        </p>
      </div>
      
      <div className="bg-black/70 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className="border border-white/10 rounded-md overflow-hidden bg-black/50 transition-all hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-900/20 p-4"
            >
              <div className="flex items-start space-x-3">
                <div className="relative h-12 w-12 flex-shrink-0">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="rounded-md w-full h-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="absolute inset-0 border border-dashed border-cyan-900/30 rounded-md pointer-events-none"></div>
                </div>
                <div className="flex-1">
                  <h3 className="text-cyan-300 text-sm" style={{ fontFamily: "var(--font-pixel)" }}>
                    {testimonial.name}
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">{testimonial.role}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-gray-300 text-sm leading-relaxed">"{testimonial.quote}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 