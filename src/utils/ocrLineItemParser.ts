interface OCRPage {
  page: number;
  content: string;
}

interface OCRData {
  status: string;
  data: Record<string, OCRPage>;
}

interface LineItem {
  line_number: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  RCV: number;
  age_life: string | null;
  condition: string | null;
  dep_percent: number | null;
  depreciation_amount: number;
  ACV: number;
  location_room: string | null;
  category: string;
  page_number: number;
}

// Sample adjustment patterns that should be ignored
const SAMPLE_ADJUSTMENT_PATTERNS = [
  /Your guide to reading your adjuster summary/i,
  /Insured: John Smith/i,
  /Property: 1234 Oak Street/i,
  /Anytown, Anystate 12345/i,
  /Claim Number: 1234567890/i,
  /Policy Number: 000000123456789/i,
  /Type of Loss: Wind Damage/i,
  /This is a sample guide/i,
  /©2018 Allstate Insurance Company/i,
  /Xactware/i,
  /LF = Linear Feet SQ = 100 Square Feet/i,
  /This amount reflects the Replacement Cost Value/i,
  /The category or state of an item/i,
  /This represents the age and average life/i,
  /Describes the repairs and\/or replacement/i,
  /Total before adding any applicable taxes/i,
  /The involved policy coverage for the damaged/i,
  /When appropriate, general contractors/i,
  /The total estimate with any applicable/i,
  /Reflects the applicable policy deductible/i,
  /Total amount of depreciation that is recoverable/i,
  /Based upon where the loss occurred/i,
  /The total replacement cost less recoverable/i
];

// Patterns to identify line items
const LINE_ITEM_PATTERNS = [
  // Pattern 1: Table format with pipes (Allstate format) - more flexible
  /^\|\s*(\d+)\.\s+(.+?)\s*\|\s*(\d+(?:\.\d+)?)\s+(SF|SQ|LF|EA|HR|SY|FA)\s*\|\s*([-\d,]+\.\d+)\s*\|\s*([-\d,]+\.\d+)\s*\|\s*(\d+\/\d+\s+yrs?|\d+\/NA|0\/NA|Q\/NA)\s*\|\s*(Avg\.|Abv\.\s+Avg\.|Below\s+Avg\.|New)\s*\|\s*(\d+(?:\.\d+)?%|NA)\s*\|\s*\(([-\d,]+\.\d+)\)\s*\|\s*([\d,]+\.\d+)\s*\|$/im,
  
  // Pattern 2: Multi-line format (Allstate continued pages) - more flexible
  /^(\d+)\.\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(SF|SQ|LF|EA|HR|SY|FA)\s+([-\d,]+\.\d+)\s+([-\d,]+\.\d+)\s+(\d+\/\d+\s+yrs?|\d+\/NA|0\/NA|Q\/NA)\s+(Avg\.|Abv\.\s+Avg\.|Below\s+Avg\.|New)\s+(\d+(?:\.\d+)?%|NA)\s+\(([-\d,]+\.\d+)\)\s+([\d,]+\.\d+)$/im,
  
  // Pattern 3: Original format (other insurance companies)
  /^(\d+)\.\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(SF|SQ|LF|EA|HR|SY)\s+(\d+(?:\.\d+)?)\s+(\d+\/\d+\s+yrs?|\d+\/NA|0\/NA|Q\/NA)\s+(Avg\.|Abv\.\s+Avg\.|Below\s+Avg\.|New)\s+(\d+(?:\.\d+)?%|NA)\s+\(([-\d,]+\.\d+)\)\s+([\d,]+\.\d+)$/im,
  
  // Pattern 4: Table format with pipes (simplified) - more flexible
  /^\|\s*(\d+)\.\s+(.+?)\s*\|\s*(\d+(?:\.\d+)?)\s+(SF|SQ|LF|EA|HR|SY|FA)\s*\|\s*([-\d,]+\.\d+)\s*\|\s*([-\d,]+\.\d+)\s*\|\s*(\d+\/\d+\s+yrs?|\d+\/NA|0\/NA|Q\/NA)\s*\|\s*(Avg\.|Abv\.\s+Avg\.|Below\s+Avg\.|New)\s*\|\s*(\d+(?:\.\d+)?%|NA)\s*\|\s*\(([-\d,]+\.\d+)\)\s*\|\s*([\d,]+\.\d+)\s*\|$/im
];

export function parseOCRToLineItems(ocrData: OCRData): LineItem[] {
  console.log('=== OCR PARSER DEBUG ===');
  console.log('OCR Data structure:', {
    status: ocrData.status,
    dataKeys: Object.keys(ocrData.data),
    totalPages: Object.keys(ocrData.data).length
  });
  
  const lineItems: LineItem[] = [];
  
  // Get all pages sorted by page number
  const pages = Object.values(ocrData.data).sort((a, b) => a.page - b.page);
  console.log(`Processing ${pages.length} pages`);
  
  for (const page of pages) {
    console.log(`\nProcessing page ${page.page}...`);
    
    // Skip pages that contain sample adjustment data
    if (isSampleAdjustmentPage(page.content)) {
      console.log(`Skipping sample adjustment page ${page.page}`);
      continue;
    }
    
    const pageLineItems = extractLineItemsFromPage(page.content, page.page);
    console.log(`Found ${pageLineItems.length} line items on page ${page.page}`);
    lineItems.push(...pageLineItems);
  }
  
  console.log(`\n=== PARSING COMPLETE ===`);
  console.log(`Total line items extracted: ${lineItems.length}`);
  lineItems.forEach((item, index) => {
    console.log(`${index + 1}. ${item.line_number}. ${item.description} - ${item.quantity} ${item.unit} - RCV: $${item.RCV}`);
  });
  
  return lineItems;
}

function isSampleAdjustmentPage(content: string): boolean {
  return SAMPLE_ADJUSTMENT_PATTERNS.some(pattern => pattern.test(content));
}

function extractLineItemsFromPage(content: string, pageNumber: number): LineItem[] {
  const lineItems: LineItem[] = [];
  const lines = content.split('\n');
  
  console.log(`  Page ${pageNumber}: ${lines.length} lines to process`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Try each pattern to match line items
    for (let j = 0; j < LINE_ITEM_PATTERNS.length; j++) {
      const pattern = LINE_ITEM_PATTERNS[j];
      const match = line.match(pattern);
      if (match) {
        console.log(`  Found match with pattern ${j + 1} on line ${i + 1}: ${line.substring(0, 50)}...`);
        try {
          const lineItem = parseLineItemFromMatch(match, pageNumber);
          if (lineItem && isValidLineItem(lineItem)) {
            lineItems.push(lineItem);
            console.log(`  ✅ Extracted line item: ${lineItem.line_number}. ${lineItem.description}`);
          } else {
            console.log(`  ❌ Invalid line item: ${line.substring(0, 50)}...`);
          }
        } catch (error) {
          console.warn(`  ⚠️ Failed to parse line item from: ${line}`, error);
        }
        break; // Found a match, no need to try other patterns
      }
    }
  }
  
  return lineItems;
}

function parseLineItemFromMatch(match: RegExpMatchArray, pageNumber: number): LineItem | null {
  try {
    // Extract values based on pattern type
    let lineNumber, description, quantity, unit, unitPrice, rcv, ageLife, condition, depPercent, depreciationAmount, acv;
    
    if (match.length === 12) {
      // Pattern 1: Table format with pipes (Allstate format)
      // | 1. Description | QUANTITY UNIT | UNIT_PRICE | RCV | AGE/LIFE | COND | DEP% | DEPREC. | ACV |
      [, lineNumber, description, quantity, unit, unitPrice, rcv, ageLife, condition, depPercent, depreciationAmount, acv] = match;
    } else if (match.length === 13) {
      // Pattern 2: Multi-line format (Allstate continued pages)
      // 17. Description QUANTITY UNIT UNIT_PRICE RCV AGE/LIFE COND DEP% DEPREC. ACV
      [, lineNumber, description, quantity, unit, unitPrice, rcv, ageLife, condition, depPercent, depreciationAmount, acv] = match;
    } else if (match.length === 14) {
      // Pattern 3: Original format (other insurance companies)
      // Number. Description QUANTITY UNIT RCV AGE/LIFE COND DEP% DEPREC. ACV
      [, lineNumber, description, quantity, unit, rcv, ageLife, condition, depPercent, depreciationAmount, acv] = match;
      unitPrice = parseFloat(rcv.toString().replace(/,/g, '')) / parseFloat(quantity.toString().replace(/,/g, '')); // Calculate unit price
    } else if (match.length === 15) {
      // Pattern 4: Table format with pipes (simplified)
      [, lineNumber, description, quantity, unit, unitPrice, rcv, ageLife, condition, depPercent, depreciationAmount, acv] = match;
    } else {
      console.warn(`Unexpected match length: ${match.length} for line: ${match[0]}`);
      return null;
    }
    
    // Clean up values
    description = description.trim();
    quantity = parseFloat(quantity.toString().replace(/,/g, ''));
    unitPrice = parseFloat(unitPrice.toString().replace(/,/g, ''));
    rcv = parseFloat(rcv.toString().replace(/,/g, ''));
    depreciationAmount = parseFloat(depreciationAmount.toString().replace(/,/g, ''));
    acv = parseFloat(acv.toString().replace(/,/g, ''));
    
    // Parse depreciation percentage
    let depPercentValue: number | null = null;
    if (depPercent && depPercent !== 'NA') {
      depPercentValue = parseFloat(depPercent.toString().replace('%', '')) / 100;
    }
    
    // Determine category based on description
    const category = determineCategory(description);
    
    // Determine location/room
    const locationRoom = determineLocationRoom(description);
    
    return {
      line_number: lineNumber,
      description: description,
      quantity: quantity,
      unit: unit,
      unit_price: unitPrice,
      RCV: rcv,
      age_life: ageLife || null,
      condition: condition || null,
      dep_percent: depPercentValue,
      depreciation_amount: depreciationAmount,
      ACV: acv,
      location_room: locationRoom,
      category: category,
      page_number: pageNumber
    };
  } catch (error) {
    console.error('Error parsing line item:', error);
    return null;
  }
}

function isValidLineItem(item: LineItem): boolean {
  // Basic validation
  return (
    item.line_number &&
    item.description &&
    item.description.length > 3 &&
    item.quantity > 0 &&
    item.unit &&
    item.RCV >= 0 &&
    item.ACV >= 0 &&
    // Skip items that look like totals or headers
    !item.description.toLowerCase().includes('total') &&
    !item.description.toLowerCase().includes('subtotal') &&
    !item.description.toLowerCase().includes('summary')
  );
}

function determineCategory(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('roof') || desc.includes('shingle') || desc.includes('felt') || desc.includes('drip') || desc.includes('flashing') || desc.includes('ridge') || desc.includes('hip')) {
    return 'Dwelling Roof';
  } else if (desc.includes('gutter') || desc.includes('downspout') || desc.includes('fascia') || desc.includes('soffit')) {
    return 'Soffit, Fascia, & Gutter';
  } else if (desc.includes('siding') || desc.includes('vinyl')) {
    return 'Siding';
  } else if (desc.includes('window') || desc.includes('glass')) {
    return 'Windows - Vinyl';
  } else if (desc.includes('door')) {
    return 'Doors';
  } else if (desc.includes('drywall') || desc.includes('sheetrock')) {
    return 'Drywall';
  } else if (desc.includes('paint') || desc.includes('primer')) {
    return 'Painting';
  } else if (desc.includes('insulation')) {
    return 'Insulation';
  } else if (desc.includes('electrical') || desc.includes('light') || desc.includes('fixture')) {
    return 'Electrical';
  } else if (desc.includes('plumb') || desc.includes('toilet') || desc.includes('faucet')) {
    return 'Plumbing';
  } else if (desc.includes('floor') || desc.includes('carpet') || desc.includes('tile')) {
    return 'Flooring';
  } else if (desc.includes('fence') || desc.includes('gate')) {
    return 'Fencing';
  } else if (desc.includes('debris') || desc.includes('haul') || desc.includes('dump')) {
    return 'General Demolition';
  } else if (desc.includes('labor') || desc.includes('minimum')) {
    return 'Labor Minimums';
  } else if (desc.includes('clean') || desc.includes('cleaning')) {
    return 'Cleaning';
  } else if (desc.includes('content') || desc.includes('move') || desc.includes('reset')) {
    return 'Content Manipulation';
  } else {
    return 'General';
  }
}

function determineLocationRoom(description: string): string | null {
  const desc = description.toLowerCase();
  
  if (desc.includes('roof') || desc.includes('shingle') || desc.includes('felt') || desc.includes('drip') || desc.includes('flashing')) {
    return 'Roof';
  } else if (desc.includes('kitchen')) {
    return 'Kitchen';
  } else if (desc.includes('bathroom') || desc.includes('bath')) {
    return 'Bathroom';
  } else if (desc.includes('bedroom')) {
    return 'Bedroom';
  } else if (desc.includes('living room') || desc.includes('living')) {
    return 'Living Room';
  } else if (desc.includes('dining room') || desc.includes('dining')) {
    return 'Dining Room';
  } else if (desc.includes('garage')) {
    return 'Garage';
  } else if (desc.includes('basement')) {
    return 'Basement';
  } else if (desc.includes('attic')) {
    return 'Attic';
  } else if (desc.includes('exterior') || desc.includes('outside')) {
    return 'Exterior';
  } else {
    return null;
  }
}

export default parseOCRToLineItems;
