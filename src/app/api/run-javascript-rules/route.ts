import { NextRequest, NextResponse } from 'next/server';
import { RoofAdjustmentEngine } from '@/lib/roofAdjustmentEngine';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const inputData = await request.json();
    
    console.log('Received request to run JavaScript rule engine with data:', {
      lineItemsCount: inputData.line_items?.length || 0,
      hasRoofMeasurements: !!inputData.roof_measurements,
      wastePercentage: inputData.waste_percentage
    });

    // Load roof master macro CSV
    const csvPath = path.join(process.cwd(), 'public', 'roof_master_macro.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    // Simple CSV parsing without external library
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const records = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = values[index];
        });
        records.push(record);
      }
    }

    // Convert CSV records to the format expected by the engine
    const roofMasterMacroData: Record<string, any> = {};
    for (const record of records) {
      // Handle case-insensitive field names
      const description = record.Description || record.description;
      const unit = record.Unit || record.unit;
      const unitPrice = record['Unit Price'] || record['unit_price'] || record.unit_price;
      
      if (description && unit && unitPrice) {
        roofMasterMacroData[description] = {
          description: description,
          unit: unit,
          unit_price: parseFloat(unitPrice),
        };
      }
    }

    console.log(`📊 Loaded ${Object.keys(roofMasterMacroData).length} items from roof master macro`);

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

