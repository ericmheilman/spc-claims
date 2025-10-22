import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface MacroItem {
  id: string;
  description: string;
  unit: string;
  unit_price: number;
}

// Function to read and parse roof master macro CSV
function readRoofMasterMacro(): MacroItem[] {
  try {
    const csvPath = path.join(process.cwd(), 'roof_master_macro.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n');
    const items: MacroItem[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const columns = line.split(',');
        if (columns.length >= 3) {
          items.push({
            id: `macro-${i}`,
            description: columns[0].trim(),
            unit: columns[1].trim(),
            unit_price: parseFloat(columns[2].trim()) || 0
          });
        }
      }
    }
    
    return items;
  } catch (error) {
    console.error('Error reading roof master macro:', error);
    return [];
  }
}

// Function to write roof master macro CSV
function writeRoofMasterMacro(items: MacroItem[]): boolean {
  try {
    const csvPath = path.join(process.cwd(), 'roof_master_macro.csv');
    
    // Create CSV content
    let csvContent = 'Description,Unit,Unit Price,,,,,,,,\n';
    
    items.forEach(item => {
      csvContent += `${item.description},${item.unit},${item.unit_price},,,,,,,,\n`;
    });
    
    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing roof master macro:', error);
    return false;
  }
}

// GET endpoint to fetch all macro items
export async function GET() {
  try {
    const macroItems = readRoofMasterMacro();
    
    return NextResponse.json({
      success: true,
      items: macroItems,
      count: macroItems.length
    });
  } catch (error) {
    console.error('Error fetching roof master macro:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch roof master macro items'
    }, { status: 500 });
  }
}

// PUT endpoint to update macro items
export async function PUT(request: NextRequest) {
  try {
    const { items } = await request.json();
    
    if (!Array.isArray(items)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid items format'
      }, { status: 400 });
    }
    
    // Validate items structure
    for (const item of items) {
      if (!item.description || !item.unit || typeof item.unit_price !== 'number') {
        return NextResponse.json({
          success: false,
          error: 'Invalid item structure'
        }, { status: 400 });
      }
    }
    
    const success = writeRoofMasterMacro(items);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Roof master macro updated successfully',
        count: items.length
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update roof master macro'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating roof master macro:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
