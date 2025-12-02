import React from 'react';
import { Github, Mail, Activity } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-dark-950 border-t border-gray-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-prism-400 to-prism-600 flex items-center justify-center">
                <Activity className="text-white w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-white">Prism SRT</span>
            </div>
            <p className="text-gray-400 text-sm max-w-sm mb-6">
              The open-source professional gateway for reliable, low-latency video distribution. Built for the modern broadcast stack.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-prism-400">Features</a></li>
              <li><a href="#" className="hover:text-prism-400">Architecture</a></li>
              <li><a href="#" className="hover:text-prism-400">Roadmap</a></li>
              <li><a href="#" className="hover:text-prism-400">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-prism-400">Documentation</a></li>
              <li><a href="#" className="hover:text-prism-400">API Reference</a></li>
              <li><a href="#" className="hover:text-prism-400">GitHub Repository</a></li>
              <li><a href="#" className="hover:text-prism-400">Community</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Prism SRT. Released under MIT License.
          </p>
          <div className="flex space-x-6 text-sm text-gray-500 mt-4 md:mt-0">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;