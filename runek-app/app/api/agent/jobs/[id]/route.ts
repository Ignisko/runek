import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../../lib/services/pipeline-store';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const updatePayload = await request.json();
    
    const updatedJob = pipelineStore.update(id, updatePayload);
    
    if (!updatedJob) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedJob });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
