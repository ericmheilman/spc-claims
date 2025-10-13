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

    // First, try to use Lyzr orchestrator
    try {
      console.log('Attempting to process with Lyzr orchestrator...');
      const orchestrator = new SPCClaimsOrchestrator();
      const claimArrayBuffer = await claimFile.arrayBuffer();
      const roofReportArrayBuffer = await roofReportFile.arrayBuffer();
      const claimPdfContent = Buffer.from(claimArrayBuffer);
      const roofReportPdfContent = Buffer.from(roofReportArrayBuffer);
      
      const result = await orchestrator.processDualPDFsWithLyzr(
        claimPdfContent, 
        claimFile.name,
        roofReportPdfContent,
        roofReportFile.name
      );
      
      return NextResponse.json({
        success: true,
        data: result,
        processingMode: 'lyzr'
      });
      
    } catch (lyzrError) {
      console.error('Lyzr orchestrator failed, falling back to basic processing:', lyzrError);
      
      // Fall back to basic PDF processing
      try {
        const fallbackFormData = new FormData();
        fallbackFormData.append('claimFile', claimFile);
        fallbackFormData.append('roofReportFile', roofReportFile);
        
        const fallbackRequest = new Request(request.url.replace('/process-claim', '/process-claim-fallback'), {
          method: 'POST',
          body: fallbackFormData
        });
        
        const fallbackResponse = await fetch(fallbackRequest);
        
        if (!fallbackResponse.ok) {
          throw new Error(`Fallback processing failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
        }
        
        const fallbackResult = await fallbackResponse.json();
        
        return NextResponse.json({
          success: true,
          data: fallbackResult.data,
          processingMode: 'fallback',
          lyzrError: lyzrError instanceof Error ? lyzrError.message : 'Unknown Lyzr error',
          message: 'Processed using fallback mode due to Lyzr API unavailability'
        });
        
      } catch (fallbackError) {
        console.error('Both Lyzr and fallback processing failed:', fallbackError);
        throw new Error(`All processing methods failed. Lyzr error: ${lyzrError instanceof Error ? lyzrError.message : 'Unknown'}. Fallback error: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`);
      }
    }

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
