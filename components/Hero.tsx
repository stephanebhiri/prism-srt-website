import React from 'react';
import { ArrowRight, Zap, Radio, Server } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <div className="relative pt-32 pb-16 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-prism-600/10 blur-[100px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-prism-500/10 border border-prism-500/20 mb-8">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-prism-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-prism-500"></span>
            </span>
            <span className="text-xs font-semibold text-prism-300 tracking-wide uppercase">
              SRT Gateway Platform
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
            The Professional <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-prism-400 to-indigo-400">
              SRT Gateway
            </span>
          </h1>
          
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400 mb-10">
            Transform and distribute live streams via SRT/SRTLA with multicast routing. 
            Built for broadcast engineers who demand reliability and low latency.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="mailto:stephane.bhiri@gmail.com?subject=Prism SRT - Request Access" className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-prism-600 hover:bg-prism-700 md:text-lg transition-all shadow-lg hover:shadow-prism-500/25">
              Request Access
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
            <a href="#documentation" className="inline-flex items-center justify-center px-8 py-3 border border-gray-700 text-base font-medium rounded-md text-gray-300 bg-transparent hover:bg-gray-800 md:text-lg transition-all">
              View Documentation
            </a>
          </div>

          {/* Quick Stats Grid */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto border-t border-gray-800 pt-12">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-prism-400 mb-2">
                <Zap className="w-5 h-5" />
                <span className="font-bold">Zero Latency</span>
              </div>
              <p className="text-sm text-gray-500">Passthrough Mode</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-prism-400 mb-2">
                <Radio className="w-5 h-5" />
                <span className="font-bold">SRTLA Bonding</span>
              </div>
              <p className="text-sm text-gray-500">Multi-path Reliability</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-prism-400 mb-2">
                <Server className="w-5 h-5" />
                <span className="font-bold">Multicast Core</span>
              </div>
              <p className="text-sm text-gray-500">Zero-CPU Overhead</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;