"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Job, AgentLog, AgentStatus, TailoredContent } from "../lib/types/job";
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User, syncProfileToCloud, getProfileFromCloud, syncJobToCloud } from "../lib/services/firebase";

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreGrade(s: number): { color: string; bg: string; label: string; glow: string } {
  if (s >= 88) return { color: "#ff6b6b", bg: "rgba(255,107,107,0.12)", label: "S", glow: "0 0 12px rgba(255,107,107,0.4)" };
  if (s >= 75) return { color: "#ffb347", bg: "rgba(255,179,71,0.12)", label: "A", glow: "0 0 12px rgba(255,179,71,0.3)" };
  if (s >= 55) return { color: "#4f8fff", bg: "rgba(79,143,255,0.12)", label: "B", glow: "0 0 12px rgba(79,143,255,0.35)" };
  return { color: "#3d5a7a", bg: "rgba(61,90,122,0.15)", label: "C", glow: "none" };
}

function priorityColor(p: Job["priority"]) {
  return { critical: "#ff6b6b", high: "#ffb347", medium: "#4f8fff", low: "#3d5a7a" }[p] ?? "#3d5a7a";
}

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  return { copied, copy };
}

interface OutreachDraft {
  linkedinMessage: string;
  emailSubject: string;
  emailBody: string;
  suggestedContact: string;
  mock?: boolean;
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  padding: 20,
  backdropFilter: "blur(12px)",
};

const glassHover: React.CSSProperties = {
  ...glass,
  borderColor: "var(--border-default)",
};

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tailoring, setTailoring] = useState<string | null>(null);
  const [isBatching, setIsBatching] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isRunningRunek, setIsRunningRunek] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tailored, setTailored] = useState<TailoredContent | null>(null);
  const [outreach, setOutreach] = useState<OutreachDraft | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<Record<number, boolean>>({});
  const [viewMode, setViewMode] = useState<Job["status"] | "all">("open");
  const [scrapeKeyword, setScrapeKeyword] = useState("product manager");
  const [missionLogs, setMissionLogs] = useState<{ timestamp: string; action: string; message: string }[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const jr = await fetch("/api/agent/jobs");
      const jd = await jr.json();
      setJobs(jd.data.jobs ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/mission-logs");
      const d = await res.json();
      if (d.ok) setMissionLogs(d.data);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (user) {
      getProfileFromCloud(user.uid).then(cloudProfile => {
        if (cloudProfile) {
          fetch('/api/agent/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cloudProfile)
          }).then(() => fetchAll());
        }
      });
    }
  }, [user, fetchAll]);

  useEffect(() => {
    fetchAll();
    fetchLogs();
    const i = setInterval(() => {
      fetchAll();
      fetchLogs();
    }, 2000);
    return () => clearInterval(i);
  }, [fetchAll, fetchLogs]);

  const authHeaders = (extra?: Record<string, string>) => {
    const h: Record<string, string> = { "Content-Type": "application/json", ...extra };
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('runek_api_key') : null;
    if (apiKey) h['X-Api-Key'] = apiKey;
    return h;
  };

  useEffect(() => {
    fetch('/api/agent/profile').then(r => r.json()).then(d => {
      if (d.data && d.data.name === "Ignacy Januszek" && !localStorage.getItem('runek_profile_set')) {
        setShowSettings(true);
      }
    });
  }, []);

  const handleTailor = async (jobId: string) => {
    setTailoring(jobId);
    try {
      const res = await fetch("/api/agent/tailor", { method: "POST", headers: authHeaders(), body: JSON.stringify({ jobId }) });
      const data = await res.json();
      if (!data.ok) { alert(data.error + (data.hint ? `\n\n${data.hint}` : "")); return; }
      setTailored(data.data);
      fetchAll();
    } finally { setTailoring(null); }
  };

  const handleBatchTailor = async () => {
    setIsBatching(true);
    // Only synthesize open jobs that aren't already synthesized
    const openJobs = jobs.filter(j => j.status === "open");
    for (const job of openJobs) {
      await handleTailor(job.id);
    }
    setIsBatching(false);
  };

  const handleScrape = async () => {
    if (!scrapeKeyword.trim()) return alert("Enter keywords to scrape.");
    setIsScraping(true);
    try {
      const res = await fetch("/api/agent/scrape", { 
        method: "POST", 
        headers: authHeaders(), 
        body: JSON.stringify({ keywords: scrapeKeyword, count: 30 }) 
      });
      const data = await res.json();
      if (data.ok) {
        alert(`Successfully ingested ${data.data.newJobsCount} new jobs!`);
        fetchAll();
      } else {
        alert(`Scrape failed: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error triggering scrape.");
    } finally {
      setIsScraping(false);
    }
  };

  const handleRunek = async () => {
    setIsRunningRunek(true);
    try {
      const res = await fetch("/api/agent/runek", { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (data.ok) {
        alert("Runek AI Job Assistant has started applying in the background!");
        fetchAll();
      } else {
        alert(`Failed to start Runek: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error triggering Runek.");
    } finally {
      setIsRunningRunek(false);
    }
  };

  const handleOutreach = async (jobId: string) => {
    setOutreachLoading(true);
    try {
      const res = await fetch("/api/agent/outreach", { method: "POST", headers: authHeaders(), body: JSON.stringify({ jobId }) });
      const data = await res.json();
      if (data.ok) setOutreach(data.data);
    } finally { setOutreachLoading(false); }
  };

  const handleStatusUpdate = async (jobId: string, newStatus: Job["status"]) => {
    // Update Local Backend
    await fetch(`/api/agent/jobs/${jobId}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status: newStatus }) });
    
    // Sync to Cloud if Logged In
    if (user) {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        try { await syncJobToCloud(user.uid, { ...job, status: newStatus }); } catch (e) { console.error("Cloud job sync failed:", e); }
      }
    }

    fetchAll();
  };

  const handleNotes = async (jobId: string, notes: string) => {
    await fetch(`/api/agent/jobs/${jobId}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ notes }) });
  };

  const handleUpdateJob = async (jobId: string, patch: Partial<Job>) => {
    await fetch(`/api/agent/jobs/${jobId}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(patch) });
    fetchAll();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!selected || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "t" || e.key === "T") handleTailor(selected);
      if (e.key === "d" || e.key === "D") handleStatusUpdate(selected, "discarded");
      if (e.key === "a" || e.key === "A") handleStatusUpdate(selected, "applied");
      if (e.key === "o" || e.key === "O") { const j = jobs.find(j => j.id === selected); if (j?.url) window.open(j.url, "_blank"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selected, jobs]);

  const displayJobs = jobs
    .filter(j => viewMode === "all" ? j.status !== "discarded" : j.status === viewMode)
    .sort((a, b) => (new Date(b.appliedAt || 0).getTime() || 0) - (new Date(a.appliedAt || 0).getTime() || 0) || b.matchScore - a.matchScore);
  const selectedJob = jobs.find(j => j.id === selected);

  return (
    <div suppressHydrationWarning style={{ minHeight: "100vh", background: "var(--bg-base)", position: "relative" }}>

      {/* ── NAV ── */}
      <header style={{
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(6,13,24,0.9)",
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 28px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Run</span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: "var(--blue-core)" }}>ek</span>
            </div>
            <div style={{ height: 16, width: 1, background: "var(--border-subtle)" }} />
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>Autonomous Career Agent</span>
          </div>

          {/* Header Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <button onClick={handleRunek} disabled={isRunningRunek} style={{ background: isRunningRunek ? "var(--bg-hover)" : "var(--blue-core)", border: "none", borderRadius: 8, padding: "8px 16px", cursor: isRunningRunek ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "baseline", gap: 2, boxShadow: isRunningRunek ? "none" : "0 0 12px rgba(79,143,255,0.4)" }}>
                {isRunningRunek ? (
                   <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}>Mission Running...</span>
                ) : (
                   <>
                     <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: "0.05em", color: "#8ab4f8" }}>AUTOPILOT</span>
                     <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: "0.05em", color: "#ffffff" }}> mode</span>
                   </>
                )}
              </button>
              {isRunningRunek && missionLogs.length > 0 && (
                <div style={{ fontSize: 10, color: "var(--blue-bright)", fontWeight: 600, animation: "pulse 2s infinite", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  📡 {missionLogs[0].message}
                </div>
              )}
            </div>

            <div style={{ height: 24, width: 1, background: "var(--border-subtle)", margin: "0 4px" }} />

            <div style={{ display: "flex", alignItems: "center", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "2px 4px" }}>
              <input 
                value={scrapeKeyword}
                onChange={e => setScrapeKeyword(e.target.value)}
                placeholder="Keywords (e.g. AI PM)"
                style={{ background: "transparent", border: "none", color: "#fff", padding: "6px 10px", fontSize: 13, outline: "none", width: 160 }}
              />
              <button 
                onClick={handleScrape} 
                disabled={isScraping} 
                style={{ background: isScraping ? "var(--bg-hover)" : "var(--blue-core)", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: isScraping ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s" }}
              >
                {isScraping ? "Scraping..." : "Scrape"}
              </button>
            </div>
            
            <button onClick={() => setShowSettings(true)} style={{ background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
              Profile
            </button>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 28px", display: "grid", gridTemplateColumns: "1fr 400px", gap: 24, alignItems: "start" }}>

        {/* ── LEFT: JOB FEED ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Feed header with Tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 10px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 16 }}>
            {[
              { id: "open", label: "Open" },
              { id: "applied", label: "Applied" },
              { id: "discarded", label: "Archived" }
            ].map(cat => {
              const count = jobs.filter(j => j.status === cat.id).length;
              return (
                <button 
                  key={cat.id}
                  onClick={() => setViewMode(cat.id as any)}
                  style={{ background: viewMode === cat.id ? "var(--bg-hover)" : "transparent", border: `1px solid ${viewMode === cat.id ? "var(--border-strong)" : "transparent"}`, borderRadius: 8, color: viewMode === cat.id ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: "6px 12px", fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s" }}
                >
                  {cat.label} <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, opacity: 0.7 }}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loading ? (
              <div style={{ ...glass, padding: 48, textAlign: "center" }}>
                <div style={{ width: 32, height: 32, border: "2px solid var(--border-default)", borderTopColor: "var(--blue-core)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>Loading opportunities…</p>
              </div>
            ) : displayJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                isSelected={selected === job.id}
                isTailoring={tailoring === job.id}
                onClick={() => { setSelected(job.id === selected ? null : job.id); setTailored(null); setOutreach(null); setChecklist({}); }}
                onTailor={() => handleTailor(job.id)}
                onOpen={() => { if (job.url) window.open(job.url, "_blank"); }}
                onApplied={() => handleStatusUpdate(job.id, "applied")}
                onDiscard={() => handleStatusUpdate(job.id, "discarded")}
                onNotes={(n) => handleNotes(job.id, n)}
                onStatusChange={(s) => handleStatusUpdate(job.id, s as any)}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: SIDEBAR ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 78, maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>

          {tailored && selectedJob ? (
            <ApplicationChecklist
              job={selectedJob}
              tailored={tailored}
              outreach={outreach}
              outreachLoading={outreachLoading}
              checklist={checklist}
              onCheckStep={i => setChecklist(c => ({ ...c, [i]: !c[i] }))}
              onGenerateOutreach={() => handleOutreach(selectedJob.id)}
              onMarkApplied={() => { handleStatusUpdate(selectedJob.id, "applied"); setChecklist({ 0: true, 1: true, 2: true, 3: true, 4: true }); }}
            />
          ) : selectedJob ? (
            <MissionBrief job={selectedJob} isTailoring={tailoring === selectedJob.id} onTailor={() => handleTailor(selectedJob.id)} onUpdate={(patch) => handleUpdateJob(selectedJob.id, patch)} />
          ) : (
            <div style={{ ...glass, textAlign: "center", padding: 48, color: "var(--text-tertiary)" }}>
              <p>Select a job to view mission details</p>
            </div>
          )}

          {missionLogs.length > 0 && <MissionLogPanel logs={missionLogs} />}
        </div>
      </div>
      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} user={user} />
    </div>
  );
}

// ── JobCard ───────────────────────────────────────────────────────────────────

function JobCard({ job, isSelected, isTailoring, onClick, onTailor, onOpen, onApplied, onDiscard, onNotes, onStatusChange }: 
  { job: Job, isSelected: boolean, isTailoring: boolean, onClick: () => void, onTailor: () => void, onOpen: () => void, onApplied: () => void, onDiscard: () => void, onNotes: (n: string) => void, onStatusChange?: (s: Job["status"]) => void }) {
  const grade = scoreGrade(job.matchScore);
  const [noteVal, setNoteVal] = useState(job.notes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const isTracked = ['applied', 'interviewing', 'offer_received', 'accepted', 'rejected', 'no_answer'].includes(job.status);
  
  const statusColors: Record<string, string> = {
    applied: "#c084fc",
    interviewing: "#60a5fa",
    offer_received: "#fbbf24",
    accepted: "#4ade80",
    rejected: "#f87171",
    no_answer: "#9ca3af"
  };

  const statusChip: Record<string, { label: string; color: string; bg: string }> = {
    synthesized: { label: "Synthesized", color: "#ffb347", bg: "rgba(255,179,71,0.1)" },
    applied: { label: "Applied ✓", color: "#c084fc", bg: "rgba(192,132,252,0.1)" },
    open: { label: "", color: "", bg: "" },
    discarded: { label: "", color: "", bg: "" },
  };

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        background: isSelected ? "var(--bg-hover)" : "var(--bg-card)",
        border: `1px solid ${isSelected ? "var(--border-strong)" : "var(--border-subtle)"}`,
        borderRadius: 12,
        cursor: "pointer",
        transition: "all 0.18s ease",
        boxShadow: isSelected ? "var(--glow-blue)" : "none",
        overflow: "hidden",
        animation: "slide-in 0.2s ease",
      }}
    >
      {/* Left accent bar */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: isTracked ? statusColors[job.status] : grade.color, opacity: isSelected ? 1 : 0.4, borderRadius: "12px 0 0 12px" }} />

          <div style={{ padding: "16px 18px 16px 22px" }} onClick={(e) => {
            e.stopPropagation();
            onClick();
            if (job.status === "open" && !isTailoring) {
              onTailor();
            }
          }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 10 }}>
          {/* Score badge — game rank style */}
          <div style={{
            width: 48, height: 48, flexShrink: 0, borderRadius: 10,
            background: grade.bg, border: `1px solid ${grade.color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: grade.color, fontFamily: "'Space Grotesk', sans-serif" }}>{job.matchScore}</span>
          </div>

          {/* Title block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
              {isTracked ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: statusColors[job.status], background: `${statusColors[job.status]}15`, borderRadius: 5, padding: "2px 8px", textTransform: "uppercase" }}>
                  {job.status}
                </span>
              ) : statusChip[job.status]?.label && (
                <span style={{ fontSize: 11, fontWeight: 600, color: statusChip[job.status].color, background: statusChip[job.status].bg, borderRadius: 5, padding: "2px 8px" }}>
                  {statusChip[job.status].label}
                </span>
              )}
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>Source: {job.source || "Direct"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
               <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em" }}>
                 {job.title}
               </h3>
               {job.status === "open" && <span style={{ fontSize: 9, fontWeight: 800, color: "var(--blue-bright)", border: "1px solid var(--blue-border)", borderRadius: 4, padding: "1px 5px", textTransform: "uppercase" }}>Next: Synthesize</span>}
               {job.status === "synthesized" && <span style={{ fontSize: 9, fontWeight: 800, color: "#ffb347", border: "1px solid rgba(255,179,71,0.4)", borderRadius: 4, padding: "1px 5px", textTransform: "uppercase" }}>Next: Review</span>}
            </div>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{job.company} · {job.location}</p>
            {job.visaRequirements && <p style={{ margin: "4px 0 0", fontSize: 10, color: "rgba(255,179,71,0.9)", fontWeight: 600, textTransform: "uppercase" }}>✈️ {job.visaRequirements}</p>}
          </div>
        </div>

        {/* Match score bar */}
        <div style={{ height: 3, background: "var(--bg-surface)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${job.matchScore}%`, background: `linear-gradient(90deg, ${grade.color}80, ${grade.color})`, borderRadius: 2, transition: "width 0.6s ease" }} />
        </div>

        {/* Signal chips */}
        {job.matchSignals && job.matchSignals.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 4 }}>
            {job.matchSignals.slice(0, 5).map(s => (
              <span key={s} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, background: "var(--blue-subtle)", border: "1px solid var(--blue-border)", color: "var(--blue-bright)", fontWeight: 500 }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Match reason — only when selected */}
        {isSelected && job.matchReason && (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--blue-bright)", borderLeft: "2px solid var(--blue-border)", paddingLeft: 10, lineHeight: 1.5, opacity: 0.9 }}>
            {job.matchReason}
          </p>
        )}

        {/* Action row — expanded */}
        {isSelected && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 8 }}>
              {!isTracked ? (
                <button
                  onClick={onTailor}
                  disabled={isTailoring}
                  style={{
                    flex: 1, padding: "11px 16px", borderRadius: 9, border: "none", cursor: "pointer",
                    background: isTailoring ? "var(--blue-subtle)" : "linear-gradient(135deg, var(--blue-core), #6ba3ff)",
                    color: isTailoring ? "var(--blue-bright)" : "#fff",
                    fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: isTailoring ? "none" : "var(--glow-blue)",
                    transition: "all 0.2s"
                  }}
                >
                  {isTailoring ? (
                    <><span style={{ width: 14, height: 14, border: "2px solid rgba(79,143,255,0.3)", borderTopColor: "var(--blue-bright)", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />Synthesizing…</>
                  ) : "✦ Synthesize  ·  T"}
                </button>
              ) : (
                <div style={{ flex: 1 }} />
              )}
              
              <ActionBtn onClick={onOpen} title="Open · O" label="↗" />
              {!isTracked && <ActionBtn onClick={onApplied} title="Applied · A" label="✓" color="#4ade80" borderColor="rgba(74,222,128,0.3)" />}
              <ActionBtn onClick={onDiscard} title="Discard · D" label="✕" />
            </div>

            {/* Inline Status Dropdown */}
            {onStatusChange && (
               <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                 <span style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Status</span>
                 <select 
                   value={job.status} 
                   onChange={e => { e.stopPropagation(); onStatusChange(e.target.value as Job["status"]); }} 
                   style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 6, padding: "4px 8px", fontSize: 12, outline: "none", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
                   {["open", "synthesized", "applied", "interviewing", "offer_received", "accepted", "rejected", "no_answer", "discarded"].map(s => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s.replace("_", " ")}</option>)}
                 </select>
               </div>
            )}

            {/* Notes */}
            <div style={{ position: "relative" }}>
              <textarea
                value={noteVal}
                onChange={e => setNoteVal(e.target.value)}
                onBlur={() => { onNotes(noteVal); setNoteSaved(true); setTimeout(() => setNoteSaved(false), 1500); }}
                placeholder="Notes… e.g. 'Spoke to recruiter' · 'Salary unclear'"
                rows={2} maxLength={280}
                style={{
                  width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 8,
                  padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", resize: "none",
                  outline: "none", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box",
                }}
              />
              {noteSaved && <span style={{ position: "absolute", right: 10, top: 10, fontSize: 11, color: "#4ade80" }}>Saved ✓</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, title, label, color = "var(--text-secondary)", borderColor = "var(--border-default)" }: { onClick: () => void; title: string; label: string; color?: string; borderColor?: string }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 42, height: 42, borderRadius: 9, border: `1px solid ${borderColor}`, background: "transparent", color, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
      {label}
    </button>
  );
}




// ── MissionBrief ──────────────────────────────────────────────────────────────

function MissionBrief({ job, isTailoring, onTailor, onUpdate }: { job: Job; isTailoring: boolean; onTailor: () => void; onUpdate: (patch: Partial<Job>) => void }) {
  const grade = scoreGrade(job.matchScore);

  return (
    <div style={glass}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Job Brief</p>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 9, background: grade.bg, border: `1.5px solid ${grade.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: grade.color, fontFamily: "'Space Grotesk', sans-serif" }}>{job.matchScore}</span>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em" }}>{job.title}</h3>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--blue-bright)" }}>{job.company} · {job.location}</p>
          {job.visaRequirements && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#ffb347", display: "flex", alignItems: "center", gap: 4 }}>✈️ {job.visaRequirements}</p>}
        </div>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{job.description}</p>
      {job.matchReason && <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--blue-bright)", borderLeft: "2px solid var(--blue-border)", paddingLeft: 10, lineHeight: 1.5 }}>{job.matchReason}</p>}
      {isTailoring && (
        <div style={{ width: "100%", padding: "12px", borderRadius: 9, background: "var(--blue-subtle)", color: "var(--blue-bright)", fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ width: 14, height: 14, border: "2px solid rgba(79,143,255,0.3)", borderTopColor: "var(--blue-bright)", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
          Synthesizing Profile...
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>View posting ↗</a>}
        <a href={`/api/agent/export/${job.id}?format=markdown`} download style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>Export ↓</a>
      </div>
    </div>
  );
}

// ── ApplicationChecklist ──────────────────────────────────────────────────────

function ApplicationChecklist({ job, tailored, outreach, outreachLoading, checklist, onCheckStep, onGenerateOutreach, onMarkApplied }: {
  job: Job; tailored: TailoredContent; outreach: OutreachDraft | null;
  outreachLoading: boolean; checklist: Record<number, boolean>;
  onCheckStep: (i: number) => void; onGenerateOutreach: () => void; onMarkApplied: () => void;
}) {
  const { copied, copy } = useCopy();
  const done = Object.values(checklist).filter(Boolean).length;
  const total = 5;
  const pct = (done / total) * 100;

  return (
    <div style={{ ...glass, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Application Checklist</p>
          <span style={{ fontSize: 12, color: pct === 100 ? "#4ade80" : "var(--blue-bright)", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{done}/{total}</span>
        </div>
        <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{job.company} · {job.title}</p>
        <div style={{ height: 4, background: "var(--bg-surface)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#4ade80" : "linear-gradient(90deg, var(--blue-core), var(--blue-bright))", borderRadius: 2, transition: "width 0.5s ease", boxShadow: pct > 0 ? "0 0 8px rgba(79,143,255,0.5)" : "none" }} />
        </div>
      </div>

      <CheckStep index={0} label="Review tailored CV" checked={!!checklist[0]} onToggle={() => onCheckStep(0)}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: 12, maxHeight: 120, overflowY: "auto", marginBottom: 8 }}>
          <pre style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>{tailored.cvMarkdown.slice(0, 600)}{tailored.cvMarkdown.length > 600 ? "\n…" : ""}</pre>
        </div>
        <CopyBtn text={tailored.cvMarkdown} label="Copy full CV" k="cv" copied={copied} onCopy={(t, k) => { copy(t, k); onCheckStep(0); }} />
      </CheckStep>

      <CheckStep index={1} label="Copy cover letter" checked={!!checklist[1]} onToggle={() => onCheckStep(1)}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: 12, maxHeight: 120, overflowY: "auto", marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{tailored.coverLetter}</p>
        </div>
        <CopyBtn text={tailored.coverLetter} label="Copy cover letter" k="cl" copied={copied} onCopy={(t, k) => { copy(t, k); onCheckStep(1); }} />
      </CheckStep>

      <CheckStep index={2} label="Draft cold outreach" checked={!!checklist[2]} onToggle={() => onCheckStep(2)}>
        {!outreach ? (
          <button onClick={onGenerateOutreach} disabled={outreachLoading} style={{ width: "100%", marginTop: 8, padding: "10px", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {outreachLoading ? "Generating…" : "Generate LinkedIn + Email outreach"}
          </button>
        ) : (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            {outreach.mock && <div style={{ fontSize: 11, color: "#ffb347", background: "rgba(255,179,71,0.08)", border: "1px solid rgba(255,179,71,0.2)", borderRadius: 7, padding: "7px 10px" }}>Preview — add API key for personalised outreach</div>}
            {[
              { title: `LinkedIn · ${outreach.suggestedContact}`, text: outreach.linkedinMessage, k: "li", full: outreach.linkedinMessage },
              { title: `Email · ${outreach.emailSubject}`, text: outreach.emailBody, k: "em", full: `Subject: ${outreach.emailSubject}\n\n${outreach.emailBody}` },
            ].map(({ title, text, k, full }) => (
              <div key={k} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 9, padding: 12 }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</p>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{text}</p>
                <CopyBtn text={full} label="Copy" k={k} copied={copied} onCopy={(t, kk) => { copy(t, kk); onCheckStep(2); }} />
              </div>
            ))}
          </div>
        )}
      </CheckStep>

      <CheckStep index={3} label="Open job posting" checked={!!checklist[3]} onToggle={() => onCheckStep(3)}>
        <button onClick={() => { if (job.url) { window.open(job.url, "_blank"); onCheckStep(3); } }} style={{ width: "100%", marginTop: 8, padding: "10px", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Open {job.company} application ↗
        </button>
      </CheckStep>

      <CheckStep index={4} label="Mark as applied" checked={!!checklist[4]} onToggle={() => onCheckStep(4)}>
        <button onClick={onMarkApplied} style={{ width: "100%", marginTop: 8, padding: "12px", borderRadius: 9, border: "none", background: checklist[4] ? "#4ade80" : "linear-gradient(135deg, var(--blue-core), #6ba3ff)", color: checklist[4] ? "#000" : "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", boxShadow: checklist[4] ? "0 4px 16px rgba(74,222,128,0.3)" : "0 4px 16px rgba(79,143,255,0.3)", transition: "all 0.2s" }}>
          {checklist[4] ? "✓ Applied — well done!" : "Confirm application sent"}
        </button>
      </CheckStep>

      <a href={`/api/agent/export/${job.id}?format=markdown`} download style={{ textAlign: "center", fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
        Download full application package ↓
      </a>
    </div>
  );
}

function CheckStep({ index, label, checked, onToggle, children }: { index: number; label: string; checked: boolean; onToggle: () => void; children?: React.ReactNode }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div style={{ border: `1px solid ${checked ? "rgba(74,222,128,0.2)" : "var(--border-subtle)"}`, borderRadius: 9, background: checked ? "rgba(74,222,128,0.04)" : "transparent", transition: "all 0.2s", overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "transparent", border: "none", cursor: "pointer" }}>
        <button onClick={e => { e.stopPropagation(); onToggle(); }} style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${checked ? "#4ade80" : "var(--border-strong)"}`, background: checked ? "#4ade80" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}>
          {checked && <span style={{ fontSize: 11, color: "#000", fontWeight: 800 }}>✓</span>}
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: checked ? "var(--text-tertiary)" : "var(--text-primary)", flex: 1, textAlign: "left", textDecoration: checked ? "line-through" : "none", fontFamily: "'Space Grotesk', sans-serif" }}>
          {String(index + 1).padStart(2, "0")}. {label}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && <div style={{ padding: "0 14px 14px" }}>{children}</div>}
    </div>
  );
}

function CopyBtn({ text, label, k, copied, onCopy }: { text: string; label: string; k: string; copied: string | null; onCopy: (t: string, k: string) => void }) {
  const isCopied = copied === k;
  return (
    <button onClick={() => onCopy(text, k)} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${isCopied ? "rgba(74,222,128,0.3)" : "var(--border-default)"}`, background: "transparent", color: isCopied ? "#4ade80" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
      {isCopied ? "Copied ✓" : label}
    </button>
  );
}

function ActivityLog({ logs }: { logs: AgentLog[] }) {
  if (logs.length === 0) return null;
  return (
    <div style={glass}>
      <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Activity</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {logs.slice(0, 6).map((log, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
            <span suppressHydrationWarning style={{ fontSize: 10, color: "var(--text-tertiary)", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(log.timestamp)}</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
              <span style={{ color: "var(--blue-bright)", fontWeight: 600 }}>{log.action} </span>{log.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MissionLogPanel({ logs }: { logs: any[] }) {
  return (
    <div style={glass}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 10px #4ade80" }} />
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Live Mission Feed</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {logs.slice(0, 5).map((log, i) => (
          <div key={i} style={{ fontSize: 11, color: i === 0 ? "var(--text-primary)" : "var(--text-secondary)", display: "flex", gap: 8, borderLeft: i === 0 ? "2px solid var(--blue-core)" : "1px solid var(--border-subtle)", paddingLeft: 8, opacity: 1 - (i * 0.15) }}>
            <span style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span style={{ fontWeight: log.action === "APPLIED" ? 700 : 400, color: log.action === "APPLIED" ? "#4ade80" : "inherit" }}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ ...glass, textAlign: "center", padding: 36 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--blue-subtle)", border: "1px solid var(--blue-border)", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 0 20px rgba(79,143,255,0.15)" }}>✦</div>
      <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Select an opportunity</p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Click any role to view the brief<br />and synthesize a tailored application
      </p>
    </div>
  );
}

// ── SettingsModal ─────────────────────────────────────────────────────────────

function SettingsModal({ show, onClose, user }: { show: boolean; onClose: () => void; user: User | null }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } catch (e) { console.error(e); }
  };

  const handleSignOut = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await fetch("/api/agent/upload-cv", { method: "POST", body: formData });
      alert("CV Uploaded Successfully");
    } catch (err) { console.error(err); }
    setUploading(false);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiKey(localStorage.getItem('runek_api_key') || "");
    }
  }, [show]);

  useEffect(() => {
    if (show && !profile) {
      setLoading(true);
      fetch('/api/agent/profile').then(r => r.json()).then(d => {
        setProfile(d.data);
        setLoading(false);
      });
    }
  }, [show, profile]);

  if (!show) return null;

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('runek_api_key', apiKey);
    localStorage.setItem('runek_profile_set', 'true');
    
    // Local Save
    await fetch('/api/agent/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });

    // Cloud Save
    if (user) {
      try { await syncProfileToCloud(user.uid, profile); } catch (e) { console.error("Cloud sync failed:", e); }
    }

    setSaving(false);
    onClose();
    window.location.reload();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-base)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 32, width: 800, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 24 }}>Global Profile Settings</h2>
          <button onClick={onClose} style={{ background: "transparent", color: "var(--text-tertiary)", border: "none", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
        
        {loading || !profile ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>Loading profile...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase" }}>Full Name</label>
                <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} style={{ width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "10px", borderRadius: 8, fontSize: 14 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase" }}>Current Title</label>
                <input value={profile.title} onChange={e => setProfile({...profile, title: e.target.value})} style={{ width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "10px", borderRadius: 8, fontSize: 14 }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase" }}>Target Region / Areas</label>
                <input value={profile.preferredHubs?.join(", ")} onChange={e => setProfile({...profile, preferredHubs: e.target.value.split(",").map(s => s.trim())})} placeholder="e.g. Warsaw, Berlin, Remote" style={{ width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "10px", borderRadius: 8, fontSize: 14 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase" }}>Visa Status</label>
                <input value={profile.visaRequirement} onChange={e => setProfile({...profile, visaRequirement: e.target.value})} placeholder="e.g. EU Citizen / Needs Sponsorship" style={{ width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "10px", borderRadius: 8, fontSize: 14 }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase" }}>Additional Skills / Tech Stack</label>
              <input value={profile.signals?.map(s => s.skill).join(", ")} onChange={e => setProfile({...profile, signals: e.target.value.split(",").map(s => ({ skill: s.trim(), weight: 1.0 }))})} placeholder="e.g. React, Python, Product Strategy" style={{ width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "10px", borderRadius: 8, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase" }}>Qwen / OpenAI API Key (Optional)</label>
              <input 
                type="password"
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
                placeholder="sk-..."
                style={{ width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "10px", borderRadius: 8, fontSize: 14 }} 
              />
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>Stored locally in your browser. Used for AI synthesis.</p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase" }}>Autopilot Resume (PDF)</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleCvUpload} 
                  disabled={uploading}
                  style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }} 
                />
                {uploading && <span style={{ fontSize: 11, color: "var(--blue-bright)" }}>Uploading...</span>}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>This PDF will be used by the Autopilot for all applications.</p>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Base CV / Resume Data (Markdown)</label>
                <span style={{ fontSize: 11, color: "var(--blue-bright)" }}>Engine's ground truth for synthesis</span>
              </div>
              <textarea 
                value={profile.baseCV} 
                onChange={e => setProfile({...profile, baseCV: e.target.value})} 
                style={{ width: "100%", height: 250, background: "var(--bg-surface)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)", padding: "14px", borderRadius: 8, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", resize: "vertical" }} 
              />
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase" }}>Cloud Sync (Firebase)</label>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: user ? "var(--blue-core)" : "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {user?.photoURL ? <img src={user.photoURL} alt="p" style={{ width: "100%" }} /> : <span style={{ fontSize: 14 }}>☁️</span>}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{user ? user.displayName : "Cloud Sync Offline"}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>{user ? "Your data is backed up to Firestore" : "Sign in to sync profile and application history"}</p>
                  </div>
                </div>
                {user ? (
                  <button onClick={handleSignOut} style={{ background: "transparent", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Sign Out</button>
                ) : (
                  <button onClick={handleGoogleLogin} style={{ background: "#fff", color: "#000", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>Sign in with Google</span>
                  </button>
                )}
              </div>
            </div>
            
            <button onClick={handleSave} disabled={saving} style={{ alignSelf: "flex-end", background: "var(--blue-core)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
