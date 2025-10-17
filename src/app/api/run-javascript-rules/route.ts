import { NextRequest, NextResponse } from 'next/server';
import { RoofAdjustmentEngine } from '@/lib/roofAdjustmentEngine';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

export async function POST(request: NextRequest) {
  try {
    const inputData = await request.json();
    
    console.log('Received request to run JavaScript rule engine with data:', {
      lineItemsCount: inputData.line_items?.length || 0,
      hasRoofMeasurements: !!inputData.roof_measurements
    });

    // Load roof master macro CSV
    const csvPath = path.join(process.cwd(), 'public', 'roof_master_macro.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Convert CSV records to the format expected by the engine
    const roofMasterMacroData: Record<string, any> = {};
    for (const record of records) {
      roofMasterMacroData[record.description] = {
        description: record.description,
        unit: record.unit,
        unit_price: parseFloat(record.unit_price),
      };
    }

    console.log(`📊 Loaded ${Object.keys(roofMasterMacroData).length} items from roof master macro`);

    // Initialize the adjustment engine
    const engine = new RoofAdjustmentEngine(roofMasterMacroData);

    // Process adjustments
    const results = engine.processAdjustments(
      inputData.line_items,
      inputData.roof_measurements
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

