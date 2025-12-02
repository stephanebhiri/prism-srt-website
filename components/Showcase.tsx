import React, { useState, useEffect } from 'react';
import { ScreenshotItem } from '../types';

const screenshots: ScreenshotItem[] = [
  {
    title: "Route Management - Table View",
    description: "Manage multiple routes with real-time status, bitrates, and stability indicators.",
    imageUrl: "/images/route-table.png"
  },
  {
    title: "Route Management - Cards View",
    description: "Visual card layout for easier monitoring of route health and output status.",
    imageUrl: "/images/cards-view.png"
  },
  {
    title: "Route Editor",
    description: "Intuitive interface for configuring inputs, outputs, video/audio settings, and processing modes.",
    imageUrl: "/images/route-editor.png"
  },
  {
    title: "Drag & Drop Workflow",
    description: "Quick route creation by dragging outputs to inputs for fast stream duplication.",
    imageUrl: "/images/drag-drop.png"
  },
  {
    title: "Audio Matrix Editor",
    description: "Visual routing matrix for complex audio mapping (5.1 to Stereo, channel swapping, downmixing).",
    imageUrl: "/images/audio-matrix.png"
  },
  {
    title: "Output Details",
    description: "Per-output metrics monitoring with connection status, bandwidth, and quality indicators.",
    imageUrl: "/images/output-details.png"
  },
  {
    title: "SRT Link Metrics",
    description: "Real-time SRT statistics including RTT, Flight Size, packet loss, and historical graphs.",
    imageUrl: "/images/srt-metrics.png"
  },
  {
    title: "System Monitor",
    description: "Global dashboard for server health, CPU/RAM usage, and network interface throughput.",
    imageUrl: "/images/system-monitor.png"
  }
];

const Showcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % screenshots.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleTabClick = (index: number) => {
    setActiveTab(index);
    setIsAutoPlaying(false);
  };

  return (
    <section id="showcase" className="py-24 bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Command Center Control</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            A modern, dark-mode interface designed for long sessions and critical monitoring.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Tabs */}
          <div className="lg:w-1/3 space-y-4">
            {screenshots.map((shot, index) => (
              <button
                key={index}
                onClick={() => handleTabClick(index)}
                className={`w-full text-left p-6 rounded-xl transition-all border group ${
                  activeTab === index 
                    ? 'bg-gray-800 border-prism-500/50 shadow-lg shadow-prism-900/20' 
                    : 'bg-transparent border-transparent hover:bg-gray-800/50'
                }`}
              >
                <h3 className={`text-lg font-bold mb-2 transition-colors ${activeTab === index ? 'text-prism-400' : 'text-gray-300 group-hover:text-white'}`}>
                  {shot.title}
                </h3>
                <p className="text-sm text-gray-400">
                  {shot.description}
                </p>
                {activeTab === index && (
                  <div className="w-full h-1 bg-gray-700 mt-4 rounded-full overflow-hidden">
                    {isAutoPlaying && (
                      <div className="h-full bg-prism-500 animate-[progress_5s_linear_infinite]" />
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Image Display */}
          <div className="lg:w-2/3">
            <div className="relative rounded-xl overflow-hidden border border-gray-700 shadow-2xl bg-black aspect-video group ring-1 ring-white/10">
              {/* Fake UI Header to make it look like an app */}
              <div className="absolute top-0 w-full h-9 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between z-10 select-none">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-xs text-gray-500 font-mono">localhost:4670</div>
              </div>
              
              <div className="w-full h-full pt-9 bg-dark-900">
                 {/* Image Transition Container */}
                 {screenshots.map((shot, index) => (
                    <img 
                      key={index}
                      src={shot.imageUrl} 
                      alt={shot.title}
                      className={`absolute inset-0 w-full h-full object-cover pt-9 transition-opacity duration-700 ease-in-out ${activeTab === index ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    />
                 ))}
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20"></div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes progress {
          0% { width: 0% }
          100% { width: 100% }
        }
      `}</style>
    </section>
  );
};

export default Showcase;