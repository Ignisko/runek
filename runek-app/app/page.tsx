"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Job, AgentLog, AgentStatus } from "../lib/types/job";
import { TailoredContent } from "../lib/types/job";

// ── Helpers ──────────────────────────────────────────────────────────────────

function priorityColor(priority: Job['priority']) {
  return {
    critical: '#ff2d2d',
    high:     '#ffa500',
    medium:   '#00f5ff',
    low:      '#ffffff40',
  }[priority] ?? '#ffffff40';
}

function scoreColor(score: number) {
  if (score >= 88) return '#ff2d2d';
  if (score >= 75) return '#ffa500';
  if (score >= 55) return '#00f5ff';
  return '#ffffff30';
}

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tailoring, setTailoring] = useState<string | null>(null);
  const [tailored, setTailored] = useState<TailoredContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [apiKey, setApiKey] = useState<string>('');
  const logRef = useRef<HTMLDivElement>(null);

  // Persist API key to localStorage
  useEffect(() => {
    const stored = localStorage.getItem('runek-api-key');
    if (stored) setApiKey(stored);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('runek-api-key', key);
  };

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [jobsRes, statusRes] = await Promise.all([
        fetch('/api/agent/jobs'),
        fetch('/api/agent/status'),
      ]);
      const jobsData = await jobsRes.json();
      const statusData = await statusRes.json();
      setJobs(jobsData.data.jobs ?? []);
      setLogs(jobsData.data.logs ?? []);
      setStatus(statusData.data ?? null);
    } catch (e) {
      console.error('[HUD] fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + poll every 8s
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 8000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Tick for live clock
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleTailor = async (jobId: string) => {
    setTailoring(jobId);
    setTailored(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['X-Api-Key'] = apiKey;
      const res = await fetch('/api/agent/tailor', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!data.ok && data.hint) {
        alert(`API Key error: ${data.error}\n\n${data.hint}`);
        return;
      }
      setTailored(data.data);
      fetchAll();
    } finally {
      setTailoring(null);
    }
  };

  const handleStatus = async (jobId: string, newStatus: Job['status']) => {
    await fetch(`/api/agent/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchAll();
  };

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selected || e.target instanceof HTMLInputElement) return;
      if (e.key === 't' || e.key === 'T') handleTailor(selected);
      if (e.key === 'd' || e.key === 'D') handleStatus(selected, 'discarded');
      if (e.key === 'a' || e.key === 'A') handleStatus(selected, 'applied');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected]);

  // ── Active missions (non-discarded) ───────────────────────────────────────

  const activeMissions = jobs.filter(j => j.status !== 'discarded');
  const selectedJob = jobs.find(j => j.id === selected);

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
      className="min-h-screen bg-black text-white overflow-hidden"
    >
      {/* ── COMMAND BAR ──────────────────────────────────────────────────────── */}
      <header className="border-b border-white/10 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xl font-black tracking-[0.3em] text-white" style={{ fontFamily: 'var(--font-outfit, sans-serif)' }}>
              RUN<span className="text-[#00f5ff]">EK</span>
              <span className="text-[10px] text-white/20 ml-2 tracking-widest">v0.2</span>
            </span>
            <span className="text-[10px] text-white/20 font-mono">COMMAND CENTER // SYSTEMS PM OPERATIONS</span>
          </div>
          <div className="flex items-center gap-8">
            {/* Live stats */}
            {status && (
              <div className="hidden md:flex gap-6 text-[10px] font-mono">
                <span><span className="text-[#ff2d2d]">{status.pipeline.queued}</span> <span className="text-white/30">QUEUED</span></span>
                <span><span className="text-[#00f5ff]">{status.pipeline.suggested}</span> <span className="text-white/30">ACTIVE</span></span>
                <span><span className="text-[#ffa500]">{status.pipeline.tailored}</span> <span className="text-white/30">SYNTHESIZED</span></span>
                <span><span className="text-[#00ff41]">{status.pipeline.applied}</span> <span className="text-white/30">DEPLOYED</span></span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] shadow-[0_0_6px_#00ff41] animate-pulse" />
              <span className="text-[#00ff41]">AGENT ONLINE</span>
            </div>
            <span className="text-[10px] text-white/20 tabular-nums">
              {new Date().toLocaleTimeString('en-GB')}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-6 grid grid-cols-12 gap-6 h-[calc(100vh-3.5rem)]">

        {/* ── MISSION FEED (col 1–7) ──────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 overflow-hidden">
          {/* Feed header */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.3em] text-white/30 font-mono uppercase">
              Mission Feed // {activeMissions.length} Active Targets
            </span>
            <div className="flex items-center gap-4 text-[9px] font-mono text-white/20">
              <span className="text-[#ff2d2d]">■</span> CRITICAL
              <span className="text-[#ffa500]">■</span> HIGH
              <span className="text-[#00f5ff]">■</span> MEDIUM
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="text-[9px] font-mono text-white/15 border border-white/5 rounded px-3 py-1.5 bg-white/[0.02]">
            SELECT MISSION → <span className="text-white/30">[T]</span> Synthesize &nbsp;
            <span className="text-white/30">[A]</span> Mark Applied &nbsp;
            <span className="text-white/30">[D]</span> Discard
          </div>

          {/* Job list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-8 h-8 border border-[#00f5ff]/30 border-t-[#00f5ff] rounded-full animate-spin" />
                <span className="text-[10px] font-mono text-white/20 tracking-widest animate-pulse">
                  INITIALIZING NEURAL PIPELINE...
                </span>
              </div>
            ) : activeMissions.map(job => (
              <MissionCard
                key={job.id}
                job={job}
                isSelected={selected === job.id}
                isTailoring={tailoring === job.id}
                onClick={() => setSelected(job.id === selected ? null : job.id)}
                onTailor={() => handleTailor(job.id)}
                onDiscard={() => handleStatus(job.id, 'discarded')}
                onApplied={() => handleStatus(job.id, 'applied')}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL (col 8–12) ───────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 overflow-hidden">

          {/* Signal Panel */}
          <SignalPanel status={status} lastIngested={status?.lastIngest} />

          {/* API Key Panel */}
          <ApiKeyPanel apiKey={apiKey} onSave={saveApiKey} />

          {/* Mission Detail / Tailoring Result */}
          {tailored ? (
            <TailoredPanel tailored={tailored} onClear={() => setTailored(null)} />
          ) : selectedJob ? (
            <MissionDetail job={selectedJob} isTailoring={tailoring === selectedJob.id} onTailor={() => handleTailor(selectedJob.id)} />
          ) : (
            <EmptyDetail />
          )}

          {/* Operator Log */}
          <div ref={logRef} className="flex-1 overflow-hidden border border-white/5 rounded bg-black">
            <div className="px-3 py-2 border-b border-white/5 text-[9px] font-mono text-white/20 tracking-[0.2em]">
              OPERATOR LOG // LAST {logs.length} EVENTS
            </div>
            <div className="overflow-y-auto h-[calc(100%-2rem)] p-3 space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3 text-[9px] font-mono leading-relaxed">
                  <span className="text-white/15 whitespace-nowrap tabular-nums">{formatTime(log.timestamp)}</span>
                  <span className="text-[#00f5ff]/60 uppercase w-20 flex-shrink-0">{log.action}</span>
                  <span className="text-white/30 truncate">{log.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MissionCard({ job, isSelected, isTailoring, onClick, onTailor, onDiscard, onApplied }: {
  job: Job;
  isSelected: boolean;
  isTailoring: boolean;
  onClick: () => void;
  onTailor: () => void;
  onDiscard: () => void;
  onApplied: () => void;
}) {
  const pc = priorityColor(job.priority);
  const sc = scoreColor(job.matchScore);

  return (
    <div
      onClick={onClick}
      style={{ borderColor: isSelected ? pc : 'rgba(255,255,255,0.06)' }}
      className="border rounded cursor-pointer transition-all duration-200 bg-white/[0.02] hover:bg-white/[0.04]"
    >
      {/* Status bar */}
      <div className="h-[2px] rounded-t" style={{ background: pc, opacity: isSelected ? 1 : 0.3 }} />

      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span style={{ color: sc, textShadow: `0 0 8px ${sc}` }} className="text-sm font-black tabular-nums">
                {job.matchScore}
              </span>
              <span className="text-white/15 text-[9px]">/100</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border" style={{ color: pc, borderColor: pc + '40' }}>
                {job.priority.toUpperCase()}
              </span>
              {job.status === 'tailored' && (
                <span className="text-[9px] font-mono text-[#00ff41] border border-[#00ff41]/30 px-1.5 py-0.5 rounded">
                  SYNTHESIZED
                </span>
              )}
              {job.status === 'applied' && (
                <span className="text-[9px] font-mono text-[#a020f0] border border-[#a020f0]/30 px-1.5 py-0.5 rounded">
                  DEPLOYED
                </span>
              )}
            </div>
            <p className="font-bold text-white text-sm truncate">{job.title}</p>
            <p className="text-[11px] text-white/40 font-mono">{job.company} // {job.location}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-[9px] text-white/20 font-mono mb-1">{job.category.toUpperCase()}</div>
            <div className="text-[9px] text-white/15 font-mono">{job.source}</div>
          </div>
        </div>

        {/* Signals */}
        {job.matchSignals && job.matchSignals.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {job.matchSignals.slice(0, 4).map(s => (
              <span key={s} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/30">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Action row — only when selected */}
        {isSelected && (
          <div className="mt-3 pt-3 border-t border-white/5 flex gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={onTailor}
              disabled={isTailoring}
              className="flex-1 py-2 text-[10px] font-black tracking-widest rounded transition-all duration-200"
              style={{
                background: isTailoring ? 'rgba(0,245,255,0.05)' : 'linear-gradient(135deg, #00f5ff, #00d4ff)',
                color: isTailoring ? '#00f5ff' : '#000',
                border: isTailoring ? '1px solid rgba(0,245,255,0.3)' : 'none',
              }}
            >
              {isTailoring ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                  SYNTHESIZING...
                </span>
              ) : 'SYNTHESIZE [T]'}
            </button>
            <button onClick={onApplied} className="px-3 py-2 text-[10px] font-bold border border-[#00ff41]/20 text-[#00ff41] rounded hover:bg-[#00ff41]/10 transition-colors">A</button>
            <button onClick={onDiscard} className="px-3 py-2 text-[10px] font-bold border border-white/10 text-white/30 rounded hover:bg-white/5 transition-colors">D</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SignalPanel({ status, lastIngested }: { status: AgentStatus | null; lastIngested?: string }) {
  return (
    <div className="border border-white/5 rounded bg-white/[0.01] p-4 space-y-4">
      <span className="text-[9px] tracking-[0.3em] text-white/20 font-mono">SIGNAL PANEL // AGENT TELEMETRY</span>
      <div className="grid grid-cols-3 gap-4">
        <StatBlock label="AI ENGINE" value={status?.aiReady ? 'ONLINE' : 'OFFLINE'} color={status?.aiReady ? '#00ff41' : '#ff2d2d'} />
        <StatBlock label="LAST INGEST" value={formatTime(lastIngested)} color="#00f5ff" />
        <StatBlock label="PIPELINE" value={`${status?.pipeline.total ?? 0} OPS`} color="#ffa500" />
      </div>
      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
        <div className="flex justify-between text-white/20">
          <span>SYNTHESIZED</span><span className="text-[#ffa500]">{status?.pipeline.tailored ?? 0}</span>
        </div>
        <div className="flex justify-between text-white/20">
          <span>DEPLOYED</span><span className="text-[#00ff41]">{status?.pipeline.applied ?? 0}</span>
        </div>
        <div className="flex justify-between text-white/20">
          <span>QUEUED</span><span className="text-[#ff2d2d]">{status?.pipeline.queued ?? 0}</span>
        </div>
        <div className="flex justify-between text-white/20">
          <span>ACTIVE</span><span className="text-[#00f5ff]">{status?.pipeline.suggested ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[8px] text-white/20 font-mono mb-1">{label}</div>
      <div className="text-sm font-black tabular-nums" style={{ color, textShadow: `0 0 8px ${color}60` }}>{value}</div>
    </div>
  );
}

function MissionDetail({ job, isTailoring, onTailor }: { job: Job; isTailoring: boolean; onTailor: () => void }) {
  return (
    <div className="border border-white/5 rounded bg-white/[0.01] p-4 flex flex-col gap-3">
      <span className="text-[9px] tracking-[0.3em] text-white/20 font-mono">MISSION BRIEF // {job.id.toUpperCase()}</span>
      <div>
        <h3 className="font-black text-white">{job.title}</h3>
        <p className="text-[11px] text-[#00f5ff]/60 font-mono">{job.company} // {job.location}</p>
      </div>
      <p className="text-[11px] text-white/30 leading-relaxed font-mono line-clamp-4">{job.description}</p>
      {job.matchReason && (
        <p className="text-[10px] text-[#00f5ff]/50 italic font-mono border-l-2 border-[#00f5ff]/20 pl-3">{job.matchReason}</p>
      )}
      <div className="flex gap-2">
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="text-[9px] font-mono text-white/20 hover:text-white/50 border border-white/5 px-2 py-1 rounded transition-colors">
            VIEW ORIGINAL ↗
          </a>
        )}
        <a href={`/api/agent/export/${job.id}?format=markdown`} download
          className="text-[9px] font-mono text-white/20 hover:text-white/50 border border-white/5 px-2 py-1 rounded transition-colors">
          EXPORT MD ↓
        </a>
      </div>
    </div>
  );
}

function TailoredPanel({ tailored, onClear }: { tailored: TailoredContent; onClear: () => void }) {
  return (
    <div className="border border-[#00f5ff]/20 rounded bg-[#00f5ff]/[0.03] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] tracking-[0.3em] text-[#00f5ff]/60 font-mono">SYNTHESIS OUTPUT // COMPLETE</span>
        <button onClick={onClear} className="text-[9px] text-white/20 hover:text-white/50 font-mono">[ CLR ]</button>
      </div>

      {tailored.matchHighlights.length > 0 && (
        <div className="space-y-1">
          {tailored.matchHighlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-[#00ff41] text-[8px]">◆</span>
              <span className="text-white/50">{h}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-black/40 rounded p-3 border border-white/5">
        <div className="text-[8px] text-white/20 font-mono mb-2">COVER LETTER EXTRACT</div>
        <p className="text-[10px] text-white/50 font-mono leading-relaxed line-clamp-6 whitespace-pre-wrap">
          {tailored.coverLetter}
        </p>
      </div>

      <div className="flex gap-2">
        <a href={`/api/agent/export/${tailored.jobId}?format=markdown`} download
          className="flex-1 py-2 text-center text-[9px] font-black tracking-widest bg-white text-black rounded hover:opacity-90 transition-opacity">
          DOWNLOAD MANIFEST
        </a>
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="border border-dashed border-white/5 rounded flex flex-col items-center justify-center p-8 gap-3 text-center">
      <div className="w-10 h-10 rounded border border-white/10 flex items-center justify-center">
        <span className="text-white/10 text-lg font-mono">?</span>
      </div>
      <p className="text-[9px] font-mono text-white/15 leading-relaxed tracking-wide">
        SELECT A MISSION TARGET<br />TO VIEW BRIEF
      </p>
      <p className="text-[8px] font-mono text-white/10">OR POST TO /api/agent/ingest</p>
    </div>
  );
}

function ApiKeyPanel({ apiKey, onSave }: { apiKey: string; onSave: (k: string) => void }) {
  const [input, setInput] = React.useState(apiKey);
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    onSave(input.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="border border-white/5 rounded bg-white/[0.01] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] tracking-[0.3em] text-white/20 font-mono">OPERATOR API KEY</span>
        <span className="text-[8px] font-mono text-white/10">BYOK — your credits only</span>
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          placeholder="AIzaSy..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-[10px] font-mono text-white/60 placeholder:text-white/15 focus:outline-none focus:border-[#00f5ff]/30"
        />
        <button
          onClick={handleSave}
          className="px-3 py-2 text-[9px] font-black border rounded transition-all"
          style={{
            borderColor: saved ? '#00ff41' : 'rgba(0,245,255,0.2)',
            color: saved ? '#00ff41' : '#00f5ff',
          }}
        >
          {saved ? 'SAVED ✓' : 'SET'}
        </button>
      </div>
      <p className="text-[8px] font-mono text-white/15 leading-relaxed">
        Get a free key at <span className="text-white/30">aistudio.google.com</span>.
        Stored locally — never sent to our servers.
      </p>
    </div>
  );
}
