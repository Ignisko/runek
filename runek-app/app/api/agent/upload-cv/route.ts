import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('cv') as File;
    
    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const userdataDir = path.join(process.cwd(), '..', 'userdata');
    
    if (!fs.existsSync(userdataDir)) {
      fs.mkdirSync(userdataDir, { recursive: true });
    }

    const filePath = path.join(userdataDir, 'cv.pdf');
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ ok: true, message: "CV uploaded successfully" });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
