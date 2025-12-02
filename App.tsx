import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Architecture from './components/Architecture';
import Showcase from './components/Showcase';
import Performance from './components/Performance';
import Documentation from './components/Documentation';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-dark-900 text-slate-50 font-sans selection:bg-prism-500/30">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Architecture />
        <Showcase />
        <Performance />
        <Documentation />
      </main>
      <Footer />
    </div>
  );
}

export default App;