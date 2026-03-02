import { NextRequest, NextResponse } from 'next/server';
import { RoofAdjustmentEngine } from '@/lib/roofAdjustmentEngine';
import fs from 'fs/promises';
import path from 'path';

// Extend global to include roof master macro data
declare global {
  var roofMasterMacroData: string | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const inputData = await request.json();
    
    console.log('Received request to run JavaScript rule engine with data:', {
      lineItemsCount: inputData.line_items?.length || 0,
      hasRoofMeasurements: !!inputData.roof_measurements,
      wastePercentage: inputData.waste_percentage
    });

    // Load roof master macro CSV - try memory first, then file, then defaults
    let csvContent = '';
    
    // Try memory first (for uploaded data)
    if (global.roofMasterMacroData) {
      console.log('📊 Using roof master macro data from memory (uploaded)');
      csvContent = global.roofMasterMacroData;
    } else {
      // Try multiple file locations
      const possiblePaths = [
        path.join(process.cwd(), 'roof_master_macro.csv'), // Project root
        path.join(process.cwd(), 'public', 'roof_master_macro.csv'), // Public directory
        '/tmp/app/roof_master_macro.csv' // AWS Lambda temp directory
      ];
      
      let loaded = false;
      for (const csvPath of possiblePaths) {
        try {
          csvContent = await fs.readFile(csvPath, 'utf-8');
          console.log(`📊 Using roof master macro data from file: ${csvPath}`);
          loaded = true;
          break;
        } catch (error) {
          console.log(`⚠️ Could not load from ${csvPath}:`, error.message);
        }
      }
      
      if (!loaded) {
        console.log('⚠️ Could not load roof master macro from any file, using default');
        // Fallback to a comprehensive default that includes the key items
        csvContent = `Description,Unit,Unit Price
Laminated - comp. shingle rfg. - w/out felt,SQ,249.37
3 tab - 25 yr. - comp. shingle roofing - w/out felt,SQ,235.6
Remove Laminated - comp. shingle rfg. - w/out felt,SQ,67.4
Remove 3 tab - 25 yr. - comp. shingle roofing - w/out felt,SQ,65.96
Asphalt starter - universal starter course,LF,1.73
Drip edge/gutter apron,LF,3.09
Step flashing,LF,10.28
Aluminum sidewall/endwall flashing - mill finish,LF,6.77
Roofing felt - 15 lb. - double coverage/low slope,SQ,61.44
Roofing felt - 15 lb.,SQ,34.68
Roofing felt - 30 lb.,SQ,42.64
Additional charge for steep roof - 10/12 - 12/12 slope,SQ,64.99
Remove Additional charge for steep roof - 10/12 - 12/12 slope,SQ,25.83`;
      }
    }
    
    // Parse CSV - extract first 3 columns (Description, Unit, Unit Price)
    // Lines may have trailing empty columns; we only need the first 3
    const lines = csvContent.split('\n').filter(line => line.trim());
    const roofMasterMacroData: Record<string, any> = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(',');
      if (columns.length >= 3) {
        const description = columns[0].trim();
        const unit = columns[1].trim();
        const unitPrice = parseFloat(columns[2].trim());

        if (description && unit && !isNaN(unitPrice)) {
          roofMasterMacroData[description] = {
            description: description,
            unit: unit,
            unit_price: unitPrice,
          };
        }
      }
    }

    console.log(`📊 Loaded ${Object.keys(roofMasterMacroData).length} items from roof master macro`);
    
    // Debug: Show first few items
    const firstItems = Object.keys(roofMasterMacroData).slice(0, 3);
    console.log(`🔍 First 3 roof master macro items:`, firstItems.map(key => ({
      description: key,
      unit_price: roofMasterMacroData[key].unit_price
    })));

    // Initialize the adjustment engine
    const engine = new RoofAdjustmentEngine(roofMasterMacroData);

    // Process adjustments
    const results = engine.processAdjustments(
      inputData.line_items,
      inputData.roof_measurements,
      inputData.waste_percentage
    );

    console.log('✅ JavaScript rule engine executed successfully');
    console.log(`📊 Results:`, {
      totalAdjustments: results.adjustment_results.total_adjustments,
      totalAdditions: results.adjustment_results.total_additions,
      adjustmentsByType: results.adjustment_results.adjustments_by_type,
    });

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error: any) {
    console.error('Error running JavaScript rule engine:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: `JavaScript rule engine failed: ${error.message || 'Unknown error'}`,
        debug: {
          message: error.message,
          stack: error.stack,
          engine_type: 'JavaScript',
          processing_method: 'Native Next.js execution'
        }
      },
      { status: 500 }
    );
  }
}

