import { NextRequest, NextResponse } from 'next/server';

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
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Create FormData for the OCR API
    const ocrFormData = new FormData();
    ocrFormData.append('file', file);

    // Call the Lyzr OCR API
    const ocrResponse = await fetch('https://lyzr-ocr.lyzr.app/extract?api_key=sk-default-Lpq8P8pB0PGzf8BBaXTJArdMcYa0Fr6K', {
      method: 'POST',
      body: ocrFormData
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('OCR API error:', errorText);
      return NextResponse.json(
        { error: `OCR API failed: ${ocrResponse.status}`, details: errorText },
        { status: ocrResponse.status }
      );
    }

    const ocrResult = await ocrResponse.json();
    
    return NextResponse.json({
      success: true,
      data: ocrResult,
      fileName: file.name,
      fileSize: file.size,
      extractedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('OCR extraction error:', error);
    return NextResponse.json(
      { 
        error: 'OCR extraction failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
