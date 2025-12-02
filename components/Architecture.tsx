import React from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';

const Architecture: React.FC = () => {
  return (
    <section id="architecture" className="py-24 bg-dark-800 border-y border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Hybrid Architecture
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Prism SRT operates in two distinct modes to maximize efficiency or capability depending on your needs.
            </p>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <span className="text-green-500 font-bold">1</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Passthrough Mode</h3>
                  <p className="text-gray-400 text-sm">
                    Zero-latency SRT relay. The input stream is packet-duplicated via UDP Multicast directly to outputs. No transcoding overhead, perfect for distribution.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <span className="text-blue-500 font-bold">2</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Transcode Mode</h3>
                  <p className="text-gray-400 text-sm">
                    Full FFmpeg pipeline integration. Unlocks audio matrix routing, video resizing, format conversion, and overlays before distribution.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Diagram Visualization */}
          <div className="relative">
             <div className="absolute inset-0 bg-gradient-to-r from-prism-600/20 to-purple-600/20 blur-3xl rounded-full opacity-30"></div>
             
             <div className="glass-panel p-8 rounded-xl relative">
                <div className="flex flex-col items-center space-y-4">
                  
                  {/* Input */}
                  <div className="w-full bg-gray-900 border border-gray-700 p-4 rounded-lg text-center">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Ingest</span>
                    <div className="text-white font-mono mt-1">SRT / SRTLA / RTMP / HTTP</div>
                  </div>

                  <ArrowDown className="text-gray-600 animate-bounce" />

                  {/* Core */}
                  <div className="w-full bg-gray-800 border border-prism-500/30 p-6 rounded-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-prism-500"></div>
                    <div className="text-center">
                      <h4 className="text-prism-400 font-bold text-lg">Prism Core</h4>
                      <div className="flex justify-center gap-4 mt-4 text-xs">
                        <div className="bg-gray-900 px-3 py-2 rounded text-gray-300">
                          Multicast UDP <br/> <span className="text-gray-500">239.1.x.y</span>
                        </div>
                        <div className="bg-gray-900 px-3 py-2 rounded text-gray-300">
                           Audio Matrix <br/> <span className="text-gray-500">Remapping</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-full">
                    <div className="flex flex-col items-center">
                      <ArrowDown className="text-gray-600 mb-2" />
                      <div className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-center">
                        <div className="text-xs text-gray-400">Target A</div>
                        <div className="font-bold text-white text-sm">YouTube</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <ArrowDown className="text-gray-600 mb-2" />
                      <div className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-center">
                        <div className="text-xs text-gray-400">Target B</div>
                        <div className="font-bold text-white text-sm">Decoder</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <ArrowDown className="text-gray-600 mb-2" />
                      <div className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-center">
                        <div className="text-xs text-gray-400">Target C</div>
                        <div className="font-bold text-white text-sm">HLS</div>
                      </div>
                    </div>
                  </div>

                </div>
             </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Architecture;