import { NextResponse } from 'next/server';
import { ProfileStore } from '../../../../lib/services/profile-store';

export async function GET() {
  const profile = ProfileStore.getInstance().get();
  return NextResponse.json({ ok: true, data: profile });
}

export async function POST(request: Request) {
  try {
    const patch = await request.json();
    const updated = ProfileStore.getInstance().update(patch);
    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
