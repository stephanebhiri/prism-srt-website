import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Code, Wrench, AlertCircle, Server } from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  file: string;
  icon: any;
}

const sections: DocSection[] = [
  { id: 'user-guide', title: 'User Guide', file: '/docs/USER_GUIDE.md', icon: BookOpen },
  { id: 'api', title: 'API Reference', file: '/docs/API.md', icon: Code },
  { id: 'architecture', title: 'Architecture', file: '/docs/ARCHITECTURE.md', icon: Server },
  { id: 'deployment', title: 'Deployment', file: '/docs/DEPLOYMENT.md', icon: Wrench },
  { id: 'troubleshooting', title: 'Troubleshooting', file: '/docs/TROUBLESHOOTING.md', icon: AlertCircle },
];

// Slugify function for heading IDs
const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const Documentation: React.FC = () => {
  const [activeSection, setActiveSection] = useState('user-guide');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const section = sections.find(s => s.id === activeSection);
    if (!section) return;

    setLoading(true);
    fetch(section.file)
      .then(res => res.text())
      .then(text => {
        setContent(text);
        setLoading(false);

        // Scroll to hash anchor if present in URL
        setTimeout(() => {
          const hash = window.location.hash.substring(1);
          if (hash) {
            const element = document.getElementById(hash);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }, 100);
      })
      .catch(err => {
        setContent(`# Error Loading Documentation\n\nFailed to load ${section.file}`);
        setLoading(false);
      });
  }, [activeSection]);

  const activeDoc = sections.find(s => s.id === activeSection);

  return (
    <section id="documentation" className="py-24 bg-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Documentation</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Complete guides and references for Prism SRT
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4">
            <div className="bg-dark-900 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                Documentation
              </h3>
              <nav className="space-y-2">
                {sections.map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        activeSection === section.id
                          ? 'bg-prism-600 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:w-3/4">
            <div className="bg-dark-900 rounded-xl border border-gray-700 p-8 min-h-[600px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prism-500"></div>
                </div>
              ) : (
                <div className="prose prose-invert prose-prism max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ node, children, ...props }) => {
                        const id = typeof children === 'string' ? slugify(children) : '';
                        return <h1 id={id} className="text-4xl font-bold text-white mb-6" {...props}>{children}</h1>;
                      },
                      h2: ({ node, children, ...props }) => {
                        const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
                        const id = slugify(text);
                        return <h2 id={id} className="text-3xl font-bold text-white mt-8 mb-4 border-b border-gray-700 pb-2" {...props}>{children}</h2>;
                      },
                      h3: ({ node, children, ...props }) => {
                        const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
                        const id = slugify(text);
                        return <h3 id={id} className="text-2xl font-semibold text-white mt-6 mb-3" {...props}>{children}</h3>;
                      },
                      p: ({ node, ...props }) => <p className="text-gray-300 mb-4 leading-relaxed" {...props} />,
                      code: ({ node, inline, ...props }: any) =>
                        inline ? (
                          <code className="bg-gray-800 text-prism-400 px-2 py-1 rounded text-sm font-mono" {...props} />
                        ) : (
                          <code className="block bg-gray-800 text-gray-300 p-4 rounded-lg overflow-x-auto font-mono text-sm" {...props} />
                        ),
                      pre: ({ node, ...props }) => <pre className="bg-gray-800 rounded-lg overflow-hidden mb-4" {...props} />,
                      a: ({ node, ...props }) => <a className="text-prism-400 hover:text-prism-300 underline" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2" {...props} />,
                      li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
                      blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-prism-500 pl-4 italic text-gray-400 my-4" {...props} />,
                      table: ({ node, ...props }) => <table className="min-w-full divide-y divide-gray-700 mb-4" {...props} />,
                      thead: ({ node, ...props }) => <thead className="bg-gray-800" {...props} />,
                      tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-700" {...props} />,
                      tr: ({ node, ...props }) => <tr {...props} />,
                      th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" {...props} />,
                      td: ({ node, ...props }) => <td className="px-4 py-3 text-sm text-gray-300" {...props} />,
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Documentation;
