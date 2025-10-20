import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface LineItem {
  line_number: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  RCV: number;
  age_life: string;
  condition: string;
  dep_percent: number | null;
  depreciation_amount: number;
  ACV: number;
  location_room: string | null;
  category: string;
  page_number: number;
  narrative?: string;
}

interface MacroItem {
  description: string;
  unit: string;
  unit_price: number;
}

interface MatchingResult {
  line_number: string;
  description: string;
  hasExactMatch: boolean;
  suggestions: Array<{
    description: string;
    unit: string;
    unit_price: number;
    similarity: number;
  }>;
}

// Function to calculate string similarity using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Function to normalize text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
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

export async function POST(request: NextRequest) {
  try {
    const inputData = await request.json();
    const lineItems: LineItem[] = inputData.line_items || [];
    
    console.log('Received macro matching request with', lineItems.length, 'line items');
    
    if (lineItems.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'No line items to process'
      });
    }
    
    // Read roof master macro
    const macroItems = readRoofMasterMacro();
    console.log('Loaded', macroItems.length, 'items from roof master macro');
    
    if (macroItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No roof master macro items found'
      });
    }
    
    const results: MatchingResult[] = [];
    
    // Check each line item against macro
    for (const item of lineItems) {
      const normalizedDescription = normalizeText(item.description);
      let hasExactMatch = false;
      const suggestions: Array<{
        description: string;
        unit: string;
        unit_price: number;
        similarity: number;
      }> = [];
      
      // Check for exact match first
      for (const macroItem of macroItems) {
        const normalizedMacroDescription = normalizeText(macroItem.description);
        if (normalizedDescription === normalizedMacroDescription) {
          hasExactMatch = true;
          break;
        }
      }
      
      // If no exact match, find suggestions with 85%+ similarity
      if (!hasExactMatch) {
        for (const macroItem of macroItems) {
          const similarity = calculateSimilarity(normalizedDescription, normalizeText(macroItem.description));
          
          if (similarity >= 0.85) {
            suggestions.push({
              description: macroItem.description,
              unit: macroItem.unit,
              unit_price: macroItem.unit_price,
              similarity
            });
          }
        }
        
        // Sort suggestions by similarity (highest first)
        suggestions.sort((a, b) => b.similarity - a.similarity);
        
        // Limit to top 3 suggestions
        suggestions.splice(3);
      }
      
      // Only include items that don't have exact matches
      if (!hasExactMatch) {
        results.push({
          line_number: item.line_number,
          description: item.description,
          hasExactMatch,
          suggestions
        });
      }
    }
    
    console.log('Macro matching completed:', results.length, 'items need attention');
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalItems: lineItems.length,
        exactMatches: lineItems.length - results.length,
        needsAttention: results.length,
        suggestionsFound: results.reduce((sum, result) => sum + result.suggestions.length, 0)
      }
    });
    
  } catch (error) {
    console.error('Error in macro matching:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during macro matching'
    }, { status: 500 });
  }
}
