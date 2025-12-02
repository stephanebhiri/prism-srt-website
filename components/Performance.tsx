import React from 'react';
import { BenchmarkItem } from '../types';

const benchmarks: BenchmarkItem[] = [
  {
    metric: "50+",
    value: "Simultaneous Routes",
    description: "Passthrough Mode @ 1080p60 on standard cloud instances."
  },
  {
    metric: "<50ms",
    value: "Added Latency",
    description: "Glass-to-glass processing time in passthrough mode."
  },
  {
    metric: "0%",
    value: "CPU Overhead",
    description: "For multicast packet duplication using hardware NIC offloading."
  }
];

const Performance: React.FC = () => {
  return (
    <section id="performance" className="py-24 bg-gradient-to-b from-dark-800 to-dark-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white">High Performance Architecture</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benchmarks.map((item, index) => (
            <div key={index} className="text-center p-8 border border-gray-800 rounded-2xl bg-dark-900/50">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 mb-2">
                {item.metric}
              </div>
              <div className="text-xl font-bold text-prism-400 mb-4">{item.value}</div>
              <p className="text-gray-500 text-sm">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gray-900/80 rounded-xl p-8 border border-gray-800 text-center">
            <h3 className="text-white text-lg font-semibold mb-4">Supported Hardware & Environments</h3>
            <div className="flex flex-wrap justify-center gap-4">
                {['AWS c6i', 'DigitalOcean CPU-Opt', 'Intel Xeon', 'AMD Ryzen', 'Raspberry Pi 4'].map((hw) => (
                    <span key={hw} className="px-4 py-2 rounded-full bg-gray-800 text-gray-300 text-sm border border-gray-700">
                        {hw}
                    </span>
                ))}
            </div>
        </div>
      </div>
    </section>
  );
};

export default Performance;