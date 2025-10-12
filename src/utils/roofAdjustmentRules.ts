// Roof Adjustment Rules Engine
// Implements shingle removal and replacement adjustment logic

export interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  rcv?: number;
  depreciation?: number;
  acv?: number;
  category?: string;
}

export interface AdjustmentResult {
  original: LineItem;
  adjusted: LineItem;
  changes: string[];
  reason: string;
}

export interface RoofMeasurements {
  totalArea: number;
  pitchAreas: {
    [key: string]: number; // e.g., "7/12": 500, "8/12": 300
  };
  ridgeLength: number;
  hipLength: number;
  valleyLength: number;
  eavesLength: number;
  rakesLength: number;
  stepFlashingLength: number;
}

export interface RuleApplication {
  ruleId: string;
  ruleName: string;
  section: string;
  description: string;
  applied: boolean;
  reason?: string;
}

export interface RulesEngineResult {
  adjustedLineItems: LineItem[];
  adjustments: AdjustmentResult[];
  warnings: string[];
  notifications: string[];
  totalAreaAllPitches: number | null;
  roofMeasurements: RoofMeasurements | null;
  appliedRules: RuleApplication[];
}

// Helper: Round up to nearest fraction
function roundUpToFraction(value: number, fraction: number): number {
  return Math.ceil(value * fraction) / fraction;
}

// Helper: Find line item by description (case-insensitive, partial match)
function findLineItem(items: LineItem[], searchTerms: string[]): LineItem | null {
  for (const term of searchTerms) {
    const found = items.find(item => 
      item.description.toLowerCase().includes(term.toLowerCase())
    );
    if (found) return found;
  }
  return null;
}

// Helper: Check if any of the search terms exist in line items
function existsLineItem(items: LineItem[], searchTerms: string[]): boolean {
  return findLineItem(items, searchTerms) !== null;
}

// Extract comprehensive roof measurements from roof report
export function extractRoofMeasurements(roofAgentResponse: string): RoofMeasurements | null {
  try {
    console.log('=== EXTRACTING ROOF MEASUREMENTS ===');
    console.log('Response length:', roofAgentResponse?.length);
    console.log('Response preview:', roofAgentResponse?.substring(0, 500));
    
    let parsedData: any = null;
    let rawContent = roofAgentResponse;

    // Step 1: Try to parse as JSON object (might have "response" key)
    try {
      const outerJson = JSON.parse(roofAgentResponse);
      if (outerJson && typeof outerJson === 'object' && 'response' in outerJson) {
        rawContent = outerJson.response;
        console.log('Extracted response from outer JSON object');
      } else if (typeof outerJson === 'string') {
        rawContent = outerJson;
        console.log('Parsed outer JSON string');
      }
    } catch (e) {
      console.log('Not a JSON object or failed to parse, using as-is');
    }

    // Step 2: Extract JSON from markdown code block (```json\n{...}\n```)
    const markdownMatch = rawContent.match(/```json\s*\n([\s\S]*?)\n```/);
    if (markdownMatch && markdownMatch[1]) {
      try {
        parsedData = JSON.parse(markdownMatch[1]);
        console.log('Successfully parsed JSON from markdown code block');
      } catch (e) {
        console.warn('Failed to parse JSON from markdown block:', e);
      }
    }

    // Step 3: If no markdown block, try to find a standalone JSON object
    if (!parsedData) {
      const jsonMatch = rawContent.match(/(\{[\s\S]*?\})/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          parsedData = JSON.parse(jsonMatch[1]);
          console.log('Successfully parsed standalone JSON object');
        } catch (e) {
          console.warn('Failed to parse standalone JSON object:', e);
        }
      }
    }

    if (!parsedData) {
      console.warn('Could not find or parse any JSON object in the roof report response.');
      console.warn('Response received (full):', roofAgentResponse);
      return null;
    }

    // Helper function to safely extract numeric values from {"value": X} objects
    const getValue = (obj: any) => {
      if (!obj) return null;
      if (typeof obj === 'number') return obj; // Direct number
      if (typeof obj === 'object' && 'value' in obj) {
        const val = parseFloat(obj.value);
        return isNaN(val) ? null : val;
      }
      return null;
    };

    const measurements: RoofMeasurements = {
      totalArea: 0,
      pitchAreas: {},
      ridgeLength: 0,
      hipLength: 0,
      valleyLength: 0,
      eavesLength: 0,
      rakesLength: 0,
      stepFlashingLength: 0
    };

    // Populate measurements from the parsed JSON data
    measurements.totalArea = getValue(parsedData["Total Roof Area"]) || getValue(parsedData["Total Area (All Pitches)"]) || 0;
    measurements.ridgeLength = getValue(parsedData["Total Ridges/Hips Length"]) || getValue(parsedData["Total Line Lengths (Ridges)"]) || 0;
    measurements.hipLength = getValue(parsedData["Total Ridges/Hips Length"]) || getValue(parsedData["Total Line Lengths (Hips)"]) || 0;
    measurements.valleyLength = getValue(parsedData["Total Valleys Length"]) || getValue(parsedData["Total Line Lengths (Valleys)"]) || 0;
    measurements.eavesLength = getValue(parsedData["Total Eaves Length"]) || getValue(parsedData["Total Line Lengths (Eaves)"]) || 0;
    measurements.rakesLength = getValue(parsedData["Total Rakes Length"]) || getValue(parsedData["Total Line Lengths (Rakes)"]) || 0;
    measurements.stepFlashingLength = getValue(parsedData["Total Step Flashing Length"]) || 0;

    // Populate pitch areas
    for (let i = 1; i <= 12; i++) {
      const pitchKey = `${i}/12`;
      const areaKey = `Area for Pitch ${pitchKey} (sq ft)`;
      const areaValue = getValue(parsedData[areaKey]);
      if (areaValue !== null) {
        measurements.pitchAreas[pitchKey] = areaValue;
      }
    }
    // Handle 12/12+ pitch area
    const area12PlusKey = `Area for Pitch 12/12+ (sq ft)`;
    const area12PlusValue = getValue(parsedData[area12PlusKey]);
    if (area12PlusValue !== null) {
      measurements.pitchAreas['12/12+'] = area12PlusValue;
    }

    console.log('Parsed JSON data keys:', Object.keys(parsedData));
    console.log('Total Roof Area raw value:', parsedData["Total Roof Area"]);
    console.log('Total Area (All Pitches) raw value:', parsedData["Total Area (All Pitches)"]);
    console.log('Extracted Total Roof Area:', getValue(parsedData["Total Roof Area"]));
    console.log('Extracted Total Area (All Pitches):', getValue(parsedData["Total Area (All Pitches)"]));
    console.log('Final measurements.totalArea:', measurements.totalArea);
    
    // Debug pitch areas
    console.log('Pitch areas extracted:', measurements.pitchAreas);
    
    // If totalArea is still 0, calculate it from pitch areas
    if (measurements.totalArea === 0) {
      const calculatedTotal = Object.values(measurements.pitchAreas).reduce((sum, area) => sum + area, 0);
      if (calculatedTotal > 0) {
        measurements.totalArea = calculatedTotal;
        console.log('Calculated total area from pitch areas:', measurements.totalArea);
      }
    }

    console.log('Extracted roof measurements:', measurements);
    
    // If we have at least a total area, return the measurements
    if (measurements.totalArea > 0) {
      console.log('✅ Successfully extracted roof measurements');
      return measurements;
    }
    
    // If no measurements found, log what we tried
    console.warn('⚠️ Could not extract total area from roof report');
    console.warn('Please ensure the roof report contains one of the following:');
    console.warn('- "Total Area: [number]"');
    console.warn('- "Total Roof Area: [number]"');
    console.warn('- "[number] sq ft total"');
    console.warn('Response received:', roofAgentResponse?.substring(0, 200));
    
    return null;
  } catch (error) {
    console.error('Error extracting roof measurements:', error);
    return null;
  }
}

// Extract Total Area from roof measurement report (backwards compatibility)
export function extractTotalAreaFromRoofReport(roofAgentResponse: string): number | null {
  const measurements = extractRoofMeasurements(roofAgentResponse);
  return measurements ? measurements.totalArea : null;
}

// Main rules engine
export function applyRoofAdjustmentRules(
  lineItems: LineItem[],
  roofMeasurements: RoofMeasurements
): RulesEngineResult {
  const adjustments: AdjustmentResult[] = [];
  const warnings: string[] = [];
  const notifications: string[] = [];
  const appliedRules: RuleApplication[] = [];
  const adjustedLineItems: LineItem[] = JSON.parse(JSON.stringify(lineItems)); // Deep clone

  // Calculate required quantity in squares (Total Area / 100)
  const totalAreaAllPitches = roofMeasurements.totalArea;
  const requiredSquares = totalAreaAllPitches / 100;

  console.log('=== ROOF ADJUSTMENT RULES ENGINE ===');
  console.log('Roof Measurements:', roofMeasurements);
  console.log('Total Area (All Pitches):', totalAreaAllPitches);
  console.log('Required Squares:', requiredSquares);

  // Section 1: Shingle Removal Adjustments
  const removalTerms = {
    laminatedWithoutFelt: ['Remove Laminated - comp. shingle rfg. - w/out felt'],
    threeTwentyFiveWithoutFelt: ['Remove 3 tab - 25 yr. - comp. shingle roofing - w/out felt'],
    threeTwentyFiveWithFelt: ['Remove 3 tab - 25 yr. - composition shingle roofing - incl. felt'],
    laminatedWithFelt: ['Remove Laminated - comp. shingle rfg. - w/ felt'],
  };

  // Check if any removal items exist
  const anyRemovalExists = Object.values(removalTerms).some(terms => 
    existsLineItem(adjustedLineItems, terms)
  );

  if (!anyRemovalExists) {
    notifications.push(
      'No shingle removal line items found. Please create one of the following: ' +
      'Remove Laminated - comp. shingle rfg. - w/out felt, ' +
      'Remove 3 tab - 25 yr. - comp. shingle roofing - w/out felt, ' +
      'Remove 3 tab - 25 yr. - composition shingle roofing - incl. felt, or ' +
      'Remove Laminated - comp. shingle rfg. - w/ felt'
    );
  }

  // Process each removal type
  for (const [key, terms] of Object.entries(removalTerms)) {
    const item = findLineItem(adjustedLineItems, terms);
    if (item) {
      const original = { ...item };
      let changed = false;
      const changes: string[] = [];

      // Check if quantity is less than required
      if (item.quantity < requiredSquares) {
        const difference = requiredSquares - item.quantity;
        item.quantity = requiredSquares;
        changes.push(`Quantity increased by ${difference.toFixed(2)} (from ${original.quantity} to ${item.quantity})`);
        changed = true;
      }

      // Round up based on type
      if (key.includes('laminated')) {
        const rounded = roundUpToFraction(item.quantity, 4);
        if (rounded !== item.quantity) {
          changes.push(`Quantity rounded up to nearest 1/4: ${item.quantity.toFixed(2)} → ${rounded.toFixed(2)}`);
          item.quantity = rounded;
          changed = true;
        }
      } else {
        const rounded = roundUpToFraction(item.quantity, 3);
        if (rounded !== item.quantity) {
          changes.push(`Quantity rounded up to nearest 1/3: ${item.quantity.toFixed(2)} → ${rounded.toFixed(2)}`);
          item.quantity = rounded;
          changed = true;
        }
      }

      // Recalculate RCV if unit price exists
      if (item.unitPrice && changed) {
        const oldRcv = item.rcv || 0;
        item.rcv = item.quantity * item.unitPrice;
        changes.push(`RCV updated: $${oldRcv.toFixed(2)} → $${item.rcv.toFixed(2)}`);
        
        // Recalculate ACV if depreciation exists
        if (item.depreciation !== undefined) {
          const oldAcv = item.acv || 0;
          item.acv = item.rcv - item.depreciation;
          changes.push(`ACV updated: $${oldAcv.toFixed(2)} → $${item.acv.toFixed(2)}`);
        }
      }

      if (changed) {
        adjustments.push({
          original,
          adjusted: item,
          changes,
          reason: 'Shingle removal quantity adjustment based on roof area'
        });
      }
    }
  }

  // Section 2: Shingle Replacement Adjustments
  const replacementTerms = {
    laminatedWithoutFelt: ['Laminated - comp. shingle rfg. - w/out felt'],
    threeTwentyFiveWithoutFelt: ['3 tab - 25 yr. - comp. shingle roofing - w/out felt'],
    threeTwentyFiveWithFelt: ['3 tab - 25 yr. - composition shingle roofing - incl. felt'],
    laminatedWithFelt: ['Laminated - comp. shingle rfg. - w/ felt'],
  };

  // Check if any replacement items exist
  const anyReplacementExists = Object.values(replacementTerms).some(terms => 
    existsLineItem(adjustedLineItems, terms)
  );

  if (!anyReplacementExists) {
    notifications.push(
      'No shingle replacement line items found. Consider adding one of the following: ' +
      'Laminated - comp. shingle rfg. - w/out felt, ' +
      '3 tab - 25 yr. - comp. shingle roofing - w/out felt, ' +
      '3 tab - 25 yr. - composition shingle roofing - incl. felt, or ' +
      'Laminated - comp. shingle rfg. - w/ felt'
    );
  }

  // Process each replacement type
  for (const [key, terms] of Object.entries(replacementTerms)) {
    const item = findLineItem(adjustedLineItems, terms);
    if (item) {
      const original = { ...item };
      let changed = false;
      const changes: string[] = [];

      // Check if quantity is less than required
      if (item.quantity < requiredSquares) {
        const difference = requiredSquares - item.quantity;
        item.quantity = requiredSquares;
        changes.push(`Quantity increased by ${difference.toFixed(2)} (from ${original.quantity} to ${item.quantity})`);
        changed = true;
      }

      // Round up based on type
      if (key.includes('laminated')) {
        const rounded = roundUpToFraction(item.quantity, 4);
        if (rounded !== item.quantity) {
          changes.push(`Quantity rounded up to nearest 1/4: ${item.quantity.toFixed(2)} → ${rounded.toFixed(2)}`);
          item.quantity = rounded;
          changed = true;
        }
      } else {
        const rounded = roundUpToFraction(item.quantity, 3);
        if (rounded !== item.quantity) {
          changes.push(`Quantity rounded up to nearest 1/3: ${item.quantity.toFixed(2)} → ${rounded.toFixed(2)}`);
          item.quantity = rounded;
          changed = true;
        }
      }

      // Recalculate RCV if unit price exists
      if (item.unitPrice && changed) {
        const oldRcv = item.rcv || 0;
        item.rcv = item.quantity * item.unitPrice;
        changes.push(`RCV updated: $${oldRcv.toFixed(2)} → $${item.rcv.toFixed(2)}`);
        
        // Recalculate ACV if depreciation exists
        if (item.depreciation !== undefined) {
          const oldAcv = item.acv || 0;
          item.acv = item.rcv - item.depreciation;
          changes.push(`ACV updated: $${oldAcv.toFixed(2)} → $${item.acv.toFixed(2)}`);
        }
      }

      if (changed) {
        adjustments.push({
          original,
          adjusted: item,
          changes,
          reason: 'Shingle replacement quantity adjustment based on roof area'
        });
      }
    }
  }

  // Track Section 1 rules
  appliedRules.push({
    ruleId: 'S1-R1',
    ruleName: 'Shingle Removal Quantity Adjustment',
    section: 'Section 1: Shingle Removal and Replacement Adjustments',
    description: 'Ensures removal quantities match Total Area / 100',
    applied: adjustments.some(a => a.reason.includes('removal'))
  });

  appliedRules.push({
    ruleId: 'S1-R2',
    ruleName: 'Laminated Shingle Rounding (1/4)',
    section: 'Section 1: Shingle Removal and Replacement Adjustments',
    description: 'Rounds laminated shingle quantities to nearest 1/4',
    applied: adjustments.some(a => a.changes.some(c => c.includes('nearest 1/4')))
  });

  appliedRules.push({
    ruleId: 'S1-R3',
    ruleName: '3-Tab Shingle Rounding (1/3)',
    section: 'Section 1: Shingle Removal and Replacement Adjustments',
    description: 'Rounds 3-tab shingle quantities to nearest 1/3',
    applied: adjustments.some(a => a.changes.some(c => c.includes('nearest 1/3')))
  });

  // Section 2: Steep Roof Charge Adjustments
  const steepRoof7to9 = (roofMeasurements.pitchAreas['7/12'] || 0) + 
                        (roofMeasurements.pitchAreas['8/12'] || 0) + 
                        (roofMeasurements.pitchAreas['9/12'] || 0);
  const steepRoof10to12 = (roofMeasurements.pitchAreas['10/12'] || 0) + 
                          (roofMeasurements.pitchAreas['11/12'] || 0) + 
                          (roofMeasurements.pitchAreas['12/12'] || 0);
  const steepRoofOver12 = roofMeasurements.pitchAreas['12/12+'] || 0;

  // Handle 7/12 to 9/12 steep roof charges
  if (steepRoof7to9 > 0) {
    const requiredSteep7to9 = steepRoof7to9 / 100;
    
    // Remove charge
    const removeSteep7to9 = findLineItem(adjustedLineItems, ['Remove Additional charge for steep roof - 7/12 to 9/12 slope']);
    if (removeSteep7to9 && removeSteep7to9.quantity !== requiredSteep7to9) {
      const original = { ...removeSteep7to9 };
      removeSteep7to9.quantity = requiredSteep7to9;
      adjustments.push({
        original,
        adjusted: removeSteep7to9,
        changes: [`Quantity set to ${requiredSteep7to9.toFixed(2)} based on 7/12-9/12 pitch areas`],
        reason: 'Steep roof (7/12-9/12) removal charge adjustment'
      });
    }
    
    // Install charge
    const addSteep7to9 = findLineItem(adjustedLineItems, ['Additional charge for steep roof - 7/12 to 9/12 slope']);
    if (addSteep7to9 && addSteep7to9.quantity !== requiredSteep7to9) {
      const original = { ...addSteep7to9 };
      addSteep7to9.quantity = requiredSteep7to9;
      adjustments.push({
        original,
        adjusted: addSteep7to9,
        changes: [`Quantity set to ${requiredSteep7to9.toFixed(2)} based on 7/12-9/12 pitch areas`],
        reason: 'Steep roof (7/12-9/12) installation charge adjustment'
      });
    }
  }

  appliedRules.push({
    ruleId: 'S2-R1',
    ruleName: 'Steep Roof Charge 7/12-9/12',
    section: 'Section 2: Steep Roof Charge Adjustments',
    description: 'Adjusts steep roof charges for 7/12 to 9/12 pitches',
    applied: steepRoof7to9 > 0
  });

  // Handle 10/12 to 12/12 steep roof charges
  if (steepRoof10to12 > 0) {
    const requiredSteep10to12 = steepRoof10to12 / 100;
    
    const removeSteep10to12 = findLineItem(adjustedLineItems, ['Remove Additional charge for steep roof - 10/12 - 12/12 slope']);
    if (removeSteep10to12 && removeSteep10to12.quantity !== requiredSteep10to12) {
      const original = { ...removeSteep10to12 };
      removeSteep10to12.quantity = requiredSteep10to12;
      adjustments.push({
        original,
        adjusted: removeSteep10to12,
        changes: [`Quantity set to ${requiredSteep10to12.toFixed(2)} based on 10/12-12/12 pitch areas`],
        reason: 'Steep roof (10/12-12/12) removal charge adjustment'
      });
    }
    
    const addSteep10to12 = findLineItem(adjustedLineItems, ['Additional charge for steep roof - 10/12 - 12/12 slope']);
    if (addSteep10to12 && addSteep10to12.quantity !== requiredSteep10to12) {
      const original = { ...addSteep10to12 };
      addSteep10to12.quantity = requiredSteep10to12;
      adjustments.push({
        original,
        adjusted: addSteep10to12,
        changes: [`Quantity set to ${requiredSteep10to12.toFixed(2)} based on 10/12-12/12 pitch areas`],
        reason: 'Steep roof (10/12-12/12) installation charge adjustment'
      });
    }
  }

  appliedRules.push({
    ruleId: 'S2-R2',
    ruleName: 'Steep Roof Charge 10/12-12/12',
    section: 'Section 2: Steep Roof Charge Adjustments',
    description: 'Adjusts steep roof charges for 10/12 to 12/12 pitches',
    applied: steepRoof10to12 > 0
  });

  // Handle >12/12 steep roof charges
  if (steepRoofOver12 > 0) {
    const requiredSteepOver12 = steepRoofOver12 / 100;
    
    const removeSteepOver12 = findLineItem(adjustedLineItems, ['Remove Additional charge for steep roof greater than 12/12 slope']);
    if (removeSteepOver12 && removeSteepOver12.quantity !== requiredSteepOver12) {
      const original = { ...removeSteepOver12 };
      removeSteepOver12.quantity = requiredSteepOver12;
      adjustments.push({
        original,
        adjusted: removeSteepOver12,
        changes: [`Quantity set to ${requiredSteepOver12.toFixed(2)} based on 12/12+ pitch areas`],
        reason: 'Steep roof (>12/12) removal charge adjustment'
      });
    }
    
    const addSteepOver12 = findLineItem(adjustedLineItems, ['Additional charge for steep roof greater than 12/12 slope']);
    if (addSteepOver12 && addSteepOver12.quantity !== requiredSteepOver12) {
      const original = { ...addSteepOver12 };
      addSteepOver12.quantity = requiredSteepOver12;
      adjustments.push({
        original,
        adjusted: addSteepOver12,
        changes: [`Quantity set to ${requiredSteepOver12.toFixed(2)} based on 12/12+ pitch areas`],
        reason: 'Steep roof (>12/12) installation charge adjustment'
      });
    }
  }

  appliedRules.push({
    ruleId: 'S2-R3',
    ruleName: 'Steep Roof Charge >12/12',
    section: 'Section 2: Steep Roof Charge Adjustments',
    description: 'Adjusts steep roof charges for pitches greater than 12/12',
    applied: steepRoofOver12 > 0
  });

  // Section 6: Drip Edge Adjustments
  if (roofMeasurements.eavesLength > 0 && roofMeasurements.rakesLength > 0) {
    const dripEdgeRequired = roofMeasurements.eavesLength + roofMeasurements.rakesLength;
    const dripEdge = findLineItem(adjustedLineItems, ['Drip edge', 'gutter apron']);
    
    if (dripEdge && dripEdge.quantity < dripEdgeRequired) {
      const original = { ...dripEdge };
      dripEdge.quantity = dripEdgeRequired;
      adjustments.push({
        original,
        adjusted: dripEdge,
        changes: [`Quantity set to ${dripEdgeRequired.toFixed(2)} ft (Eaves: ${roofMeasurements.eavesLength} + Rakes: ${roofMeasurements.rakesLength})`],
        reason: 'Drip edge adjustment based on eaves + rakes'
      });
    }
  }

  appliedRules.push({
    ruleId: 'S6-R1',
    ruleName: 'Drip Edge Adjustment',
    section: 'Section 6: Drip Edge and Flashing Adjustments',
    description: 'Sets drip edge to Eaves + Rakes length',
    applied: (roofMeasurements.eavesLength > 0 && roofMeasurements.rakesLength > 0)
  });

  // Section 6: Step Flashing Adjustments
  if (roofMeasurements.stepFlashingLength > 0) {
    const stepFlashing = findLineItem(adjustedLineItems, ['Step flashing']);
    
    if (stepFlashing && stepFlashing.quantity < roofMeasurements.stepFlashingLength) {
      const original = { ...stepFlashing };
      stepFlashing.quantity = roofMeasurements.stepFlashingLength;
      adjustments.push({
        original,
        adjusted: stepFlashing,
        changes: [`Quantity set to ${roofMeasurements.stepFlashingLength.toFixed(2)} ft from roof measurements`],
        reason: 'Step flashing adjustment based on measurement report'
      });
    }
  }

  appliedRules.push({
    ruleId: 'S6-R2',
    ruleName: 'Step Flashing Adjustment',
    section: 'Section 6: Drip Edge and Flashing Adjustments',
    description: 'Sets step flashing to measured length',
    applied: roofMeasurements.stepFlashingLength > 0
  });

  // Section 7: Valley Adjustments
  if (roofMeasurements.valleyLength > 0) {
    const valleyMetal = findLineItem(adjustedLineItems, ['Valley metal']);
    
    if (valleyMetal && valleyMetal.quantity < roofMeasurements.valleyLength) {
      const original = { ...valleyMetal };
      valleyMetal.quantity = roofMeasurements.valleyLength;
      adjustments.push({
        original,
        adjusted: valleyMetal,
        changes: [`Quantity set to ${roofMeasurements.valleyLength.toFixed(2)} ft from roof measurements`],
        reason: 'Valley metal adjustment based on measurement report'
      });
    }
  }

  appliedRules.push({
    ruleId: 'S7-R1',
    ruleName: 'Valley Metal Adjustment',
    section: 'Section 7: Valley Adjustments',
    description: 'Sets valley metal to measured valley length',
    applied: roofMeasurements.valleyLength > 0
  });

  // Section 8: Starter Adjustments
  if (roofMeasurements.eavesLength > 0 && roofMeasurements.rakesLength > 0) {
    const starterRequired = roofMeasurements.eavesLength + roofMeasurements.rakesLength;
    const starter = findLineItem(adjustedLineItems, ['Asphalt starter', 'universal starter', 'peel and stick']);
    
    if (starter && starter.quantity < starterRequired) {
      const original = { ...starter };
      starter.quantity = starterRequired;
      adjustments.push({
        original,
        adjusted: starter,
        changes: [`Quantity set to ${starterRequired.toFixed(2)} ft (Eaves: ${roofMeasurements.eavesLength} + Rakes: ${roofMeasurements.rakesLength})`],
        reason: 'Starter adjustment based on perimeter (eaves + rakes)'
      });
    }
  }

  appliedRules.push({
    ruleId: 'S8-R1',
    ruleName: 'Starter Course Adjustment',
    section: 'Section 8: Starter and Waste Adjustments',
    description: 'Sets starter to total perimeter (eaves + rakes)',
    applied: (roofMeasurements.eavesLength > 0 && roofMeasurements.rakesLength > 0)
  });

  // Section 5: Ridge/Hip Cap Adjustments
  if (roofMeasurements.ridgeLength > 0 || roofMeasurements.hipLength > 0) {
    const totalRidgeHip = roofMeasurements.ridgeLength + roofMeasurements.hipLength;
    const ridgeCap = findLineItem(adjustedLineItems, ['Hip / Ridge cap', 'ridge cap']);
    
    if (ridgeCap && ridgeCap.quantity < totalRidgeHip) {
      const original = { ...ridgeCap };
      ridgeCap.quantity = totalRidgeHip;
      adjustments.push({
        original,
        adjusted: ridgeCap,
        changes: [`Quantity set to ${totalRidgeHip.toFixed(2)} ft (Ridge: ${roofMeasurements.ridgeLength} + Hip: ${roofMeasurements.hipLength})`],
        reason: 'Ridge/Hip cap adjustment based on measurement report'
      });
    }
  }

  appliedRules.push({
    ruleId: 'S5-R1',
    ruleName: 'Ridge/Hip Cap Adjustment',
    section: 'Section 5: Ridge Vent and Cap Adjustments',
    description: 'Sets ridge/hip cap to total ridge + hip length',
    applied: (roofMeasurements.ridgeLength > 0 || roofMeasurements.hipLength > 0)
  });

  console.log('Adjustments made:', adjustments.length);
  console.log('Warnings:', warnings.length);
  console.log('Notifications:', notifications.length);
  console.log('Applied Rules:', appliedRules.filter(r => r.applied).length, '/', appliedRules.length);

  return {
    adjustedLineItems,
    adjustments,
    warnings,
    notifications,
    totalAreaAllPitches,
    roofMeasurements,
    appliedRules
  };
}

