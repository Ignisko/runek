"use client";

import React, { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("feed");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold font-outfit tracking-tighter text-white">
              RUN<span className="text-primary italic">EK</span>
            </h1>
            <div className="hidden md:flex gap-6 text-sm font-medium text-white/50">
              <button 
                onClick={() => setActiveTab("feed")}
                className={`transition-colors hover:text-white ${activeTab === "feed" ? "text-white" : ""}`}
              >
                Job Feed
              </button>
              <button 
                onClick={() => setActiveTab("cv")}
                className={`transition-colors hover:text-white ${activeTab === "cv" ? "text-white" : ""}`}
              >
                CV Manager
              </button>
              <button 
                onClick={() => setActiveTab("analytics")}
                className={`transition-colors hover:text-white ${activeTab === "analytics" ? "text-white" : ""}`}
              >
                Analytics
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest">
              Systems Agent Active
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        <header className="mb-12">
          <p className="text-primary font-mono text-xs uppercase tracking-[0.3em] mb-3">Targeting: AI / Robotics / Energy</p>
          <h2 className="text-4xl md:text-5xl font-bold font-outfit text-white mb-4 tracking-tight">
            Commands for <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Ignacy Januszek</span>
          </h2>
          <p className="text-white/60 max-w-2xl text-lg leading-relaxed">
            Your personal systems agent has identified 12 high-signal roles from Climatebase and Wellfound today. 
            Tailoring is complete for 8 positions.
          </p>
        </header>

        {/* Action Grid/Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-2">Priority Feed</h3>
            
            {/* Sample Job Card */}
            <div className="glass-card p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-bold text-white">Systems Product Manager</h4>
                  <p className="text-primary font-medium">Orbit Robotics • Munich (Relocation)</p>
                </div>
                <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-white/40">
                  2h ago
                </div>
              </div>
              <p className="text-white/50 text-sm line-clamp-2">
                We are building the future of underwater maintenance drones. Looking for a technical PM to bridge the gap between our computer vision team and industrial clients.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/60 font-mono">Robotics</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/60 font-mono">CV Mapping: High</span>
              </div>
              <div className="flex gap-4 pt-4 border-t border-white/10 mt-2">
                <button className="btn-primary flex-1 py-2 text-sm">Review & Apply</button>
                <button className="px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-sm">Discard</button>
              </div>
            </div>

            {/* Another Sample Job Card */}
            <div className="glass-card p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-bold text-white">Technical Product Manager</h4>
                  <p className="text-secondary font-medium">VoltGrid AI • London</p>
                </div>
                <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-white/40">
                  5h ago
                </div>
              </div>
              <p className="text-white/50 text-sm line-clamp-2">
                Optimizing the UK power grid using RL agents. We need someone who understands systems modeling and ROI for energy infrastructure.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/60 font-mono">Energy</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/60 font-mono">AI Modeling</span>
              </div>
              <div className="flex gap-4 pt-4 border-t border-white/10 mt-2">
                <button className="btn-primary flex-1 py-2 text-sm bg-secondary text-black">Review & Apply</button>
                <button className="px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-sm">Discard</button>
              </div>
            </div>
          </div>

          {/* Sidebar / Profile Status */}
          <div className="flex flex-col gap-8">
            <div className="glass-card p-6 flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Agent Configuration</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">Active Profile</span>
                  <span className="text-white font-medium">Robotics & Space</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">Daily Volume</span>
                  <span className="text-white font-medium">5 High-Signal</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">Search Status</span>
                  <span className="flex items-center gap-2 text-secondary">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    Scanning
                  </span>
                </div>
              </div>
              <button className="w-full py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-xs text-white/60 mt-2">
                Edit Search Parameters
              </button>
            </div>

            <div className="glass-card p-6 flex flex-col gap-4 bg-gradient-to-br from-primary/10 to-transparent">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">Systems Insight</h3>
              <p className="text-white/80 text-sm italic">
                "Based on your recent work at ProcessMate, you have a 82% match for technical roles involving industrial discovery."
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-8 border-t border-white/5 text-center">
        <p className="text-white/20 text-[10px] font-mono tracking-widest uppercase">
          Runek Core • v0.1.0 • Designed for Ignacy Januszek
        </p>
      </footer>
    </div>
  );
}
