import { NextRequest, NextResponse } from 'next/server';
import { SPCClaimsOrchestrator } from '@/lib/SPCClaimsOrchestrator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const claimFile = formData.get('claimFile') as File;
    const roofReportFile = formData.get('roofReportFile') as File;
    
    if (!claimFile) {
      return NextResponse.json(
        { error: 'No insurance claim file provided' },
        { status: 400 }
      );
    }

    if (!roofReportFile) {
      return NextResponse.json(
        { error: 'No roof report file provided' },
        { status: 400 }
      );
    }

    if (claimFile.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Insurance claim file must be a PDF' },
        { status: 400 }
      );
    }

    if (roofReportFile.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Roof report file must be a PDF' },
        { status: 400 }
      );
    }

    const orchestrator = new SPCClaimsOrchestrator();
    const claimArrayBuffer = await claimFile.arrayBuffer();
    const roofReportArrayBuffer = await roofReportFile.arrayBuffer();
    const claimPdfContent = Buffer.from(claimArrayBuffer);
    const roofReportPdfContent = Buffer.from(roofReportArrayBuffer);
    
    // Use Lyzr orchestrator for processing both files
    const result = await orchestrator.processDualPDFsWithLyzr(
      claimPdfContent, 
      claimFile.name,
      roofReportPdfContent,
      roofReportFile.name
    );
    
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error processing dual PDFs:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process PDFs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
