import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MISSION_LOGS_PATH = path.join(process.cwd(), '..', 'userdata', 'mission_logs.json');

export async function GET() {
  try {
    if (fs.existsSync(MISSION_LOGS_PATH)) {
      const data = fs.readFileSync(MISSION_LOGS_PATH, 'utf-8');
      return NextResponse.json({ ok: true, data: JSON.parse(data) });
    }
    return NextResponse.json({ ok: true, data: [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Failed to read mission logs" }, { status: 500 });
  }
}
