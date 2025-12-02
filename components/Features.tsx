import React from 'react';
import { Network, Cpu, Sliders, BarChart3, Lock, RefreshCw, Layers, Speaker } from 'lucide-react';
import { FeatureItem } from '../types';

const features: FeatureItem[] = [
  {
    title: "SRT & SRTLA Support",
    description: "Full implementation of Secure Reliable Transport with multi-path bonding compatible with BELABOX.",
    icon: Network,
  },
  {
    title: "Zero-CPU Multicast",
    description: "Hardware NIC packet duplication using multicast UDP (239.x.x.x) for massive scaling.",
    icon: Layers,
  },
  {
    title: "Live Transcoding",
    description: "FFmpeg-powered pipeline for video/audio transcoding with hardware acceleration support.",
    icon: Cpu,
  },
  {
    title: "Audio Matrix Routing",
    description: "Complex channel routing, remapping, and downmixing (5.1, 7.1 to Stereo) for professional audio workflows.",
    icon: Speaker,
  },
  {
    title: "Real-Time Metrics",
    description: "Monitor RTT, bandwidth, packet loss, jitter, and buffer health with WebSocket live updates.",
    icon: BarChart3,
  },
  {
    title: "Multi-Output Distribution",
    description: "One input to N outputs. Support for SRT, RTMP, HTTP/HLS, UDP, and RIST protocols.",
    icon: Sliders,
  },
  {
    title: "Enterprise Features",
    description: "Auto-restart with exponential backoff, database backups, hot output management. Update and add features without disrupting running routes.",
    icon: RefreshCw,
  },
  {
    title: "Secure Access",
    description: "Optional JWT-based authentication with bcrypt hashing to secure your control plane.",
    icon: Lock,
  },
];

const Features: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-dark-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Engineered for Reliability</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            A comprehensive toolset designed to solve real-world broadcasting challenges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="glass-panel p-6 rounded-xl hover:bg-gray-800/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center mb-6 group-hover:bg-prism-900/30 transition-colors">
                <feature.icon className="w-6 h-6 text-prism-400 group-hover:text-prism-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;