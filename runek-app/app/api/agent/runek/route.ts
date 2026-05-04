import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST() {
  try {
    const scriptPath = path.join(process.cwd(), "lib", "agent", "engine.ts");
    
    const child = spawn("npx", ["tsx", scriptPath], {
      detached: true,
      stdio: "ignore", 
      windowsHide: true,
      cwd: process.cwd()
    });
    
    child.unref();

    return NextResponse.json({ ok: true, message: "Runek Autopilot Started" });
  } catch (error) {
    console.error("Failed to start Runek engine:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
