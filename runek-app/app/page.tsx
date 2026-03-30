"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Job, AgentLog, AgentStatus, TailoredContent } from "../lib/types/job";

// ── Helpers ──────────────────────────────────────────────────────────────────

function priorityColor(p: Job["priority"]) {
  return { critical: "#ff2d2d", high: "#ffa500", medium: "#00f5ff", low: "#ffffff30" }[p] ?? "#ffffff30";
}
function scoreColor(s: number) {
  if (s >= 88) return "#ff2d2d";
  if (s >= 75) return "#ffa500";
  if (s >= 55) return "#00f5ff";
  return "#ffffff30";
}
function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = localStorage.getItem("runek-api-key");
    if (k) setApiKey(k);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("runek-api-key", key);
  };

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [jr, sr] = await Promise.all([fetch("/api/agent/jobs"), fetch("/api/agent/status")]);
      const jd = await jr.json();
      const sd = await sr.json();
      setJobs(jd.data.jobs ?? []);
      setLogs(jd.data.logs ?? []);
      setStatus(sd.data ?? null);
    } catch (e) {
      console.error("[HUD]", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const i = setInterval(fetchAll, 10000);
    return () => clearInterval(i);
  }, [fetchAll]);

  // ── Actions ────────────────────────────────────────────────────────────────

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
      const res = await fetch("/api/agent/tailor", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ jobId }),
      });
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
      const res = await fetch("/api/agent/outreach", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (data.ok) setOutreach(data.data);
    } finally {
      setOutreachLoading(false);
    }
  };

  const handleStatusUpdate = async (jobId: string, newStatus: Job["status"]) => {
    await fetch(`/api/agent/jobs/${jobId}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    fetchAll();
  };

  const handleNotes = async (jobId: string, notes: string) => {
    await fetch(`/api/agent/jobs/${jobId}/notes`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ notes }),
    });
  };

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!selected || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "t" || e.key === "T") handleTailor(selected);
      if (e.key === "d" || e.key === "D") handleStatusUpdate(selected, "discarded");
      if (e.key === "a" || e.key === "A") handleStatusUpdate(selected, "applied");
      if (e.key === "o" || e.key === "O") {
        const job = jobs.find((j) => j.id === selected);
        if (job?.url) window.open(job.url, "_blank");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selected, jobs]);

  const activeMissions = jobs.filter((j) => j.status !== "discarded").sort((a, b) => b.matchScore - a.matchScore);
  const selectedJob = jobs.find((j) => j.id === selected);
  const showChecklist = tailored && selectedJob;

  return (
    <div style={{ fontFamily: "'JetBrains Mono','Courier New',monospace" }} className="min-h-screen bg-black text-white">
      {/* ── NAV ── */}
      <header className="border-b border-white/10 bg-black sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xl font-black tracking-[0.3em]">
              RUN<span style={{ color: "#00f5ff" }}>EK</span>
              <span className="text-[10px] text-white/20 ml-2 tracking-widest">v0.3</span>
            </span>
            <span className="text-[10px] text-white/20">COMMAND CENTER // SYSTEMS PM OPS</span>
          </div>
          <div className="flex items-center gap-8">
            {status && (
              <div className="hidden md:flex gap-6 text-[10px] font-mono">
                <span><span style={{ color: "#ff2d2d" }}>{status.pipeline.queued}</span> <span className="text-white/30">QUEUED</span></span>
                <span><span style={{ color: "#00f5ff" }}>{status.pipeline.suggested}</span> <span className="text-white/30">ACTIVE</span></span>
                <span><span style={{ color: "#ffa500" }}>{status.pipeline.tailored}</span> <span className="text-white/30">SYNTHESIZED</span></span>
                <span><span style={{ color: "#00ff41" }}>{status.pipeline.applied}</span> <span className="text-white/30">DEPLOYED</span></span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse shadow-[0_0_6px_#00ff41]" />
              <span style={{ color: "#00ff41" }}>AGENT ONLINE</span>
            </div>
            <span className="text-[10px] text-white/20 tabular-nums">{new Date().toLocaleTimeString("en-GB")}</span>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-6 grid grid-cols-12 gap-6" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
        {/* ── MISSION FEED ── */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.3em] text-white/30">MISSION FEED // {activeMissions.length} ACTIVE TARGETS</span>
            <div className="flex gap-3 text-[9px] text-white/20">
              <span style={{ color: "#ff2d2d" }}>■</span> CRITICAL
              <span style={{ color: "#ffa500" }}>■</span> HIGH
              <span style={{ color: "#00f5ff" }}>■</span> MEDIUM
            </div>
          </div>
          <div className="text-[9px] border border-white/5 rounded px-3 py-1.5 bg-white/[0.02] text-white/20">
            SELECT MISSION → <span className="text-white/40">[T]</span> Synthesize &nbsp;
            <span className="text-white/40">[O]</span> Open Posting &nbsp;
            <span className="text-white/40">[A]</span> Applied &nbsp;
            <span className="text-white/40">[D]</span> Discard
          </div>

          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 16rem)" }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-8 h-8 border border-[#00f5ff]/30 border-t-[#00f5ff] rounded-full animate-spin" />
                <span className="text-[10px] text-white/20 animate-pulse tracking-widest">INITIALIZING PIPELINE...</span>
              </div>
            ) : activeMissions.map((job) => (
              <MissionCard
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

        {/* ── RIGHT PANEL ── */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 5rem)" }}>
          <SignalPanel status={status} lastIngested={status?.lastIngest} />
          <ApiKeyPanel apiKey={apiKey} onSave={saveApiKey} />

          {/* GUIDED APPLICATION CHECKLIST — shows after synthesis */}
          {showChecklist && (
            <ApplicationChecklist
              job={selectedJob!}
              tailored={tailored!}
              outreach={outreach}
              outreachLoading={outreachLoading}
              checklist={checklist}
              onCheckStep={(i) => setChecklist((c) => ({ ...c, [i]: !c[i] }))}
              onGenerateOutreach={() => handleOutreach(selectedJob!.id)}
              onMarkApplied={() => { handleStatusUpdate(selectedJob!.id, "applied"); setChecklist({ 0: true, 1: true, 2: true, 3: true }); }}
            />
          )}

          {/* MISSION DETAIL — shown when job selected but not yet synthesized */}
          {!showChecklist && selectedJob && (
            <MissionDetail
              job={selectedJob}
              isTailoring={tailoring === selectedJob.id}
              onTailor={() => handleTailor(selectedJob.id)}
            />
          )}

          {!selectedJob && !showChecklist && <EmptyDetail />}

          {/* OPERATOR LOG */}
          <div ref={logRef} className="border border-white/5 rounded bg-black">
            <div className="px-3 py-2 border-b border-white/5 text-[9px] text-white/20 tracking-[0.2em]">
              OPERATOR LOG // LAST {logs.length} EVENTS
            </div>
            <div className="p-3 space-y-1 max-h-40 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3 text-[9px] leading-relaxed">
                  <span className="text-white/15 whitespace-nowrap tabular-nums">{formatTime(log.timestamp)}</span>
                  <span className="text-[#00f5ff]/60 uppercase w-24 flex-shrink-0">{log.action}</span>
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

// ── MissionCard ───────────────────────────────────────────────────────────────

function MissionCard({ job, isSelected, isTailoring, onClick, onTailor, onOpen, onApplied, onDiscard, onNotes }: {
  job: Job; isSelected: boolean; isTailoring: boolean;
  onClick: () => void; onTailor: () => void; onOpen: () => void;
  onApplied: () => void; onDiscard: () => void;
  onNotes: (n: string) => void;
}) {
  const pc = priorityColor(job.priority);
  const sc = scoreColor(job.matchScore);
  const [noteVal, setNoteVal] = useState(job.notes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);

  const saveNote = () => { onNotes(noteVal); setNoteSaved(true); setTimeout(() => setNoteSaved(false), 1500); };

  return (
    <div onClick={onClick} style={{ borderColor: isSelected ? pc : "rgba(255,255,255,0.06)" }}
      className="border rounded cursor-pointer bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
      <div style={{ background: pc, opacity: isSelected ? 1 : 0.25 }} className="h-[2px] rounded-t" />
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span style={{ color: sc, textShadow: `0 0 8px ${sc}80` }} className="text-sm font-black tabular-nums">{job.matchScore}</span>
              <span className="text-white/15 text-[9px]">/100</span>
              <span style={{ color: pc, borderColor: `${pc}40` }} className="text-[9px] border px-1.5 py-0.5 rounded">{job.priority.toUpperCase()}</span>
              {job.status === "tailored" && <span className="text-[9px] text-[#00ff41] border border-[#00ff41]/30 px-1.5 py-0.5 rounded">SYNTHESIZED</span>}
              {job.status === "applied" && <span className="text-[9px] text-[#a020f0] border border-[#a020f0]/30 px-1.5 py-0.5 rounded">DEPLOYED</span>}
            </div>
            <p className="font-bold text-white text-sm truncate">{job.title}</p>
            <p className="text-[11px] text-white/40">{job.company} // {job.location}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-[9px] text-white/20 mb-0.5">{job.category}</div>
            <div className="text-[9px] text-white/15">{job.source}</div>
          </div>
        </div>

        {job.matchSignals && job.matchSignals.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {job.matchSignals.slice(0, 4).map((s) => (
              <span key={s} className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/30">{s}</span>
            ))}
          </div>
        )}

        {isSelected && (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-2" onClick={(e) => e.stopPropagation()}>
            {/* Action row */}
            <div className="flex gap-2">
              <button onClick={onTailor} disabled={isTailoring}
                className="flex-1 py-2 text-[10px] font-black tracking-widest rounded transition-all"
                style={{ background: isTailoring ? "transparent" : "linear-gradient(135deg,#00f5ff,#00d4ff)", color: isTailoring ? "#00f5ff" : "#000", border: isTailoring ? "1px solid rgba(0,245,255,0.3)" : "none" }}>
                {isTailoring ? <span className="flex items-center justify-center gap-2"><span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />SYNTHESIZING...</span> : "SYNTHESIZE [T]"}
              </button>
              <button onClick={onOpen} title="Open job posting [O]" className="px-3 py-2 text-[10px] font-bold border border-white/10 text-white/40 rounded hover:text-white hover:border-white/30 transition-all">↗</button>
              <button onClick={onApplied} title="Mark applied [A]" className="px-3 py-2 text-[10px] font-bold border border-[#00ff41]/20 text-[#00ff41] rounded hover:bg-[#00ff41]/10 transition-all">A</button>
              <button onClick={onDiscard} title="Discard [D]" className="px-3 py-2 text-[10px] font-bold border border-white/10 text-white/30 rounded hover:bg-white/5 transition-all">D</button>
            </div>
            {/* Notes */}
            <div className="flex gap-2">
              <textarea value={noteVal} onChange={(e) => setNoteVal(e.target.value)} onBlur={saveNote}
                placeholder="Notes... (e.g. 'Spoke to recruiter', 'Strong AUV match')"
                className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-[10px] text-white/50 placeholder:text-white/15 resize-none focus:outline-none focus:border-white/20"
                rows={2} maxLength={280} />
              {noteSaved && <span className="text-[9px] text-[#00ff41] self-center">✓</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ApplicationChecklist ─────────────────────────────────────────────────────

function ApplicationChecklist({ job, tailored, outreach, outreachLoading, checklist, onCheckStep, onGenerateOutreach, onMarkApplied }: {
  job: Job; tailored: TailoredContent; outreach: OutreachDraft | null;
  outreachLoading: boolean; checklist: Record<number, boolean>;
  onCheckStep: (i: number) => void; onGenerateOutreach: () => void; onMarkApplied: () => void;
}) {
  const { copied, copy } = useCopy();
  const steps = ["Review tailored CV", "Copy cover letter", "Draft cold outreach", "Open job posting", "Confirm application deployed"];
  const completedCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="border border-[#00f5ff]/20 rounded bg-[#00f5ff]/[0.02] flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] tracking-[0.3em] text-[#00f5ff]/70">MISSION EXECUTION // {job.company.toUpperCase()}</span>
        <span className="text-[9px] font-mono text-white/20">{completedCount}/{steps.length} COMPLETE</span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-white/5 rounded-full">
        <div className="h-full bg-[#00f5ff] rounded-full transition-all duration-500" style={{ width: `${(completedCount / steps.length) * 100}%` }} />
      </div>

      {/* Step 1: Review CV */}
      <ChecklistStep index={0} label="Review tailored CV" checked={!!checklist[0]} onToggle={() => onCheckStep(0)}>
        <div className="mt-2 bg-black/50 rounded p-3 border border-white/5 max-h-32 overflow-y-auto">
          <pre className="text-[9px] text-white/40 whitespace-pre-wrap leading-relaxed">{tailored.cvMarkdown.slice(0, 500)}{tailored.cvMarkdown.length > 500 ? "\n[...truncated]" : ""}</pre>
        </div>
        <CopyButton text={tailored.cvMarkdown} label="COPY FULL CV" copiedKey="cv" copied={copied} onCopy={copy} />
      </ChecklistStep>

      {/* Step 2: Copy Cover Letter */}
      <ChecklistStep index={1} label="Copy cover letter" checked={!!checklist[1]} onToggle={() => onCheckStep(1)}>
        <div className="mt-2 bg-black/50 rounded p-3 border border-white/5 max-h-32 overflow-y-auto">
          <p className="text-[9px] text-white/50 whitespace-pre-wrap leading-relaxed">{tailored.coverLetter}</p>
        </div>
        <CopyButton text={tailored.coverLetter} label="COPY COVER LETTER" copiedKey="cl" copied={copied} onCopy={(t, k) => { copy(t, k); onCheckStep(1); }} />
      </ChecklistStep>

      {/* Step 3: Cold Outreach */}
      <ChecklistStep index={2} label="Draft cold outreach" checked={!!checklist[2]} onToggle={() => onCheckStep(2)}>
        {!outreach ? (
          <button onClick={onGenerateOutreach} disabled={outreachLoading}
            className="mt-2 w-full py-2 text-[10px] font-black tracking-widest border border-[#a020f0]/30 text-[#a020f0] rounded hover:bg-[#a020f0]/10 transition-all">
            {outreachLoading ? "DRAFTING..." : "GENERATE OUTREACH DRAFT"}
          </button>
        ) : (
          <div className="mt-2 space-y-3">
            {outreach.mock && <div className="text-[8px] text-[#ffa500]/60 border border-[#ffa500]/20 rounded px-2 py-1">Mock mode — add API key for AI-personalised outreach</div>}
            <div className="bg-black/50 rounded p-3 border border-[#a020f0]/20">
              <div className="text-[8px] text-[#a020f0]/60 mb-1.5 uppercase tracking-widest">LinkedIn // {outreach.suggestedContact}</div>
              <p className="text-[9px] text-white/50 leading-relaxed">{outreach.linkedinMessage}</p>
              <CopyButton text={outreach.linkedinMessage} label="COPY" copiedKey="li" copied={copied} onCopy={(t, k) => { copy(t, k); onCheckStep(2); }} />
            </div>
            <div className="bg-black/50 rounded p-3 border border-[#a020f0]/20">
              <div className="text-[8px] text-[#a020f0]/60 mb-1.5 uppercase tracking-widest">Email // Subject: {outreach.emailSubject}</div>
              <p className="text-[9px] text-white/50 leading-relaxed whitespace-pre-wrap">{outreach.emailBody}</p>
              <CopyButton text={`Subject: ${outreach.emailSubject}\n\n${outreach.emailBody}`} label="COPY EMAIL" copiedKey="em" copied={copied} onCopy={(t, k) => { copy(t, k); onCheckStep(2); }} />
            </div>
          </div>
        )}
      </ChecklistStep>

      {/* Step 4: Open Job */}
      <ChecklistStep index={3} label="Open job posting" checked={!!checklist[3]} onToggle={() => onCheckStep(3)}>
        <button onClick={() => { if (job.url) { window.open(job.url, "_blank"); onCheckStep(3); } }}
          className="mt-2 w-full py-2.5 text-[10px] font-black tracking-widest rounded border border-white/10 text-white/50 hover:border-white/30 hover:text-white transition-all">
          OPEN {job.company.toUpperCase()} APPLICATION ↗
        </button>
      </ChecklistStep>

      {/* Step 5: Confirm Applied */}
      <ChecklistStep index={4} label="Confirm application deployed" checked={!!checklist[4]} onToggle={() => onCheckStep(4)}>
        <button onClick={onMarkApplied}
          className="mt-2 w-full py-3 text-[10px] font-black tracking-widest rounded transition-all"
          style={{ background: checklist[4] ? "#00ff41" : "transparent", color: checklist[4] ? "#000" : "#00ff41", border: `1px solid ${checklist[4] ? "#00ff41" : "rgba(0,255,65,0.3)"}` }}>
          {checklist[4] ? "✓ APPLICATION DEPLOYED" : "MARK AS DEPLOYED"}
        </button>
      </ChecklistStep>

      {/* Download */}
      <a href={`/api/agent/export/${job.id}?format=markdown`} download
        className="text-center text-[9px] font-mono text-white/20 hover:text-white/40 border border-white/5 rounded py-2 transition-colors">
        DOWNLOAD FULL MANIFEST ↓
      </a>
    </div>
  );
}

// ── ChecklistStep ─────────────────────────────────────────────────────────────

function ChecklistStep({ index, label, checked, onToggle, children }: {
  index: number; label: string; checked: boolean; onToggle: () => void; children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className={`border rounded transition-all ${checked ? "border-[#00ff41]/20 bg-[#00ff41]/[0.02]" : "border-white/5"}`}>
      <button onClick={() => { setOpen(!open); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all"
          style={{ borderColor: checked ? "#00ff41" : "rgba(255,255,255,0.2)", background: checked ? "#00ff41" : "transparent" }}>
          {checked && <span className="text-black text-[8px] font-black">✓</span>}
        </button>
        <span className={`text-[10px] font-bold tracking-wide flex-1 ${checked ? "text-[#00ff41]/70 line-through" : "text-white/60"}`}>
          {String(index + 1).padStart(2, "0")} — {label.toUpperCase()}
        </span>
        <span className="text-white/20 text-[10px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text, label, copiedKey, copied, onCopy }: {
  text: string; label: string; copiedKey: string;
  copied: string | null; onCopy: (t: string, k: string) => void;
}) {
  const isCopied = copied === copiedKey;
  return (
    <button onClick={() => onCopy(text, copiedKey)}
      className="mt-2 px-3 py-1.5 text-[9px] font-black rounded border transition-all"
      style={{ borderColor: isCopied ? "#00ff41" : "rgba(255,255,255,0.1)", color: isCopied ? "#00ff41" : "rgba(255,255,255,0.4)" }}>
      {isCopied ? "COPIED ✓" : label}
    </button>
  );
}

// ── SignalPanel ───────────────────────────────────────────────────────────────

function SignalPanel({ status, lastIngested }: { status: AgentStatus | null; lastIngested?: string }) {
  return (
    <div className="border border-white/5 rounded bg-white/[0.01] p-4 space-y-4">
      <span className="text-[9px] tracking-[0.3em] text-white/20">SIGNAL PANEL // AGENT TELEMETRY</span>
      <div className="grid grid-cols-3 gap-4">
        <StatBlock label="AI ENGINE" value={status?.aiReady ? "ONLINE" : "OFFLINE"} color={status?.aiReady ? "#00ff41" : "#ff2d2d"} />
        <StatBlock label="LAST INGEST" value={formatTime(lastIngested)} color="#00f5ff" />
        <StatBlock label="PIPELINE" value={`${status?.pipeline.total ?? 0} OPS`} color="#ffa500" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
        {[["SYNTHESIZED", status?.pipeline.tailored, "#ffa500"], ["DEPLOYED", status?.pipeline.applied, "#00ff41"],
          ["QUEUED", status?.pipeline.queued, "#ff2d2d"], ["ACTIVE", status?.pipeline.suggested, "#00f5ff"]].map(([l, v, c]) => (
          <div key={l as string} className="flex justify-between text-white/20">
            <span>{l as string}</span><span style={{ color: c as string }}>{v as number ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[8px] text-white/20 mb-1">{label}</div>
      <div className="text-sm font-black tabular-nums" style={{ color, textShadow: `0 0 8px ${color}60` }}>{value}</div>
    </div>
  );
}

// ── MissionDetail ─────────────────────────────────────────────────────────────

function MissionDetail({ job, isTailoring, onTailor }: { job: Job; isTailoring: boolean; onTailor: () => void }) {
  return (
    <div className="border border-white/5 rounded bg-white/[0.01] p-4 space-y-3">
      <span className="text-[9px] tracking-[0.3em] text-white/20">MISSION BRIEF</span>
      <div>
        <h3 className="font-black text-white">{job.title}</h3>
        <p className="text-[11px] text-[#00f5ff]/60">{job.company} // {job.location}</p>
      </div>
      <p className="text-[11px] text-white/30 leading-relaxed line-clamp-5">{job.description}</p>
      {job.matchReason && <p className="text-[10px] text-[#00f5ff]/50 italic border-l-2 border-[#00f5ff]/20 pl-3">{job.matchReason}</p>}
      <button onClick={onTailor} disabled={isTailoring}
        className="w-full py-3 text-[10px] font-black tracking-widest rounded transition-all"
        style={{ background: isTailoring ? "transparent" : "linear-gradient(135deg,#00f5ff,#00d4ff)", color: isTailoring ? "#00f5ff" : "#000", border: isTailoring ? "1px solid rgba(0,245,255,0.3)" : "none" }}>
        {isTailoring ? "SYNTHESIZING..." : "SYNTHESIZE CV + COVER LETTER [T]"}
      </button>
      <div className="flex gap-2">
        {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-white/20 hover:text-white/50 border border-white/5 px-2 py-1 rounded transition-colors">VIEW POSTING ↗</a>}
        <a href={`/api/agent/export/${job.id}?format=markdown`} download className="text-[9px] text-white/20 hover:text-white/50 border border-white/5 px-2 py-1 rounded transition-colors">EXPORT MD ↓</a>
      </div>
    </div>
  );
}

// ── ApiKeyPanel ───────────────────────────────────────────────────────────────

function ApiKeyPanel({ apiKey, onSave }: { apiKey: string; onSave: (k: string) => void }) {
  const [input, setInput] = React.useState(apiKey);
  const [saved, setSaved] = React.useState(false);
  const save = () => { onSave(input.trim()); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (
    <div className="border border-white/5 rounded bg-white/[0.01] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] tracking-[0.3em] text-white/20">OPERATOR API KEY</span>
        <span className="text-[8px] text-white/10">BYOK — your credits only</span>
      </div>
      <div className="flex gap-2">
        <input type="password" placeholder="AIzaSy..." value={input}
          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()}
          className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-[10px] text-white/60 placeholder:text-white/15 focus:outline-none focus:border-[#00f5ff]/30" />
        <button onClick={save} className="px-3 py-2 text-[9px] font-black border rounded transition-all"
          style={{ borderColor: saved ? "#00ff41" : "rgba(0,245,255,0.2)", color: saved ? "#00ff41" : "#00f5ff" }}>
          {saved ? "✓" : "SET"}
        </button>
      </div>
      <p className="text-[8px] text-white/15">Get free key at <span className="text-white/30">aistudio.google.com</span> · Stored locally</p>
    </div>
  );
}

// ── EmptyDetail ───────────────────────────────────────────────────────────────

function EmptyDetail() {
  return (
    <div className="border border-dashed border-white/5 rounded flex flex-col items-center justify-center p-8 gap-3 text-center">
      <div className="w-10 h-10 rounded border border-white/10 flex items-center justify-center">
        <span className="text-white/10 text-lg">?</span>
      </div>
      <p className="text-[9px] text-white/15 leading-relaxed tracking-wide">SELECT A MISSION TARGET<br />TO VIEW BRIEF + EXECUTE</p>
      <p className="text-[8px] text-white/10">OR POST TO /api/agent/ingest</p>
    </div>
  );
}
