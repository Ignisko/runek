"use client";

import React, { useState, useEffect } from "react";
import { Job, TailoredContent } from "../lib/types/job";

export default function Home() {
  const [activeTab, setActiveTab] = useState("feed");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tailoring, setTailoring] = useState<string | null>(null);
  const [selectedTailored, setSelectedTailored] = useState<TailoredContent | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTailor = async (jobId: string, category: string) => {
    setTailoring(jobId);
    let profile = 'ai-growth';
    if (category === 'Robotics') profile = 'robotics-space';
    if (category === 'Energy') profile = 'energy-climate';

    try {
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, profile })
      });
      const data = await res.json();
      setSelectedTailored(data);
      fetchJobs(); // Refresh status
    } catch (err) {
      console.error("Tailoring failed:", err);
    } finally {
      setTailoring(null);
    }
  };

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
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest">
              Systems Agent Active
            </div>
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
            Your personal systems agent has identified {jobs.length} high-signal roles. 
            Tailoring is complete for {jobs.filter(j => j.status === 'tailored').length} positions.
          </p>
        </header>

        {/* Action Grid/Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-2">Priority Feed</h3>
            
            {loading ? (
              <div className="flex justify-center py-20">
                <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.id} className={`glass-card p-6 flex flex-col gap-4 ${job.status === 'tailored' ? 'border-secondary/30' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xl font-bold text-white">{job.title}</h4>
                      <p className="text-primary font-medium">{job.company} • {job.location}</p>
                    </div>
                    <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-white/40">
                      {job.source}
                    </div>
                  </div>
                  <p className="text-white/50 text-sm line-clamp-2">{job.description}</p>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/60 font-mono">{job.category}</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/60 font-mono">Match: {job.matchScore}%</span>
                    {job.status === 'tailored' && (
                      <span className="px-2 py-0.5 rounded bg-secondary/10 border border-secondary/20 text-[10px] text-secondary font-mono">Tailored</span>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-white/10 mt-2">
                    <button 
                      onClick={() => handleTailor(job.id, job.category)}
                      disabled={tailoring === job.id}
                      className={`btn-primary flex-1 py-2 text-sm ${job.status === 'tailored' ? 'bg-secondary text-black' : ''}`}
                    >
                      {tailoring === job.id ? 'Agent Working...' : job.status === 'tailored' ? 'View Tailored CV' : 'Tailor & Review'}
                    </button>
                    <button className="px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-sm">Discard</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar / Profile Status */}
          <div className="flex flex-col gap-8">
            <div className="glass-card p-6 flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Agent Configuration</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">Active Profile</span>
                  <span className="text-white font-medium">Systems Generalist</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">Daily Volume</span>
                  <span className="text-white font-medium">5 High-Signal</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">AI Engine</span>
                  <span className="flex items-center gap-2 text-secondary">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    Gemini 1.5 Flash
                  </span>
                </div>
              </div>
            </div>

            {selectedTailored && (
              <div className="glass-card p-6 flex flex-col gap-4 bg-gradient-to-br from-primary/10 to-transparent animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">Tailoring Results</h3>
                <p className="text-white/80 text-sm whitespace-pre-wrap line-clamp-6 font-mono">
                  {selectedTailored.coverLetter}
                </p>
                <button 
                  onClick={() => window.alert("CV Generated!")}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 rounded text-xs text-white uppercase tracking-wider font-bold transition-all"
                >
                  Download Refactored CV
                </button>
              </div>
            )}
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
