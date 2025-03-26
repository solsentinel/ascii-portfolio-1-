"use client"

import { useState } from 'react';

interface RoadmapItem {
  id: string;
  quarter: string;
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'completed' | 'future';
}

export default function Roadmap() {
  const [roadmapItems] = useState<RoadmapItem[]>([
    {
      id: '1',
      quarter: 'Q1 2025',
      title: 'Official Launch',
      description: 'Public release of Promixel with enhanced model quality, improved UI, and enterprise-grade API access.',
      status: 'planned'
    },
    {
      id: '2',
      quarter: 'Q2 2025',
      title: 'Animation Studio',
      description: 'Create seamless pixel art animations, sprite sheets, and character movement cycles with a new dedicated toolset.',
      status: 'future'
    },
    {
      id: '3',
      quarter: 'Q3 2025',
      title: 'Game Asset Integration',
      description: 'Direct export to Unity, Godot, and other game engines with automatic tilesets and collision mapping.',
      status: 'future'
    },
    {
      id: '4',
      quarter: 'Q4 2025',
      title: 'Community Marketplace',
      description: 'Buy, sell, and trade pixel art assets created with Promixel in our community-driven marketplace.',
      status: 'future'
    },
  ]);
  
  // Add state for the modal visibility
  const [showModal, setShowModal] = useState(false);

  const getStatusColor = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'planned': return 'border-amber-500 bg-amber-500/10';
      case 'in-progress': return 'border-blue-500 bg-blue-500/10';
      case 'completed': return 'border-green-500 bg-green-500/10';
      case 'future': return 'border-purple-500 bg-purple-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getStatusText = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'planned': return 'Planned';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'future': return 'Future';
      default: return 'Unknown';
    }
  };
  
  // Function to handle waitlist button click
  const handleWaitlistClick = () => {
    setShowModal(true);
  };
  
  // Function to close the modal
  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 mb-8 rounded-lg overflow-hidden border border-white/10">
      <div className="bg-black/60 p-4 backdrop-blur-sm border-b border-white/10">
        <h2 style={{ fontFamily: "var(--font-pixel)" }} className="text-cyan-400 text-2xl">Promixel Roadmap</h2>
        <p className="text-gray-300 text-base mt-1" style={{ fontFamily: "var(--font-pixel)" }}>
          Our development journey to 2025 and beyond
        </p>
      </div>
      
      <div className="bg-black/70 p-8">
        {/* Timeline visualization */}
        <div className="relative mb-16 overflow-hidden">
          <div className="absolute top-8 left-0 right-0 h-2 bg-gradient-to-r from-cyan-600 via-purple-600 to-rose-600"></div>
          
          <div className="flex justify-between relative">
            {roadmapItems.map((item, index) => (
              <div key={item.id} className="flex flex-col items-center relative z-10 w-1/4">
                <div className="w-6 h-6 rounded-full bg-black border-3 border-cyan-400 mb-3"></div>
                <div className="text-cyan-300 text-lg font-bold pixel-effect" style={{ fontFamily: "var(--font-pixel)" }}>
                  {item.quarter}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Roadmap items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          {roadmapItems.map((item) => (
            <div 
              key={item.id} 
              className={`border-2 rounded-md overflow-hidden transition-all hover:shadow-lg hover:shadow-cyan-900/20 p-6 ${getStatusColor(item.status)}`}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-white text-xl font-bold pixel-effect" style={{ fontFamily: "var(--font-pixel)" }}>
                  {item.title}
                </h3>
                <span className="text-sm px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm">
                  {getStatusText(item.status)}
                </span>
              </div>
              <div className="text-gray-300 text-base mt-3 leading-relaxed">{item.description}</div>
              <div className="mt-4 text-cyan-300 text-base">{item.quarter}</div>
            </div>
          ))}
        </div>
        
        {/* Call to action */}
        <div className="mt-12 border-2 border-white/20 rounded-lg p-8 bg-gradient-to-r from-black/60 to-black/40 text-center">
          <h3 className="text-cyan-400 text-2xl mb-3 pixel-effect" style={{ fontFamily: "var(--font-pixel)" }}>
            Join Our Journey
          </h3>
          <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Be part of the Promixel revolution from the beginning. Sign up today to get early access
            and influence our development roadmap.
          </p>
          <button 
            onClick={handleWaitlistClick}
            className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-md text-lg pixel-effect">
            Join the Waitlist
          </button>
        </div>
      </div>
      
      {/* Modal/Popup */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-sm">
          <div className="bg-black/90 border-2 border-cyan-500/50 rounded-lg p-8 max-w-md w-full shadow-lg shadow-cyan-500/20 animate-fadeIn pixel-border">
            <div className="text-center">
              <h3 className="text-rose-400 text-2xl mb-4 pixel-effect" style={{ fontFamily: "var(--font-pixel)" }}>
                Waitlist Full
              </h3>
              <div className="mb-6 bg-black/40 p-4 rounded-md border border-white/10">
                <p className="text-white text-xl mb-2 leading-relaxed">
                  The waitlist is full as of now.
                </p>
                <p className="text-gray-300 text-base">
                  Please check back during our official launch in Q1 2025.
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={closeModal}
                  className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold py-3 px-8 rounded-md text-lg pixel-effect"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 