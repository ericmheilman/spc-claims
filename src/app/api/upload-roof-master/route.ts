import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Extend global to include roof master macro data
declare global {
  var roofMasterMacroData: string | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const content = buffer.toString('utf-8');

    // Validate CSV structure (should have 3 columns: description, unit, unit_price)
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file is empty or has insufficient data' },
        { status: 400 }
      );
    }

    // Auto-detect delimiter (tab or comma)
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    
    // Normalize header (case-insensitive, handle spaces)
    const header = firstLine.split(delimiter).map(h => h.trim());
    const normalizedHeader = header.map(h => h.toLowerCase().replace(/\s+/g, '_'));
    
    if (!normalizedHeader.includes('description') || !normalizedHeader.includes('unit') || !normalizedHeader.includes('unit_price')) {
      return NextResponse.json(
        { 
          error: 'CSV must have columns: Description, Unit, Unit Price (or description, unit, unit_price)',
          foundColumns: header
        },
        { status: 400 }
      );
    }

    // Try to save to project root (overwrite existing roof_master_macro.csv)
    let filePath = '';
    let publicFilePath = '';
    
    try {
      filePath = join(process.cwd(), 'roof_master_macro.csv');
      await writeFile(filePath, buffer);
      console.log('✅ Saved to project root:', filePath);
    } catch (error) {
      console.log('⚠️ Could not save to project root (read-only filesystem):', error);
    }

    // Try to save to public directory for backup
    try {
      const publicDir = join(process.cwd(), 'public');
      if (!existsSync(publicDir)) {
        await mkdir(publicDir, { recursive: true });
      }
      publicFilePath = join(publicDir, 'roof_master_macro.csv');
      await writeFile(publicFilePath, buffer);
      console.log('✅ Saved to public directory:', publicFilePath);
    } catch (error) {
      console.log('⚠️ Could not save to public directory (read-only filesystem):', error);
    }

    // Store in memory for production environments with read-only filesystems
    // This will be used by the JavaScript rules API
    global.roofMasterMacroData = content;
    console.log('✅ Stored roof master macro data in memory for production use');

    // Count valid items (use detected delimiter)
    let itemCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const parts = line.split(delimiter);
        if (parts.length >= 3) {
          itemCount++;
        }
      }
    }

    console.log(`✅ Roof Master Macro CSV uploaded: ${itemCount} items`);

    return NextResponse.json({
      success: true,
      message: 'Roof Master Macro uploaded successfully',
      itemCount,
      filePath
    });

  } catch (error) {
    console.error('Error uploading Roof Master Macro:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

