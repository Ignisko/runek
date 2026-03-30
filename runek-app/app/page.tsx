"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Job, AgentLog, AgentStatus, TailoredContent } from "../lib/types/job";

// ── Token helpers ─────────────────────────────────────────────────────────────

function priorityColor(p: Job["priority"]) {
  return {
    critical: "var(--color-critical)",
    high:     "var(--color-high)",
    medium:   "var(--color-medium)",
    low:      "var(--color-low)",
  }[p] ?? "var(--color-low)";
}

function scoreBadge(score: number) {
  if (score >= 88) return { bg: "rgba(248,81,73,0.12)", color: "var(--color-critical)", label: "Critical" };
  if (score >= 75) return { bg: "rgba(210,153,34,0.12)", color: "var(--color-high)", label: "High" };
  if (score >= 55) return { bg: "rgba(56,139,253,0.12)", color: "var(--color-medium)", label: "Medium" };
  return { bg: "rgba(72,79,88,0.2)", color: "var(--color-low)", label: "Low" };
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

// ── Shared styles ─────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 10,
  padding: "16px",
};

const btnPrimary: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
  transition: "opacity 0.15s",
};

const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "var(--text-secondary)",
  border: "1px solid var(--border-default)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.15s",
};

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tailoring, setTailoring] = useState<string | null>(null);
  const [tailored, setTailored] = useState<TailoredContent | null>(null);
  const [outreach, setOutreach] = useState<OutreachDraft | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [checklist, setChecklist] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const k = localStorage.getItem("runek-api-key");
    if (k) setApiKey(k);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("runek-api-key", key);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [jr, sr] = await Promise.all([fetch("/api/agent/jobs"), fetch("/api/agent/status")]);
      const jd = await jr.json();
      const sd = await sr.json();
      setJobs(jd.data.jobs ?? []);
      setLogs(jd.data.logs ?? []);
      setStatus(sd.data ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const i = setInterval(fetchAll, 10000);
    return () => clearInterval(i);
  }, [fetchAll]);

  const authHeaders = (extra?: Record<string, string>) => {
    const h: Record<string, string> = { "Content-Type": "application/json", ...extra };
    if (apiKey) h["X-Api-Key"] = apiKey;
    return h;
  };

  const handleTailor = async (jobId: string) => {
    setTailoring(jobId);
    setTailored(null);
    setOutreach(null);
    setChecklist({});
    try {
      const res = await fetch("/api/agent/tailor", { method: "POST", headers: authHeaders(), body: JSON.stringify({ jobId }) });
      const data = await res.json();
      if (!data.ok) { alert(data.error + (data.hint ? `\n\n${data.hint}` : "")); return; }
      setTailored(data.data);
      fetchAll();
    } finally {
      setTailoring(null);
    }
  };

  const handleOutreach = async (jobId: string) => {
    setOutreachLoading(true);
    try {
      const res = await fetch("/api/agent/outreach", { method: "POST", headers: authHeaders(), body: JSON.stringify({ jobId }) });
      const data = await res.json();
      if (data.ok) setOutreach(data.data);
    } finally {
      setOutreachLoading(false);
    }
  };

  const handleStatusUpdate = async (jobId: string, newStatus: Job["status"]) => {
    await fetch(`/api/agent/jobs/${jobId}/status`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status: newStatus }) });
    fetchAll();
  };

  const handleNotes = async (jobId: string, notes: string) => {
    await fetch(`/api/agent/jobs/${jobId}/notes`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ notes }) });
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

  const activeMissions = jobs.filter(j => j.status !== "discarded").sort((a, b) => b.matchScore - a.matchScore);
  const selectedJob = jobs.find(j => j.id === selected);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* ── NAV ── */}
      <header style={{
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "0.1em", color: "var(--text-primary)" }}>
              Run<span style={{ color: "var(--accent)" }}>ek</span>
            </span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", borderLeft: "1px solid var(--border-subtle)", paddingLeft: 16 }}>
              Job Application Engine
            </span>
          </div>

          {/* Status bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {status && (
              <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--text-secondary)" }}>
                {[
                  ["Queued", status.pipeline.queued, "var(--text-secondary)"],
                  ["Active", status.pipeline.suggested, "var(--accent)"],
                  ["Synthesized", status.pipeline.tailored, "var(--color-high)"],
                  ["Applied", status.pipeline.applied, "var(--color-success)"],
                ].map(([label, val, color]) => (
                  <span key={label as string} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600, color: color as string }}>{val as number}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>{label as string}</span>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-success)", flexShrink: 0 }} />
              <span style={{ color: "var(--color-success)", fontWeight: 500 }}>Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 24px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>

        {/* ── LEFT: FEED ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* Feed header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                Job Feed
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                {activeMissions.length} opportunities · ranked by match
              </p>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "6px 12px" }}>
              <span style={{ color: "var(--text-secondary)" }}>T</span> synthesize &nbsp;
              <span style={{ color: "var(--text-secondary)" }}>O</span> open &nbsp;
              <span style={{ color: "var(--text-secondary)" }}>A</span> applied &nbsp;
              <span style={{ color: "var(--text-secondary)" }}>D</span> discard
            </div>
          </div>

          {/* Job cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loading ? (
              <div style={{ ...card, padding: 48, textAlign: "center", color: "var(--text-tertiary)" }}>
                <div style={{ marginBottom: 12, fontSize: 13 }}>Loading opportunities...</div>
                <div style={{ height: 2, background: "var(--border-subtle)", borderRadius: 1, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "60%", background: "var(--accent)", borderRadius: 1, animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
              </div>
            ) : activeMissions.map((job) => (
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
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: SIDEBAR ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "calc(100vh - 80px)", overflowY: "auto", position: "sticky", top: 80 }}>

          {/* Stats card */}
          <StatsCard status={status} />

          {/* API Key */}
          <ApiKeyPanel apiKey={apiKey} onSave={saveApiKey} />

          {/* Application checklist or mission brief */}
          {tailored && selectedJob ? (
            <ApplicationChecklist
              job={selectedJob}
              tailored={tailored}
              outreach={outreach}
              outreachLoading={outreachLoading}
              checklist={checklist}
              onCheckStep={(i) => setChecklist(c => ({ ...c, [i]: !c[i] }))}
              onGenerateOutreach={() => handleOutreach(selectedJob.id)}
              onMarkApplied={() => { handleStatusUpdate(selectedJob.id, "applied"); setChecklist({ 0: true, 1: true, 2: true, 3: true, 4: true }); }}
            />
          ) : selectedJob ? (
            <MissionBrief job={selectedJob} isTailoring={tailoring === selectedJob.id} onTailor={() => handleTailor(selectedJob.id)} />
          ) : (
            <EmptyState />
          )}

          {/* Recent activity */}
          <ActivityLog logs={logs} />
        </div>
      </div>
    </div>
  );
}

// ── JobCard ───────────────────────────────────────────────────────────────────

function JobCard({ job, isSelected, isTailoring, onClick, onTailor, onOpen, onApplied, onDiscard, onNotes }: {
  job: Job; isSelected: boolean; isTailoring: boolean;
  onClick: () => void; onTailor: () => void; onOpen: () => void;
  onApplied: () => void; onDiscard: () => void; onNotes: (n: string) => void;
}) {
  const badge = scoreBadge(job.matchScore);
  const pc = priorityColor(job.priority);
  const [noteVal, setNoteVal] = useState(job.notes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);

  const saveNote = () => { onNotes(noteVal); setNoteSaved(true); setTimeout(() => setNoteSaved(false), 1500); };

  const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
    tailored: { label: "Synthesized", color: "var(--color-success)", bg: "rgba(63,185,80,0.1)" },
    applied: { label: "Applied", color: "var(--color-purple)", bg: "rgba(188,140,255,0.1)" },
    suggested: { label: "", color: "", bg: "" },
    queued: { label: "", color: "", bg: "" },
    discarded: { label: "", color: "", bg: "" },
  };
  const st = statusLabel[job.status];

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? "var(--bg-hover)" : "var(--bg-card)",
        border: `1px solid ${isSelected ? "var(--border-strong)" : "var(--border-subtle)"}`,
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.15s",
        overflow: "hidden",
      }}
    >
      {/* Score stripe */}
      <div style={{ height: 3, background: pc, opacity: isSelected ? 0.8 : 0.35 }} />

      <div style={{ padding: "14px 16px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {/* Badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}30`, borderRadius: 5, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
                {job.matchScore}
              </span>
              <span style={{ background: badge.bg, color: badge.color, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>
                {badge.label}
              </span>
              {st.label && (
                <span style={{ background: st.bg, color: st.color, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>
                  {st.label}
                </span>
              )}
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>{job.category}</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {job.title}
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
              {job.company} · {job.location}
            </p>
          </div>
        </div>

        {/* Match signals */}
        {job.matchSignals && job.matchSignals.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>
            {job.matchSignals.slice(0, 4).map(s => (
              <span key={s} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Match reason */}
        {isSelected && job.matchReason && (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--accent)", borderLeft: "2px solid var(--accent-border)", paddingLeft: 10, lineHeight: 1.5 }}>
            {job.matchReason}
          </p>
        )}

        {/* Expanded actions */}
        {isSelected && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onTailor} disabled={isTailoring} style={{ ...btnPrimary, opacity: isTailoring ? 0.7 : 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {isTailoring ? (
                  <><span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />Synthesizing…</>
                ) : "✦ Synthesize with AI  ·  T"}
              </button>
              <button onClick={onOpen} title="Open posting · O" style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 4 }}>↗</button>
              <button onClick={onApplied} title="Mark applied · A" style={{ ...btnGhost, color: "var(--color-success)", borderColor: "rgba(63,185,80,0.3)" }}>✓</button>
              <button onClick={onDiscard} title="Discard · D" style={{ ...btnGhost }}>✕</button>
            </div>
            {/* Notes */}
            <div style={{ position: "relative" }}>
              <textarea
                value={noteVal}
                onChange={e => setNoteVal(e.target.value)}
                onBlur={saveNote}
                placeholder="Add notes… e.g. 'Spoke to recruiter · Salary unclear'"
                rows={2}
                maxLength={280}
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                  boxSizing: "border-box",
                }}
              />
              {noteSaved && <span style={{ position: "absolute", right: 10, top: 10, fontSize: 11, color: "var(--color-success)" }}>Saved ✓</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MissionBrief ──────────────────────────────────────────────────────────────

function MissionBrief({ job, isTailoring, onTailor }: { job: Job; isTailoring: boolean; onTailor: () => void }) {
  return (
    <div style={card}>
      <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>Job Brief</p>
      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>{job.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--accent)" }}>{job.company} · {job.location}</p>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {job.description}
      </p>
      {job.matchReason && (
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--accent)", borderLeft: "2px solid var(--accent-border)", paddingLeft: 10, lineHeight: 1.5 }}>
          {job.matchReason}
        </p>
      )}
      <button onClick={onTailor} disabled={isTailoring} style={{ ...btnPrimary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isTailoring ? 0.7 : 1, marginBottom: 10 }}>
        {isTailoring ? <><span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />Synthesizing…</> : "✦ Synthesize CV + Cover Letter"}
      </button>
      <div style={{ display: "flex", gap: 8 }}>
        {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ ...btnGhost, textDecoration: "none", textAlign: "center", flex: 1, display: "block" }}>View posting ↗</a>}
        <a href={`/api/agent/export/${job.id}?format=markdown`} download style={{ ...btnGhost, textDecoration: "none", textAlign: "center", flex: 1, display: "block" }}>Export ↓</a>
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
  const completedCount = Object.values(checklist).filter(Boolean).length;
  const steps = ["Review tailored CV", "Copy cover letter", "Draft cold outreach", "Open job posting", "Mark as applied"];
  const pct = (completedCount / steps.length) * 100;

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>Application Checklist</p>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{completedCount}/{steps.length}</span>
        </div>
        <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{job.title} · {job.company}</p>
        {/* Progress */}
        <div style={{ height: 4, background: "var(--bg-surface)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "var(--color-success)" : "var(--accent)", borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Step 1: CV */}
      <Step index={0} label="Review tailored CV" checked={!!checklist[0]} onToggle={() => onCheckStep(0)}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 7, padding: 12, maxHeight: 120, overflowY: "auto", marginBottom: 8 }}>
          <pre style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
            {tailored.cvMarkdown.slice(0, 600)}{tailored.cvMarkdown.length > 600 ? "\n…" : ""}
          </pre>
        </div>
        <CopyBtn text={tailored.cvMarkdown} label="Copy full CV" k="cv" copied={copied} onCopy={(t, k) => { copy(t, k); onCheckStep(0); }} />
      </Step>

      {/* Step 2: Cover letter */}
      <Step index={1} label="Copy cover letter" checked={!!checklist[1]} onToggle={() => onCheckStep(1)}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 7, padding: 12, maxHeight: 120, overflowY: "auto", marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{tailored.coverLetter}</p>
        </div>
        <CopyBtn text={tailored.coverLetter} label="Copy cover letter" k="cl" copied={copied} onCopy={(t, k) => { copy(t, k); onCheckStep(1); }} />
      </Step>

      {/* Step 3: Outreach */}
      <Step index={2} label="Draft cold outreach" checked={!!checklist[2]} onToggle={() => onCheckStep(2)}>
        {!outreach ? (
          <button onClick={onGenerateOutreach} disabled={outreachLoading} style={{ ...btnGhost, width: "100%", marginTop: 8 }}>
            {outreachLoading ? "Generating…" : "Generate LinkedIn + Email outreach"}
          </button>
        ) : (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            {outreach.mock && (
              <div style={{ fontSize: 11, color: "var(--color-high)", background: "rgba(210,153,34,0.1)", border: "1px solid rgba(210,153,34,0.2)", borderRadius: 6, padding: "6px 10px" }}>
                Preview mode · add API key for personalised outreach
              </div>
            )}
            <OutreachBlock title={`LinkedIn · ${outreach.suggestedContact}`} text={outreach.linkedinMessage} copyKey="li" copied={copied} onCopy={(t, k) => { copy(t, k); onCheckStep(2); }} />
            <OutreachBlock title={`Email · ${outreach.emailSubject}`} text={outreach.emailBody} copyKey="em" copied={copied} onCopy={(t, k) => { copy(t, k); onCheckStep(2); }} fullText={`Subject: ${outreach.emailSubject}\n\n${outreach.emailBody}`} />
          </div>
        )}
      </Step>

      {/* Step 4: Open posting */}
      <Step index={3} label="Open job posting" checked={!!checklist[3]} onToggle={() => onCheckStep(3)}>
        <button onClick={() => { if (job.url) { window.open(job.url, "_blank"); onCheckStep(3); } }} style={{ ...btnGhost, width: "100%", marginTop: 8 }}>
          Open {job.company} application ↗
        </button>
      </Step>

      {/* Step 5: Confirm */}
      <Step index={4} label="Mark as applied" checked={!!checklist[4]} onToggle={() => onCheckStep(4)}>
        <button onClick={onMarkApplied} style={{
          ...btnPrimary, marginTop: 8,
          background: checklist[4] ? "var(--color-success)" : "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {checklist[4] ? "✓ Applied — well done!" : "Confirm application sent"}
        </button>
      </Step>

      <a href={`/api/agent/export/${job.id}?format=markdown`} download style={{ textAlign: "center", fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none", paddingTop: 4 }}>
        Download full application package ↓
      </a>
    </div>
  );
}

// ── Step ──────────────────────────────────────────────────────────────────────

function Step({ index, label, checked, onToggle, children }: {
  index: number; label: string; checked: boolean; onToggle: () => void; children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div style={{ border: `1px solid ${checked ? "rgba(63,185,80,0.25)" : "var(--border-subtle)"}`, borderRadius: 8, overflow: "hidden", background: checked ? "rgba(63,185,80,0.04)" : "transparent", transition: "all 0.2s" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
        <button onClick={e => { e.stopPropagation(); onToggle(); }} style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${checked ? "var(--color-success)" : "var(--border-strong)"}`, background: checked ? "var(--color-success)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", transition: "all 0.15s" }}>
          {checked && <span style={{ fontSize: 10, color: "#000", fontWeight: 700 }}>✓</span>}
        </button>
        <span style={{ fontSize: 13, fontWeight: 500, color: checked ? "var(--text-secondary)" : "var(--text-primary)", flex: 1, textDecoration: checked ? "line-through" : "none" }}>
          {String(index + 1).padStart(2, "0")}. {label}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "0 12px 12px" }}>{children}</div>}
    </div>
  );
}

// ── CopyBtn ───────────────────────────────────────────────────────────────────

function CopyBtn({ text, label, k, copied, onCopy }: { text: string; label: string; k: string; copied: string | null; onCopy: (t: string, k: string) => void }) {
  const isCopied = copied === k;
  return (
    <button onClick={() => onCopy(text, k)} style={{ ...btnGhost, fontSize: 12, color: isCopied ? "var(--color-success)" : "var(--text-secondary)", borderColor: isCopied ? "rgba(63,185,80,0.3)" : "var(--border-default)" }}>
      {isCopied ? "Copied ✓" : label}
    </button>
  );
}

// ── OutreachBlock ─────────────────────────────────────────────────────────────

function OutreachBlock({ title, text, copyKey, copied, onCopy, fullText }: { title: string; text: string; copyKey: string; copied: string | null; onCopy: (t: string, k: string) => void; fullText?: string }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: 12 }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</p>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{text}</p>
      <CopyBtn text={fullText ?? text} label="Copy" k={copyKey} copied={copied} onCopy={onCopy} />
    </div>
  );
}

// ── StatsCard ─────────────────────────────────────────────────────────────────

function StatsCard({ status }: { status: AgentStatus | null }) {
  return (
    <div style={card}>
      <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>Pipeline</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          ["Total", status?.pipeline.total ?? 0, "var(--text-primary)"],
          ["Active", status?.pipeline.suggested ?? 0, "var(--accent)"],
          ["Synthesized", status?.pipeline.tailored ?? 0, "var(--color-high)"],
          ["Applied", status?.pipeline.applied ?? 0, "var(--color-success)"],
        ].map(([label, val, color]) => (
          <div key={label as string} style={{ background: "var(--bg-surface)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: color as string, lineHeight: 1 }}>{val as number}</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>{label as string}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ApiKeyPanel ───────────────────────────────────────────────────────────────

function ApiKeyPanel({ apiKey, onSave }: { apiKey: string; onSave: (k: string) => void }) {
  const [input, setInput] = useState(apiKey);
  const [saved, setSaved] = useState(false);
  const save = () => { onSave(input.trim()); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>Gemini API Key</p>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>BYOK · your credits</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="password" placeholder="AIzaSy…" value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && save()}
          style={{ flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }} />
        <button onClick={save} style={{ ...btnPrimary, width: "auto", padding: "8px 16px", background: saved ? "var(--color-success)" : "var(--accent)" }}>
          {saved ? "Saved" : "Set"}
        </button>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>
        Free key at <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-link)", textDecoration: "none" }}>aistudio.google.com</a>
         · Stored locally only
      </p>
    </div>
  );
}

// ── ActivityLog ───────────────────────────────────────────────────────────────

function ActivityLog({ logs }: { logs: AgentLog[] }) {
  if (logs.length === 0) return null;
  return (
    <div style={card}>
      <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>Recent Activity</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {logs.slice(0, 8).map((log, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", whiteSpace: "nowrap", paddingTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(log.timestamp)}</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
              <span style={{ color: "var(--accent)", fontWeight: 500 }}>{log.action}  </span>
              {log.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ ...card, textAlign: "center", padding: 32 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
        ✦
      </div>
      <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Select an opportunity</p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Click any job to view details and<br />synthesize a tailored application
      </p>
    </div>
  );
}
