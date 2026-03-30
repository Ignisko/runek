"use client";

import React, { useState, useEffect } from "react";
import { Job, TailoredContent } from "../lib/types/job";

export default function Home() {
  const [activeTab, setActiveTab] = useState("feed");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tailoring, setTailoring] = useState<string | null>(null);
  const [selectedTailored, setSelectedTailored] = useState<TailoredContent | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    fetchJobs();
    // Check if .env exists (simulated via API check)
    const checkEnv = async () => {
      const res = await fetch('/api/jobs');
      if (res.status === 500) setShowSetup(true);
    };
    checkEnv();
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
    <div className="flex flex-col min-h-screen bg-black selection:bg-primary selection:text-black">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 nav-blur">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <h1 className="text-3xl font-bold font-outfit tracking-tighter text-white">
              RUN<span className="text-primary italic">EK</span>
              <span className="text-[10px] ml-2 font-mono text-white/30 align-top opacity-50 tracking-widest">V0.1</span>
            </h1>
            <div className="hidden lg:flex gap-8 text-xs font-bold uppercase tracking-widest text-white/40">
              <button 
                onClick={() => setActiveTab("feed")}
                className={`transition-all hover:text-white relative py-2 ${activeTab === "feed" ? "text-white" : ""}`}
              >
                Pipeline
                {activeTab === "feed" && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_8px_rgba(0,245,255,0.5)]" />}
              </button>
              <button 
                onClick={() => setActiveTab("cv")}
                className={`transition-all hover:text-white relative py-2 ${activeTab === "cv" ? "text-white" : ""}`}
              >
                Master CVs
                {activeTab === "cv" && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_8px_rgba(0,245,255,0.5)]" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_rgba(0,255,65,0.5)]" />
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Agent Operational</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        <header className="mb-16 relative">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <p className="text-primary font-mono text-xs uppercase tracking-[0.4em] mb-4 font-bold">Targeted Discovery Engine</p>
          <h2 className="text-5xl md:text-7xl font-extrabold font-outfit text-white mb-6 tracking-tight leading-[0.9]">
            Optimize for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-accent text-glow">Ignacy Januszek</span>
          </h2>
          <p className="text-white/50 max-w-xl text-lg leading-relaxed font-medium">
            Your systems agent has synthesized {jobs.length} high-signal roles. 
            Tailoring is primed for {jobs.filter(j => j.status === 'tailored').length} opportunities.
          </p>
        </header>

        {/* Action Grid/Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Priority Feed // High Impact Only</h3>
              <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Updated: Just Now</div>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <span className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-mono text-white/30 animate-pulse uppercase tracking-widest">Initalizing Neural Pipeline...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {jobs.map(job => (
                  <div key={job.id} className={`glass-card p-8 group relative overflow-hidden ${job.status === 'tailored' ? 'border-secondary/20 bg-secondary/[0.02]' : ''}`}>
                    {job.status === 'tailored' && (
                      <div className="absolute top-0 right-0 px-4 py-1 bg-secondary/20 text-secondary text-[10px] font-black uppercase tracking-widest rounded-bl-lg border-l border-b border-secondary/20">
                        Synthesized
                      </div>
                    )}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="text-2xl font-bold text-white group-hover:text-primary transition-colors duration-300">{job.title}</h4>
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/40 font-mono font-bold uppercase tracking-widest">
                            {job.matchScore}% Match
                          </span>
                        </div>
                        <p className="text-primary font-bold text-sm tracking-wide opacity-80">{job.company} // {job.location}</p>
                      </div>
                      <div className="text-[10px] font-mono text-white/20 whitespace-nowrap bg-white/[0.02] px-3 py-1 rounded border border-white/5">
                        {job.source} :: {new Date(job.postedAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <p className="text-white/40 text-sm leading-relaxed my-6 line-clamp-3 font-medium border-l-2 border-white/5 pl-4 group-hover:border-primary/30 transition-colors">
                      {job.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 items-center justify-between pt-6 border-t border-white/5">
                      <div className="flex gap-2">
                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/60 font-bold uppercase tracking-wider">{job.category}</span>
                      </div>
                      
                      <div className="flex gap-4 w-full md:w-auto">
                        <button 
                          onClick={() => handleTailor(job.id, job.category)}
                          disabled={tailoring === job.id}
                          className={`btn-primary flex-1 md:flex-none flex items-center justify-center gap-3 px-8 ${job.status === 'tailored' ? 'from-secondary to-[#00d136] shadow-[0_4px_15px_rgba(0,255,65,0.2)]' : ''}`}
                        >
                          {tailoring === job.id ? (
                            <>
                              <span className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                              <span>Synthesizing...</span>
                            </>
                          ) : job.status === 'tailored' ? 'Review Manifest' : 'Initiate Tailoring'}
                        </button>
                        <button className="px-6 py-3 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white">Discard</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar / Status Manifest */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="glass-card p-8 space-y-8 bg-white/[0.01] border-white/5">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6">Core Configuration</h3>
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Active Intelligence</span>
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                       Gemini 1.5 Flash <span className="text-[10px] text-primary italic font-normal">v1-beta</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Application Strategy</span>
                    <span className="text-sm font-bold text-white">Systems Generalist</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Network Filter</span>
                    <span className="text-sm font-bold text-white">AI / Robotics / Energy</span>
                  </div>
                </div>
              </div>
              
              <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white group">
                Re-scan Network <span className="inline-block group-hover:rotate-180 transition-transform duration-500 ml-2">↻</span>
              </button>
            </div>

            {selectedTailored ? (
              <div className="glass-card p-8 bg-gradient-to-br from-primary/20 via-transparent to-transparent border-primary/20 animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Tailoring Output</h3>
                  <span className="text-[8px] font-mono text-white/20">AGENT_SIG :: 0x7F2</span>
                </div>
                <div className="p-4 bg-black/40 rounded-lg border border-white/5 mb-6">
                  <p className="text-white/70 text-xs leading-relaxed font-mono whitespace-pre-wrap line-clamp-[12]">
                    {selectedTailored.coverLetter}
                  </p>
                </div>
                <div className="space-y-4">
                  <button 
                    onClick={() => window.alert("Manifest Downloaded")}
                    className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform active:scale-95"
                  >
                    Export Tailored CV
                  </button>
                  <button className="w-full py-3 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors">
                    Draft Outreach Email
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-card p-8 border-dashed border-white/10 bg-transparent flex flex-col items-center justify-center text-center gap-4 group">
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/20 group-hover:border-primary/30 transition-colors">
                  <span className="font-mono text-xl">?</span>
                </div>
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest leading-relaxed">
                  Select a role to <br /> initiate neural tailoring
                </p>
              </div>
            )}

            {showSetup && (
              <div className="glass-card p-6 bg-accent/10 border-accent/20 animate-pulse">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-3 tracking-widest">Action Required: Setup</h3>
                <p className="text-[11px] text-white/70 leading-relaxed mb-4">
                  Neural engine is offline. Please finalize local environment variables (`.env`) to enable live synthesis.
                </p>
                <button className="text-[10px] font-bold text-accent underline underline-offset-4 tracking-widest">VIEW SETUP GUIDE</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="py-12 border-t border-white/5 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
          <p className="text-[9px] font-mono tracking-[0.4em] uppercase text-white">
            Runek Neural Core • Optimized for Ignacy Januszek
          </p>
          <div className="flex gap-8 text-[9px] font-bold uppercase tracking-widest text-white">
            <span className="cursor-help">Documentation</span>
            <span className="cursor-help">System Status: 99.8%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
