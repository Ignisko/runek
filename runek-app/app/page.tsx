"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "../lib/services/firebase";

function Logo({ size = "large" }: { size?: "large" | "small" }) {
  const textSz = size === "large" ? 42 : 26;
  
  return (
    <div style={{ display: "flex", alignItems: "baseline", userSelect: "none" }}>
      <span style={{ 
        fontFamily: "'Space Grotesk', sans-serif", 
        fontWeight: 900, 
        fontSize: textSz, 
        letterSpacing: "-0.02em", 
        color: "var(--text-primary)",
        textShadow: "1px 0 0 var(--text-primary), -1px 0 0 var(--text-primary)" // Make RUN thicker
      }}>
        RUN
      </span>
      <span style={{ 
        fontFamily: "'Space Grotesk', sans-serif", 
        fontWeight: 900, 
        fontSize: textSz, 
        color: "var(--blue-core)", 
        display: "inline-block", 
        transform: "skewX(-18deg)", 
        marginLeft: "-1px", 
        textShadow: "1px 0 0 var(--blue-core), -1px 0 0 var(--blue-core)" 
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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
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
          <button 
            onClick={handleLogin}
            style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: "var(--text-primary)", color: "var(--bg-base)", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "transform 0.1s" }}
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#facc15" }}>
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
          <button style={{ background: "var(--text-primary)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
            <span>+</span> New Application
          </button>
        </div>

        {/* ── EMPTY STATE ── */}
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
          <button style={{ background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "var(--bg-surface)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
            Add Application
          </button>
        </div>

      </main>
    </div>
  );
}
