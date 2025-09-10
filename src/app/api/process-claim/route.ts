import { NextRequest, NextResponse } from 'next/server';
import { SPCClaimsOrchestrator } from '@/lib/SPCClaimsOrchestrator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    const orchestrator = new SPCClaimsOrchestrator();
    const arrayBuffer = await file.arrayBuffer();
    const pdfContent = Buffer.from(arrayBuffer);
    
    const result = await orchestrator.processClaim(pdfContent, file.name);
    
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error processing claim:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process claim',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
