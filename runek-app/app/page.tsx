"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, db, createApplication, Application } from "../lib/services/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

function Logo({ size = "large" }: { size?: "large" | "small" }) {
  const textSz = size === "large" ? 42 : 24;
  
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "baseline", 
      userSelect: "none",
      background: "var(--logo-bg)",
      padding: size === "large" ? "12px 24px" : "6px 16px",
      borderRadius: size === "large" ? 16 : 10,
      boxShadow: "var(--logo-shadow)"
    }}>
      <span style={{ 
        fontFamily: "'Space Grotesk', sans-serif", 
        fontWeight: 900, 
        fontSize: textSz, 
        letterSpacing: "-0.02em", 
        color: "#ffffff",
        textShadow: "1px 0 0 #ffffff, -1px 0 0 #ffffff" 
      }}>
        RUN
      </span>
      <span style={{ 
        fontFamily: "'Space Grotesk', sans-serif", 
        fontWeight: 900, 
        fontSize: textSz, 
        color: "#4f8fff", 
        display: "inline-block", 
        transform: "skewX(-18deg)", 
        marginLeft: "-1px", 
        textShadow: "1px 0 0 #4f8fff, -1px 0 0 #4f8fff" 
      }}>
        EK
      </span>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  
  // Email Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");

  // Dashboard State
  const [applications, setApplications] = useState<Application[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newApp, setNewApp] = useState({ company: "", role: "", platform: "", link: "", status: "applied" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Fetch Applications
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "applications"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
      apps.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
      setApplications(apps);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      alert(`Login Error: ${error.message}\n\nIf this says "API key not valid", you forgot to add Environment Variables in Vercel. If it says "unauthorized domain", the domain wasn't saved in Firebase.`);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Email auth failed:", error);
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await createApplication({
        userId: user.uid,
        company: newApp.company,
        role: newApp.role,
        platform: newApp.platform,
        link: newApp.link,
        status: newApp.status as any,
        appliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewApp({ company: "", role: "", platform: "", link: "", status: "applied" });
    } catch (error) {
      console.error("Failed to create application:", error);
      alert("Failed to save application. Please try again.");
    } finally {
      setIsSubmitting(true); // Wait, should be false! Fixing below.
      setIsSubmitting(false);
    }
  };

  if (loadingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <p style={{ color: "var(--text-tertiary)", fontFamily: "'Space Grotesk', sans-serif" }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 40, background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <Logo size="large" />
          </div>
          <p style={{ margin: "0 0 32px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Your personal, cloud-synced career agent. Track your applications across all platforms in one place.
          </p>

          <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}
            />
            {authError && <p style={{ color: "#ef4444", fontSize: 13, margin: 0, textAlign: "left" }}>{authError.replace("Firebase: Error ", "")}</p>}
            
            <button 
              type="submit"
              style={{ padding: "14px", borderRadius: 8, border: "none", background: "var(--text-primary)", color: "var(--bg-base)", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", transition: "transform 0.1s" }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {isRegistering ? "Create Account" : "Sign In with Email"}
            </button>
            <button 
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer", textDecoration: "underline", fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}
            >
              {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
          </div>

          <button 
            onClick={handleLogin}
            style={{ width: "100%", padding: "14px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "transform 0.1s" }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
          
          <button 
            onClick={() => setUser({ uid: "dev-user-123", displayName: "Dev Mode" } as User)}
            style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", marginTop: 12 }}
          >
            Skip Login (Dev Only)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* ── HEADER ── */}
      <header style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-glass)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo size="small" />
          
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              style={{ background: "transparent", color: "var(--text-tertiary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", transition: "transform 0.2s" }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-primary)" }}>
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--blue-core)" }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {user.photoURL && <img src={user.photoURL} alt="Profile" style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border-subtle)" }} />}
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{user.displayName?.split(" ")[0]}</span>
            </div>
            <div style={{ width: 1, height: 20, background: "var(--border-subtle)" }} />
            <button 
              onClick={handleLogout}
              style={{ background: "transparent", color: "var(--text-tertiary)", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "color 0.2s" }}
              onMouseOver={e => e.currentTarget.style.color = "var(--text-primary)"}
              onMouseOut={e => e.currentTarget.style.color = "var(--text-tertiary)"}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── DASHBOARD BODY ── */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}>
              Applications
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              Track and manage your job hunt pipeline.
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ background: "var(--text-primary)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: 8 }}
          >
            <span>+</span> New Application
          </button>
        </div>

        {applications.length === 0 ? (
          /* ── EMPTY STATE ── */
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "80px 20px", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--bg-surface)", border: "1px solid var(--border-strong)", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: "0 8px 16px rgba(0,0,0,0.2)" }}>
              🚀
            </div>
            <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
              Your pipeline is empty
            </h3>
            <p style={{ margin: "0 auto 24px", fontSize: 14, color: "var(--text-secondary)", maxWidth: 400, lineHeight: 1.6 }}>
              Ready to start tracking? Add your first job application from LinkedIn, JustJoinIT, or any other platform.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{ background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
            >
              Add Application
            </button>
          </div>
        ) : (
          /* ── DATA TABLE ── */
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-strong)" }}>
                <tr>
                  <th style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Company</th>
                  <th style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</th>
                  <th style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                  <th style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Platform</th>
                  <th style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date Applied</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.2s" }}>
                    <td style={{ padding: "16px 24px", color: "var(--text-primary)", fontWeight: 600 }}>{app.company}</td>
                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)" }}>
                      {app.link ? <a href={app.link} target="_blank" rel="noreferrer" style={{ color: "var(--blue-core)", textDecoration: "none" }}>{app.role}</a> : app.role}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: app.status === 'offer' ? "rgba(16, 185, 129, 0.1)" : app.status === 'rejected' ? "rgba(239, 68, 68, 0.1)" : "rgba(79, 143, 255, 0.1)", color: app.status === 'offer' ? "#10b981" : app.status === 'rejected' ? "#ef4444" : "var(--blue-core)", textTransform: "capitalize" }}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: 14 }}>{app.platform || "Direct"}</td>
                    <td style={{ padding: "16px 24px", color: "var(--text-tertiary)", fontSize: 14 }}>{new Date(app.appliedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>

      {/* ── NEW APPLICATION MODAL ── */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 500, boxShadow: "0 24px 48px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}>Add Application</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", fontSize: 24, cursor: "pointer" }}>&times;</button>
            </div>
            
            <form onSubmit={handleCreateApplication} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Company *</label>
                  <input required value={newApp.company} onChange={e => setNewApp({...newApp, company: e.target.value})} style={{ padding: "12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--text-primary)" }} placeholder="e.g. Google" />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Role *</label>
                  <input required value={newApp.role} onChange={e => setNewApp({...newApp, role: e.target.value})} style={{ padding: "12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--text-primary)" }} placeholder="e.g. Product Manager" />
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Link to Job Description</label>
                <input value={newApp.link} onChange={e => setNewApp({...newApp, link: e.target.value})} type="url" style={{ padding: "12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--text-primary)" }} placeholder="https://..." />
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Platform</label>
                  <input value={newApp.platform} onChange={e => setNewApp({...newApp, platform: e.target.value})} style={{ padding: "12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--text-primary)" }} placeholder="e.g. LinkedIn" />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Status</label>
                  <select value={newApp.status} onChange={e => setNewApp({...newApp, status: e.target.value})} style={{ padding: "12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--text-primary)", cursor: "pointer" }}>
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="interview">Interviewing</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "var(--blue-core)", color: "#fff", fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? "Saving..." : "Save Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
