// Comprehensive JavaScript Roof Adjustment Engine
// Implements all 60+ rules with exact variable names and line item descriptions

import { RoofAdjustmentLogger, roofAdjustmentLogger } from './roofAdjustmentLogger';

interface LineItem {
  line_number: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  RCV: number;
  age_life?: string;
  condition?: string;
  dep_percent?: number;
  depreciation_amount?: number;
  ACV?: number;
  location_room?: string;
  category?: string;
  page_number?: number;
  narrative?: string;
}

interface RoofMeasurements {
  [key: string]: { value: number } | number;
}

interface RoofMasterItem {
  description: string;
  unit: string;
  unit_price: number;
}

interface AuditLogEntry {
  line_number: string;
  field: string;
  before: any;
  after: any;
  explanation: string;
  rule_applied: string;
  timestamp: string;
}

interface AdjustmentResults {
  original_line_items: LineItem[];
  adjusted_line_items: LineItem[];
  audit_log: AuditLogEntry[];
  adjustment_results: {
    total_adjustments: number;
    total_additions: number;
    adjustments_by_type: {
      quantity_adjustments: number;
      price_adjustments: number;
      new_additions: number;
      rounding_adjustments: number;
      steep_roof_adjustments: number;
      drip_edge_adjustments: number;
      starter_course_adjustments: number;
      ridge_vent_adjustments: number;
      valley_metal_adjustments: number;
      step_flashing_adjustments: number;
    };
  };
}

export class RoofAdjustmentEngine {
  private roofMasterMacro: Map<string, RoofMasterItem>;
  private auditLog: AuditLogEntry[] = [];
  private adjustmentCounts = {
    quantity_adjustments: 0,
    price_adjustments: 0,
    new_additions: 0,
    rounding_adjustments: 0,
    steep_roof_adjustments: 0,
    drip_edge_adjustments: 0,
    starter_course_adjustments: 0,
    ridge_vent_adjustments: 0,
    valley_metal_adjustments: 0,
    step_flashing_adjustments: 0,
  };

  // Exact line item descriptions from the comprehensive rule set
  private readonly EXACT_DESCRIPTIONS = {
    // Removal items
    REMOVE_LAMINATED_WITHOUT_FELT: "Remove Laminated comp. shingle rfg. - w/out felt",
    REMOVE_3TAB_25YR_WITHOUT_FELT: "Remove 3 tab- 25 yr. comp. shingle roofing - w/out felt",
    REMOVE_3TAB_25YR_WITH_FELT: "Remove 3 tab 25 yr. composition shingle roofing - incl. felt",
    REMOVE_LAMINATED_WITH_FELT: "Remove Laminated comp. shingle rfg. - w/ felt",
    REMOVE_3TAB_PER_SHINGLE: "Remove 3 tab - 25 yr. - composition shingle roofing (per SHINGLE)",
    REMOVE_LAMINATED_PER_SHINGLE: "Remove Laminated - comp. shingle rfg (per SHINGLE)",
    TEAR_OFF_3TAB: "Tear off, haul and dispose of comp. shingles - 3 tab",
    TEAR_OFF_LAMINATED: "Tear off, haul and dispose of comp. shingles - Laminated",
    TEAR_OFF_3TAB_NO_HAUL: "Tear off composition shingles - 3 tab (no haul off)",
    TEAR_OFF_LAMINATED_NO_HAUL: "Tear off composition shingles - Laminated (no haul off)",
    
    // Installation items - Standard
    LAMINATED_WITHOUT_FELT: "Laminated comp. shingle rfg. - w/out felt",
    TAB_25YR_WITHOUT_FELT: "3 tab 25 yr. comp. shingle roofing - w/out felt",
    TAB_25YR_WITH_FELT: "3 tab 25 yr. composition shingle roofing incl. felt",
    LAMINATED_WITH_FELT: "Laminated comp. shingle rfg. - w/ felt",
    
    // Installation items - Material Only variations
    MATERIAL_ONLY_LAMINATED_WITHOUT_FELT: "Material Only Laminated - comp. shingle rfg. - w/out felt",
    MATERIAL_ONLY_LAMINATED_WITH_FELT: "Material Only Laminated - comp. shingle rfg. - w/ felt",
    MATERIAL_ONLY_3TAB_WITHOUT_FELT: "Material Only 3 tab 25 yr. comp. shingle roofing - w/out felt",
    MATERIAL_ONLY_3TAB_WITH_FELT: "Material Only 3 tab 25 yr. composition shingle roofing - incl. felt",
    MATERIAL_ONLY_3TAB_PER_SHINGLE: "Material Only 3 tab - 25 yr. - composition shingle roofing (per SHINGLE)",
    MATERIAL_ONLY_LAMINATED_PER_SHINGLE: "Material Only Laminated - comp. shingle rfg (per SHINGLE)",
    
    // Installation items - Install variations
    INSTALL_LAMINATED_WITHOUT_FELT: "Install Laminated comp. shingle rfg. - w/out felt",
    INSTALL_LAMINATED_WITH_FELT: "Install Laminated comp. shingle rfg. - w/ felt",
    INSTALL_3TAB_WITHOUT_FELT: "Install 3 tab 25 yr. comp. shingle roofing - w/out felt",
    INSTALL_3TAB_WITH_FELT: "Install 3 tab 25 yr. composition shingle roofing - incl. felt",
    INSTALL_3TAB_PER_SHINGLE: "Install 3 tab - 25 yr. - composition shingle roofing (per SHINGLE)",
    INSTALL_LAMINATED_PER_SHINGLE: "Install Laminated - comp. shingle rfg (per SHINGLE)",
    
    // Dumpster items
    DUMPSTER_12_YARD: "Dumpster load - Approx. 12 yards, 1-3 tons of debris",
    
    // Starter courses
    STARTER_UNIVERSAL: "Asphalt starter - universal starter course",
    STARTER_PEEL_STICK: "Asphalt starter - peel and stick",
    STARTER_LAMINATED: "Asphalt starter - laminated double layer starter",
    
    // Steep roof charges
    REMOVE_STEEP_7_9: "Remove Additional charge for steep roof - 7/12 to 9/12 slope",
    STEEP_7_9: "Additional charge for steep roof - 7/12 to 9/12 slope",
    REMOVE_STEEP_10_12: "Remove Additional charge for steep roof - 10/12 - 12/12 slope",
    STEEP_10_12: "Additional charge for steep roof - 10/12 - 12/12 slope",
    REMOVE_STEEP_12_PLUS: "Remove Additional charge for steep roof greater than 12/12 slope",
    STEEP_12_PLUS: "Additional charge for steep roof greater than 12/12 slope",
    
    // Ridge vents and caps
    RIDGE_VENT_ALUMINUM: "Continuous ridge vent aluminum",
    RIDGE_VENT_SHINGLE: "Continuous ridge vent shingle-over style",
    RIDGE_VENT_DETACH_RESET: "Continuous ridge vent - Detach & reset",
    HIP_RIDGE_HIGH: "Hip/Ridge cap High profile - composition shingles",
    HIP_RIDGE_STANDARD: "Hip/Ridge cap Standard profile - composition shingles",
    HIP_RIDGE_CUT_3TAB: "Hip/Ridge cap cut from 3 tab composition shingles",
    
    // Flashing and edges
    DRIP_EDGE: "Drip edge/gutter apron",
    STEP_FLASHING: "Step flashing",
    ALUMINUM_FLASHING: "Aluminum sidewall/endwall flashing - mill finish",
    VALLEY_METAL: "Valley metal",
    VALLEY_METAL_W: "Valley metal - (W) profile",
    
    // Felt underlayment
    FELT_15LB_DOUBLE_COVERAGE: "Roofing felt - 15 lb. - double coverage/low slope",
    FELT_15LB: "Roofing felt - 15 lb.",
    FELT_30LB: "Roofing felt - 30 lb.",
  };

  // Exact variable names from RMR measurements
  private readonly RMR_VARIABLES = {
    TOTAL_ROOF_AREA: "Total Roof Area",
    TOTAL_EAVES_LENGTH: "Total Eaves Length",
    TOTAL_RAKES_LENGTH: "Total Rakes Length",
    TOTAL_RIDGES_HIPS_LENGTH: "Total Ridges/Hips Length",
    TOTAL_VALLEYS_LENGTH: "Total Valleys Length",
    TOTAL_LINE_LENGTHS_VALLEYS: "Total Line Lengths (Valleys)",
    TOTAL_STEP_FLASHING_LENGTH: "Total Step Flashing Length",
    TOTAL_FLASHING_LENGTH: "Total Flashing Length",
    TOTAL_LINE_LENGTHS_RIDGES: "Total Line Lengths (Ridges)",
    TOTAL_LINE_LENGTHS_HIPS: "Total Line Lengths (Hips)",
    AREA_PITCH_1_12: "Area for Pitch 1/12 (sq ft)",
    AREA_PITCH_2_12: "Area for Pitch 2/12 (sq ft)",
    AREA_PITCH_3_12: "Area for Pitch 3/12 (sq ft)",
    AREA_PITCH_4_12: "Area for Pitch 4/12 (sq ft)",
    AREA_PITCH_5_12: "Area for Pitch 5/12 (sq ft)",
    AREA_PITCH_6_12: "Area for Pitch 6/12 (sq ft)",
    AREA_PITCH_7_12: "Area for Pitch 7/12 (sq ft)",
    AREA_PITCH_8_12: "Area for Pitch 8/12 (sq ft)",
    AREA_PITCH_9_12: "Area for Pitch 9/12 (sq ft)",
    AREA_PITCH_10_12: "Area for Pitch 10/12 (sq ft)",
    AREA_PITCH_11_12: "Area for Pitch 11/12 (sq ft)",
    AREA_PITCH_12_12: "Area for Pitch 12/12 (sq ft)",
    AREA_PITCH_12_PLUS: "Area for Pitch 12/12+ (sq ft)",
  };

  constructor(roofMasterMacroData: Record<string, RoofMasterItem>) {
    this.roofMasterMacro = new Map(Object.entries(roofMasterMacroData));
    console.log('🏗️ Comprehensive Roof Adjustment Engine initialized');
    console.log(`📊 Loaded ${this.roofMasterMacro.size} roof master macro items`);
  }

  private logAudit(entry: AuditLogEntry) {
    entry.timestamp = new Date().toISOString();
    this.auditLog.push(entry);
    console.log(`📝 AUDIT: ${entry.rule_applied} - ${entry.explanation}`);
  }

  private getRMRValue(roofMeasurements: RoofMeasurements, variableName: string): number {
    const value = roofMeasurements[variableName];
    if (typeof value === 'object' && value !== null && 'value' in value) {
      return (value as { value: number }).value;
    }
    if (typeof value === 'number') {
      return value;
    }
    return 0;
  }

  private getRoofMasterItem(description: string): RoofMasterItem | null {
    // Try exact match first
    if (this.roofMasterMacro.has(description)) {
      return this.roofMasterMacro.get(description)!;
    }

    // Try case-insensitive match
    const lowerDesc = description.toLowerCase();
    for (const [key, value] of this.roofMasterMacro.entries()) {
      if (key.toLowerCase() === lowerDesc) {
        return value;
      }
    }

    return null;
  }

  private roundToNearest(quantity: number, increment: number): number {
    // Check if the quantity already ends in the correct increment
    // Use decimal analysis to determine if already at valid increment
    
    // For 0.33 increments, check if decimal part is close to 0, 0.33, or 0.67
    // For 0.25 increments, check if decimal part is close to 0, 0.25, 0.5, or 0.75
    const decimalPart = quantity % 1;
    const tolerance = 0.001;
    
    let isValidIncrement = false;
    if (increment === 0.33) {
      // Check if decimal is close to 0, 0.33, or 0.67
      isValidIncrement = Math.abs(decimalPart) < tolerance || 
                        Math.abs(decimalPart - 0.33) < tolerance || 
                        Math.abs(decimalPart - 0.67) < tolerance;
    } else if (increment === 0.25) {
      // Check if decimal is close to 0, 0.25, 0.5, or 0.75
      isValidIncrement = Math.abs(decimalPart) < tolerance || 
                        Math.abs(decimalPart - 0.25) < tolerance || 
                        Math.abs(decimalPart - 0.5) < tolerance || 
                        Math.abs(decimalPart - 0.75) < tolerance;
    }
    
    if (isValidIncrement) {
      return quantity;
    }
    
    // Otherwise, round up to the nearest increment
    return Math.ceil(quantity / increment) * increment;
  }

  private adjustQuantity(item: LineItem, newQuantity: number, reason: string, ruleApplied: string): LineItem {
    // CRITICAL: Only increase quantity, never decrease
    if (newQuantity > item.quantity && Math.abs(item.quantity - newQuantity) > 0.001) {
      this.logAudit({
        line_number: item.line_number,
        field: 'quantity',
        before: item.quantity,
        after: newQuantity,
        explanation: reason,
        rule_applied: ruleApplied,
        timestamp: '',
      });

      const adjustedItem = { ...item };
      adjustedItem.quantity = newQuantity;
      adjustedItem.RCV = newQuantity * item.unit_price;
      adjustedItem.narrative = `Field Changed: quantity | Explanation: ${reason}`;
      this.adjustmentCounts.quantity_adjustments++;

      return adjustedItem;
    } else if (newQuantity <= item.quantity) {
      console.log(`⚠️ SKIPPING quantity adjustment for ${item.description}: current (${item.quantity}) >= proposed (${newQuantity}). Only increases allowed.`);
    }
    return item;
  }

  private adjustUnitPrice(item: LineItem, newPrice: number, reason: string, ruleApplied: string): LineItem {
    // CRITICAL: Only increase price, never decrease
    if (newPrice > item.unit_price && Math.abs(item.unit_price - newPrice) > 0.01) {
      this.logAudit({
        line_number: item.line_number,
        field: 'unit_price',
        before: item.unit_price,
        after: newPrice,
        explanation: reason,
        rule_applied: ruleApplied,
        timestamp: '',
      });

      const adjustedItem = { ...item };
      adjustedItem.unit_price = newPrice;
      adjustedItem.RCV = item.quantity * newPrice;
      adjustedItem.narrative = `Field Changed: unit_price | Explanation: ${reason}`;
      this.adjustmentCounts.price_adjustments++;

      return adjustedItem;
    } else if (newPrice <= item.unit_price) {
      console.log(`⚠️ SKIPPING price adjustment for ${item.description}: current ($${item.unit_price}) >= proposed ($${newPrice}). Only increases allowed.`);
    }
    return item;
  }

  private addLineItem(
    description: string,
    quantity: number,
    unit: string,
    unitPrice: number,
    lineNumber: string,
    reason: string,
    ruleApplied: string
  ): LineItem {
    const newItem: LineItem = {
      line_number: lineNumber,
      description: description,
      quantity: quantity,
      unit: unit,
      unit_price: unitPrice,
      RCV: quantity * unitPrice,
      age_life: '',
      condition: '',
      dep_percent: 0,
      depreciation_amount: 0,
      ACV: quantity * unitPrice,
      location_room: 'Roof',
      category: 'Roofing',
      page_number: 999,
      narrative: `Field Changed: quantity | Explanation: ${reason}`,
    };

    this.logAudit({
      line_number: lineNumber,
      field: 'quantity',
      before: 0,
      after: quantity,
      explanation: reason,
      rule_applied: ruleApplied,
      timestamp: '',
    });

    this.adjustmentCounts.new_additions++;
    return newItem;
  }

  private findLineItem(items: LineItem[], description: string): LineItem | null {
    return items.find(item => item.description === description) || null;
  }

  private hasLineItem(items: LineItem[], description: string): boolean {
    return items.some(item => item.description === description);
  }

  // Category 1: Roof Master Macro Unit Cost Adjustment
  private applyUnitCostAdjustments(items: LineItem[]): LineItem[] {
    const ruleLog = roofAdjustmentLogger.startRuleExecution('Unit Cost Adjustments', 'Category 1');
    
    return items.map(item => {
      roofAdjustmentLogger.logItemProcessing(ruleLog, item.description, 'Checking unit price against roof master macro');
      
          const masterItem = this.getRoofMasterItem(item.description);
      if (masterItem && masterItem.unit_price > item.unit_price) {
        roofAdjustmentLogger.logAdjustment(ruleLog, item.description, 'unit_price', item.unit_price, masterItem.unit_price, 
          `Unit cost adjusted to roof master macro maximum: $${masterItem.unit_price}`);
        
        return this.adjustUnitPrice(
              item,
          masterItem.unit_price,
          `Unit cost adjusted to roof master macro maximum: $${masterItem.unit_price}`,
          'Category 1: Unit Cost Adjustment'
        );
      } else if (masterItem) {
        roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
          `Current price ($${item.unit_price}) is already at or above roof master macro price ($${masterItem.unit_price})`);
      } else {
        roofAdjustmentLogger.logWarning(ruleLog, `No roof master macro item found for: ${item.description}`);
      }
      return item;
    });
  }

  // Category A: Fully Automatable Calculations
  private applyShingleQuantityAdjustments(items: LineItem[], roofMeasurements: RoofMeasurements): LineItem[] {
    const ruleLog = roofAdjustmentLogger.startRuleExecution('Shingle Quantity Adjustments', 'Category A');
    
    const totalRoofArea = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_ROOF_AREA);
    const baseQuantity = totalRoofArea / 100; // Shingles are quoted in SQ, so divide by 100
    const suggestedWaste = 0.10; // 10% waste percentage
    
    roofAdjustmentLogger.logRuleDecision(ruleLog, 'Calculated base quantities', 
      `Total Roof Area (${totalRoofArea} sq ft) / 100 = ${baseQuantity} SQ, Waste: ${suggestedWaste * 100}%`);
    
    let adjustedItems = [...items];
    
    // Process each item for description replacements and quantity adjustments
    adjustedItems = adjustedItems.map(item => {
      let newItem = { ...item };
      let descriptionChanged = false;
      let quantityChanged = false;
      let ruleApplied = '';
      
      // INSTALLATION RULES - Description replacements and quantity adjustments with waste
      if (item.description === this.EXACT_DESCRIPTIONS.LAMINATED_WITHOUT_FELT) {
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Laminated Installation - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.TAB_25YR_WITHOUT_FELT) {
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = '3-Tab Installation - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.LAMINATED_WITH_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.LAMINATED_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Laminated w/felt → w/out felt - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.TAB_25YR_WITH_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.TAB_25YR_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = '3-Tab w/felt → w/out felt - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_3TAB_WITHOUT_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.TAB_25YR_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Material Only 3-Tab → Standard - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_3TAB_WITH_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.TAB_25YR_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Material Only 3-Tab w/felt → Standard w/out felt - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.INSTALL_3TAB_WITHOUT_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.TAB_25YR_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Install 3-Tab → Standard - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.INSTALL_3TAB_WITH_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.TAB_25YR_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Install 3-Tab w/felt → Standard w/out felt - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_3TAB_PER_SHINGLE) {
        newItem.description = this.EXACT_DESCRIPTIONS.TAB_25YR_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Material Only 3-Tab per SHINGLE → Standard - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.INSTALL_3TAB_PER_SHINGLE) {
        newItem.description = this.EXACT_DESCRIPTIONS.TAB_25YR_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Install 3-Tab per SHINGLE → Standard - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_LAMINATED_WITHOUT_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.LAMINATED_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Material Only Laminated → Standard - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_LAMINATED_WITH_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.LAMINATED_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Material Only Laminated w/felt → Standard w/out felt - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.INSTALL_LAMINATED_WITHOUT_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.LAMINATED_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Install Laminated → Standard - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.INSTALL_LAMINATED_WITH_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.LAMINATED_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Install Laminated w/felt → Standard w/out felt - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.INSTALL_LAMINATED_PER_SHINGLE) {
        newItem.description = this.EXACT_DESCRIPTIONS.LAMINATED_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Install Laminated per SHINGLE → Standard - Quantity with waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_LAMINATED_PER_SHINGLE) {
        newItem.description = this.EXACT_DESCRIPTIONS.LAMINATED_WITHOUT_FELT;
        const requiredQuantity = baseQuantity * (1 + suggestedWaste);
        newItem.quantity = Math.max(item.quantity, requiredQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Material Only Laminated per SHINGLE → Standard - Quantity with waste';
      }
      
      // REMOVAL RULES - Different logic, no waste percentage
      else if (item.description === this.EXACT_DESCRIPTIONS.REMOVE_LAMINATED_WITHOUT_FELT) {
        newItem.quantity = Math.max(item.quantity, baseQuantity);
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Remove Laminated - Quantity without waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.REMOVE_3TAB_25YR_WITHOUT_FELT) {
        newItem.quantity = Math.max(item.quantity, baseQuantity);
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Remove 3-Tab - Quantity without waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.REMOVE_3TAB_25YR_WITH_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.REMOVE_LAMINATED_WITHOUT_FELT;
        newItem.quantity = Math.max(item.quantity, baseQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Remove 3-Tab w/felt → Remove Laminated - Quantity without waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.REMOVE_LAMINATED_WITH_FELT) {
        newItem.description = this.EXACT_DESCRIPTIONS.REMOVE_3TAB_25YR_WITHOUT_FELT;
        newItem.quantity = Math.max(item.quantity, baseQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Remove Laminated w/felt → Remove 3-Tab - Quantity without waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.REMOVE_3TAB_PER_SHINGLE) {
        newItem.description = this.EXACT_DESCRIPTIONS.REMOVE_LAMINATED_WITHOUT_FELT;
        newItem.quantity = Math.max(item.quantity, baseQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Remove 3-Tab per SHINGLE → Remove Laminated - Quantity without waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.REMOVE_LAMINATED_PER_SHINGLE) {
        newItem.description = this.EXACT_DESCRIPTIONS.REMOVE_3TAB_25YR_WITHOUT_FELT;
        newItem.quantity = Math.max(item.quantity, baseQuantity);
        descriptionChanged = true;
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Remove Laminated per SHINGLE → Remove 3-Tab - Quantity without waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.TEAR_OFF_3TAB) {
        newItem.quantity = Math.max(item.quantity, baseQuantity);
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Tear off 3-Tab - Quantity without waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.TEAR_OFF_LAMINATED) {
        newItem.quantity = Math.max(item.quantity, baseQuantity);
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Tear off Laminated - Quantity without waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.TEAR_OFF_3TAB_NO_HAUL) {
        newItem.quantity = Math.max(item.quantity, baseQuantity);
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Tear off 3-Tab no haul - Quantity without waste';
      }
      else if (item.description === this.EXACT_DESCRIPTIONS.TEAR_OFF_LAMINATED_NO_HAUL) {
        newItem.quantity = Math.max(item.quantity, baseQuantity);
        quantityChanged = newItem.quantity > item.quantity;
        ruleApplied = 'Tear off Laminated no haul - Quantity without waste';
      }
      
      // Log changes
      if (descriptionChanged || quantityChanged) {
        if (descriptionChanged) {
          roofAdjustmentLogger.logItemProcessing(ruleLog, item.description, 
            `Description changed: ${item.description} → ${newItem.description}`);
        }
        if (quantityChanged) {
          roofAdjustmentLogger.logItemProcessing(ruleLog, item.description, 
            `Quantity changed: ${item.quantity} → ${newItem.quantity}`);
        }
        
        this.adjustmentCounts.quantity_adjustments++;
        return this.adjustQuantity(
          item,
          newItem.quantity,
          `Shingle adjustment: ${ruleApplied}`,
          ruleApplied
        );
      }
      
      return newItem;
    });
    
    // Handle dumpster additions for tear-off without haul-off
    const dumpsterItems: LineItem[] = [];
    adjustedItems.forEach(item => {
      if (item.description === this.EXACT_DESCRIPTIONS.TEAR_OFF_3TAB_NO_HAUL ||
          item.description === this.EXACT_DESCRIPTIONS.TEAR_OFF_LAMINATED_NO_HAUL) {
        
        // Check if dumpster already exists
        const existingDumpster = adjustedItems.find(existingItem => 
          existingItem.description === this.EXACT_DESCRIPTIONS.DUMPSTER_12_YARD
        );
        
        if (!existingDumpster) {
          const dumpsterItem: LineItem = {
            line_number: 999, // High number to avoid conflicts
            description: this.EXACT_DESCRIPTIONS.DUMPSTER_12_YARD,
            quantity: baseQuantity,
            unit: 'EA',
            unit_price: 0, // Will be set by roof master macro
            RCV: 0,
            age_life: '',
            condition: '',
            dep_percent: 0,
            depreciation_amount: 0,
            ACV: 0,
            location_room: 'Roof',
            category: 'Roofing',
            page_number: 999,
            narrative: `Field Changed: quantity | Explanation: Added dumpster for tear-off without haul-off`
          };
          
          dumpsterItems.push(dumpsterItem);
          roofAdjustmentLogger.logItemProcessing(ruleLog, item.description, 
            `Added dumpster item with quantity ${baseQuantity}`);
        }
      }
    });
    
    // Add dumpster items to the result
    adjustedItems.push(...dumpsterItems);
    
    roofAdjustmentLogger.endRuleExecution(ruleLog);
    return adjustedItems;
  }

  private applyRoundingAdjustments(items: LineItem[]): LineItem[] {
    const ruleLog = roofAdjustmentLogger.startRuleExecution('Rounding Adjustments', 'Category A');
    
    const result = items.map(item => {
      let newQuantity = item.quantity;
      let ruleApplied = '';
      let increment = 0;
      
      // Laminated shingles - round up to nearest 0.25
      if (item.description === this.EXACT_DESCRIPTIONS.REMOVE_LAMINATED_WITHOUT_FELT ||
          item.description === this.EXACT_DESCRIPTIONS.LAMINATED_WITHOUT_FELT ||
          item.description === this.EXACT_DESCRIPTIONS.REMOVE_LAMINATED_WITH_FELT ||
          item.description === this.EXACT_DESCRIPTIONS.LAMINATED_WITH_FELT ||
          item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_LAMINATED_WITHOUT_FELT ||
          item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_LAMINATED_WITH_FELT ||
          item.description === this.EXACT_DESCRIPTIONS.INSTALL_LAMINATED_WITHOUT_FELT ||
          item.description === this.EXACT_DESCRIPTIONS.INSTALL_LAMINATED_WITH_FELT ||
          item.description === this.EXACT_DESCRIPTIONS.INSTALL_LAMINATED_PER_SHINGLE ||
          item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_LAMINATED_PER_SHINGLE ||
          item.description === this.EXACT_DESCRIPTIONS.TEAR_OFF_LAMINATED ||
          item.description === this.EXACT_DESCRIPTIONS.TEAR_OFF_LAMINATED_NO_HAUL) {
        newQuantity = this.roundToNearest(item.quantity, 0.25);
        ruleApplied = 'Category A: Laminated Rounding (0.25)';
        increment = 0.25;
      }
      
      // 3-tab shingles - round up to nearest 0.33
      else if (item.description === this.EXACT_DESCRIPTIONS.REMOVE_3TAB_25YR_WITHOUT_FELT ||
               item.description === this.EXACT_DESCRIPTIONS.TAB_25YR_WITHOUT_FELT ||
               item.description === this.EXACT_DESCRIPTIONS.REMOVE_3TAB_25YR_WITH_FELT ||
               item.description === this.EXACT_DESCRIPTIONS.TAB_25YR_WITH_FELT ||
               item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_3TAB_WITHOUT_FELT ||
               item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_3TAB_WITH_FELT ||
               item.description === this.EXACT_DESCRIPTIONS.INSTALL_3TAB_WITHOUT_FELT ||
               item.description === this.EXACT_DESCRIPTIONS.INSTALL_3TAB_WITH_FELT ||
               item.description === this.EXACT_DESCRIPTIONS.MATERIAL_ONLY_3TAB_PER_SHINGLE ||
               item.description === this.EXACT_DESCRIPTIONS.INSTALL_3TAB_PER_SHINGLE ||
               item.description === this.EXACT_DESCRIPTIONS.REMOVE_3TAB_PER_SHINGLE ||
               item.description === this.EXACT_DESCRIPTIONS.REMOVE_LAMINATED_PER_SHINGLE ||
               item.description === this.EXACT_DESCRIPTIONS.TEAR_OFF_3TAB ||
               item.description === this.EXACT_DESCRIPTIONS.TEAR_OFF_3TAB_NO_HAUL) {
        newQuantity = this.roundToNearest(item.quantity, 0.33);
        ruleApplied = 'Category A: 3-Tab Rounding (0.33)';
        increment = 0.33;
      }
      
      // CRITICAL: Rounding always increases, but double-check
      if (newQuantity > item.quantity) {
        roofAdjustmentLogger.logItemProcessing(ruleLog, item.description, 
          `Rounding ${item.quantity} up to nearest ${increment} = ${newQuantity}`);
        roofAdjustmentLogger.logAdjustment(ruleLog, item.description, 'quantity', 
          item.quantity, newQuantity, `Quantity rounded up to nearest ${increment}`);
        
        this.adjustmentCounts.rounding_adjustments++;
        return this.adjustQuantity(
          item,
          newQuantity,
          `Quantity rounded up to nearest ${increment}`,
          ruleApplied
        );
      } else if (increment > 0 && newQuantity === item.quantity) {
        roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
          `Quantity ${item.quantity} is already at a ${increment} increment`);
      }
      
      return item;
    });
    
    roofAdjustmentLogger.endRuleExecution(ruleLog);
    return result;
  }

  private applyStarterCourseAdjustments(items: LineItem[], roofMeasurements: RoofMeasurements): LineItem[] {
    const ruleLog = roofAdjustmentLogger.startRuleExecution('Starter Course Adjustments', 'Category A');
    
    const eavesLength = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_EAVES_LENGTH);
    const rakesLength = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_RAKES_LENGTH);
    // Starter courses are quoted in LF, so do NOT divide by 100
    const requiredQuantity = eavesLength + rakesLength;
    
    roofAdjustmentLogger.logRuleDecision(ruleLog, 'Calculated required quantity', 
      `Eaves ${eavesLength} + Rakes ${rakesLength} = ${requiredQuantity} LF`);
    
    const starterDescriptions = [
      this.EXACT_DESCRIPTIONS.STARTER_UNIVERSAL,
      this.EXACT_DESCRIPTIONS.STARTER_PEEL_STICK,
      this.EXACT_DESCRIPTIONS.STARTER_LAMINATED,
    ];
    
    // Check if any starter course exists
    const hasStarterCourse = starterDescriptions.some(desc => this.hasLineItem(items, desc));
    
    if (!hasStarterCourse) {
      roofAdjustmentLogger.logRuleDecision(ruleLog, 'No starter course found', 
        'Adding universal starter course');
      
      // Add universal starter course
      const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.STARTER_UNIVERSAL);
          if (masterItem) {
        const newLineNumber = `${items.length + 1}`;
          const newItem = this.addLineItem(
          this.EXACT_DESCRIPTIONS.STARTER_UNIVERSAL,
          requiredQuantity,
          masterItem.unit,
          masterItem.unit_price,
            newLineNumber,
          `Missing starter course - added based on eaves + rakes length`,
          'Category A: Starter Course Addition'
        );
        items.push(newItem);
        this.adjustmentCounts.starter_course_adjustments++;
        roofAdjustmentLogger.logAddition(ruleLog, this.EXACT_DESCRIPTIONS.STARTER_UNIVERSAL, 
          requiredQuantity, 'Added missing starter course');
      }
    } else {
      // Adjust existing starter course quantities using max()
      items = items.map(item => {
        if (starterDescriptions.includes(item.description)) {
          roofAdjustmentLogger.logItemProcessing(ruleLog, item.description, 
            `Checking if quantity (${item.quantity}) needs adjustment to ${requiredQuantity}`);
          
          // CRITICAL: Only increase quantity using max()
          const newQuantity = Math.max(item.quantity, requiredQuantity);
          
          if (newQuantity > item.quantity) {
            roofAdjustmentLogger.logAdjustment(ruleLog, item.description, 'quantity', 
              item.quantity, newQuantity, `Quantity increased to max(current, required)`);
            this.adjustmentCounts.starter_course_adjustments++;
            return this.adjustQuantity(
              item,
              newQuantity,
              `Starter course quantity adjusted to max(${item.quantity}, ${requiredQuantity}) = ${newQuantity}`,
              'Category A: Starter Course Quantity Adjustment'
            );
          } else {
            roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
              `Current quantity (${item.quantity}) is already >= required (${requiredQuantity})`);
          }
        }
        return item;
      });
    }
    
    roofAdjustmentLogger.endRuleExecution(ruleLog);
    return items;
  }

  private applySteepRoofAdjustments(items: LineItem[], roofMeasurements: RoofMeasurements): LineItem[] {
    console.log('🔧 Applying Category A: Steep Roof Adjustments');
    
    const area7_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_7_12);
    const area8_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_8_12);
    const area9_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_9_12);
    const area10_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_10_12);
    const area11_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_11_12);
    const area12_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_12_12);
    const area12_plus = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_12_PLUS);
    
    let adjustedItems = [...items];
    
    // 7/12 to 9/12 slope adjustments
    if (area7_12 > 0 || area8_12 > 0 || area9_12 > 0) {
      const steepArea = area7_12 + area8_12 + area9_12;
      const requiredQuantity = steepArea / 100;
      
      // Check for removal steep roof charge
      const removeSteepItem = this.findLineItem(adjustedItems, this.EXACT_DESCRIPTIONS.REMOVE_STEEP_7_9);
      if (removeSteepItem) {
        if (removeSteepItem.quantity < requiredQuantity) {
          const index = adjustedItems.findIndex(item => item === removeSteepItem);
          adjustedItems[index] = this.adjustQuantity(
            removeSteepItem,
            requiredQuantity,
            `Remove steep roof charge adjusted to pitch area / 100: ${requiredQuantity}`,
            'Category A: Steep Roof Removal Adjustment (7/12-9/12)'
          );
        }
      } else {
        // Add removal steep roof charge
        const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.REMOVE_STEEP_7_9);
        if (masterItem) {
          const newItem = this.addLineItem(
            this.EXACT_DESCRIPTIONS.REMOVE_STEEP_7_9,
            requiredQuantity,
            masterItem.unit,
            masterItem.unit_price,
            `${adjustedItems.length + 1}`,
            `Steep roof removal charge added for 7/12-9/12 pitch`,
            'Category A: Steep Roof Removal Addition (7/12-9/12)'
          );
          adjustedItems.push(newItem);
        }
      }
      
      // Check for installation steep roof charge
      const steepItem = this.findLineItem(adjustedItems, this.EXACT_DESCRIPTIONS.STEEP_7_9);
      if (steepItem) {
        if (steepItem.quantity < requiredQuantity) {
          const index = adjustedItems.findIndex(item => item === steepItem);
          adjustedItems[index] = this.adjustQuantity(
            steepItem,
            requiredQuantity,
            `Steep roof charge adjusted to pitch area / 100: ${requiredQuantity}`,
            'Category A: Steep Roof Installation Adjustment (7/12-9/12)'
          );
        }
      } else {
        // Add installation steep roof charge
        const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.STEEP_7_9);
        if (masterItem) {
          const newItem = this.addLineItem(
            this.EXACT_DESCRIPTIONS.STEEP_7_9,
            requiredQuantity,
            masterItem.unit,
            masterItem.unit_price,
            `${adjustedItems.length + 1}`,
            `Steep roof charge added for 7/12-9/12 pitch`,
            'Category A: Steep Roof Installation Addition (7/12-9/12)'
          );
          adjustedItems.push(newItem);
        }
      }
      
      this.adjustmentCounts.steep_roof_adjustments++;
    }
    
    // 10/12 to 12/12 slope adjustments
    if (area10_12 > 0 || area11_12 > 0 || area12_12 > 0) {
      const steepArea = area10_12 + area11_12 + area12_12;
      const requiredQuantity = steepArea / 100;
      
      // Similar logic for 10/12-12/12 slopes
      const removeSteepItem = this.findLineItem(adjustedItems, this.EXACT_DESCRIPTIONS.REMOVE_STEEP_10_12);
      if (removeSteepItem) {
        if (removeSteepItem.quantity < requiredQuantity) {
          const index = adjustedItems.findIndex(item => item === removeSteepItem);
          adjustedItems[index] = this.adjustQuantity(
            removeSteepItem,
            requiredQuantity,
            `Remove steep roof charge adjusted to pitch area / 100: ${requiredQuantity}`,
            'Category A: Steep Roof Removal Adjustment (10/12-12/12)'
          );
        }
      } else {
        const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.REMOVE_STEEP_10_12);
        if (masterItem) {
          const newItem = this.addLineItem(
            this.EXACT_DESCRIPTIONS.REMOVE_STEEP_10_12,
            requiredQuantity,
            masterItem.unit,
            masterItem.unit_price,
            `${adjustedItems.length + 1}`,
            `Steep roof removal charge added for 10/12-12/12 pitch`,
            'Category A: Steep Roof Removal Addition (10/12-12/12)'
          );
          adjustedItems.push(newItem);
        }
      }
      
      const steepItem = this.findLineItem(adjustedItems, this.EXACT_DESCRIPTIONS.STEEP_10_12);
      if (steepItem) {
        if (steepItem.quantity < requiredQuantity) {
          const index = adjustedItems.findIndex(item => item === steepItem);
          adjustedItems[index] = this.adjustQuantity(
            steepItem,
            requiredQuantity,
            `Steep roof charge adjusted to pitch area / 100: ${requiredQuantity}`,
            'Category A: Steep Roof Installation Adjustment (10/12-12/12)'
          );
        }
      } else {
        const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.STEEP_10_12);
        if (masterItem) {
          const newItem = this.addLineItem(
            this.EXACT_DESCRIPTIONS.STEEP_10_12,
            requiredQuantity,
            masterItem.unit,
            masterItem.unit_price,
            `${adjustedItems.length + 1}`,
            `Steep roof charge added for 10/12-12/12 pitch`,
            'Category A: Steep Roof Installation Addition (10/12-12/12)'
          );
          adjustedItems.push(newItem);
        }
      }
      
      this.adjustmentCounts.steep_roof_adjustments++;
    }
    
    // 12/12+ slope adjustments
    if (area12_plus > 0) {
      const requiredQuantity = area12_plus / 100;
      
      const removeSteepItem = this.findLineItem(adjustedItems, this.EXACT_DESCRIPTIONS.REMOVE_STEEP_12_PLUS);
      if (removeSteepItem) {
        if (removeSteepItem.quantity < requiredQuantity) {
          const index = adjustedItems.findIndex(item => item === removeSteepItem);
          adjustedItems[index] = this.adjustQuantity(
            removeSteepItem,
            requiredQuantity,
            `Remove steep roof charge adjusted to pitch area / 100: ${requiredQuantity}`,
            'Category A: Steep Roof Removal Adjustment (12/12+)'
          );
        }
      } else {
        const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.REMOVE_STEEP_12_PLUS);
      if (masterItem) {
          const newItem = this.addLineItem(
            this.EXACT_DESCRIPTIONS.REMOVE_STEEP_12_PLUS,
            requiredQuantity,
            masterItem.unit,
            masterItem.unit_price,
            `${adjustedItems.length + 1}`,
            `Steep roof removal charge added for 12/12+ pitch`,
            'Category A: Steep Roof Removal Addition (12/12+)'
          );
          adjustedItems.push(newItem);
        }
      }
      
      const steepItem = this.findLineItem(adjustedItems, this.EXACT_DESCRIPTIONS.STEEP_12_PLUS);
      if (steepItem) {
        if (steepItem.quantity < requiredQuantity) {
          const index = adjustedItems.findIndex(item => item === steepItem);
          adjustedItems[index] = this.adjustQuantity(
            steepItem,
            requiredQuantity,
            `Steep roof charge adjusted to pitch area / 100: ${requiredQuantity}`,
            'Category A: Steep Roof Installation Adjustment (12/12+)'
          );
        }
      } else {
        const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.STEEP_12_PLUS);
        if (masterItem) {
          const newItem = this.addLineItem(
            this.EXACT_DESCRIPTIONS.STEEP_12_PLUS,
            requiredQuantity,
            masterItem.unit,
            masterItem.unit_price,
            `${adjustedItems.length + 1}`,
            `Steep roof charge added for 12/12+ pitch`,
            'Category A: Steep Roof Installation Addition (12/12+)'
          );
          adjustedItems.push(newItem);
        }
      }
      
      this.adjustmentCounts.steep_roof_adjustments++;
    }

    return adjustedItems;
  }

  private applyRidgeVentAdjustments(items: LineItem[], roofMeasurements: RoofMeasurements): LineItem[] {
    console.log('🔧 Applying Category A: Ridge Vent Adjustments');
    
    const ridgesHipsLength = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_RIDGES_HIPS_LENGTH);
    const ridgesLength = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_LINE_LENGTHS_RIDGES);
    // Ridge vents and caps are quoted in LF, so do NOT divide by 100
    const requiredQuantityRidgesHips = ridgesHipsLength;
    const requiredQuantityRidges = ridgesLength;
    
    let adjustedItems = [...items];
    
    // Adjust existing hip/ridge cap quantities
    adjustedItems = adjustedItems.map(item => {
      if ((item.description === this.EXACT_DESCRIPTIONS.HIP_RIDGE_HIGH ||
           item.description === this.EXACT_DESCRIPTIONS.HIP_RIDGE_STANDARD) &&
          item.quantity < requiredQuantityRidgesHips) {
        this.adjustmentCounts.ridge_vent_adjustments++;
        return this.adjustQuantity(
          item,
          requiredQuantityRidgesHips,
          `Hip/ridge cap quantity adjusted to Total Ridges/Hips Length / 100: ${requiredQuantityRidgesHips}`,
          'Category A: Ridge Vent Quantity Adjustment'
        );
      }
      return item;
    });
    
    // Adjust continuous ridge vents
    adjustedItems = adjustedItems.map(item => {
      if (item.description === this.EXACT_DESCRIPTIONS.RIDGE_VENT_ALUMINUM) {
        if (item.quantity < requiredQuantityRidges) {
          this.adjustmentCounts.ridge_vent_adjustments++;
          return this.adjustQuantity(
            item,
            requiredQuantityRidges,
            `Continuous ridge vent aluminum quantity adjusted to Total Line Lengths (Ridges) / 100: ${requiredQuantityRidges}`,
            'Category A: Ridge Vent Aluminum Adjustment'
          );
        }
      } else if (item.description === this.EXACT_DESCRIPTIONS.RIDGE_VENT_SHINGLE) {
        if (item.quantity < requiredQuantityRidges) {
          this.adjustmentCounts.ridge_vent_adjustments++;
          return this.adjustQuantity(
            item,
            requiredQuantityRidges,
            `Continuous ridge vent shingle quantity adjusted to Total Line Lengths (Ridges) / 100: ${requiredQuantityRidges}`,
            'Category A: Ridge Vent Shingle Adjustment'
          );
        }
      }
      return item;
    });

    return adjustedItems;
  }

  private applyDripEdgeAdjustments(items: LineItem[], roofMeasurements: RoofMeasurements): LineItem[] {
    console.log('🔧 Applying Category A: Drip Edge Adjustments');
    
    const eavesLength = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_EAVES_LENGTH);
    const rakesLength = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_RAKES_LENGTH);
    // Drip edge is quoted in LF, so do NOT divide by 100
    const requiredQuantity = eavesLength + rakesLength;
    
    const dripEdgeItem = this.findLineItem(items, this.EXACT_DESCRIPTIONS.DRIP_EDGE);
    
    if (dripEdgeItem) {
      if (dripEdgeItem.quantity < requiredQuantity) {
        const index = items.findIndex(item => item === dripEdgeItem);
        items[index] = this.adjustQuantity(
          dripEdgeItem,
          requiredQuantity,
          `Drip edge quantity adjusted to Eaves + Rakes: ${requiredQuantity} LF`,
          'Category A: Drip Edge Quantity Adjustment'
        );
        this.adjustmentCounts.drip_edge_adjustments++;
      }
    } else {
      // Add drip edge if missing
      const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.DRIP_EDGE);
      if (masterItem) {
        const newItem = this.addLineItem(
          this.EXACT_DESCRIPTIONS.DRIP_EDGE,
          requiredQuantity,
          masterItem.unit,
          masterItem.unit_price,
          `${items.length + 1}`,
          `Missing drip edge - added based on eaves + rakes length`,
          'Category A: Drip Edge Addition'
        );
        items.push(newItem);
        this.adjustmentCounts.drip_edge_adjustments++;
      }
    }
    
    return items;
  }

  private applyStepFlashingAdjustments(items: LineItem[], roofMeasurements: RoofMeasurements): LineItem[] {
    const ruleLog = roofAdjustmentLogger.startRuleExecution('Step Flashing Adjustments', 'Category A');
    
    const stepFlashingLength = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_STEP_FLASHING_LENGTH);
    
    roofAdjustmentLogger.logRuleDecision(ruleLog, 'Step flashing length found', 
      `Total Step Flashing Length: ${stepFlashingLength} LF`);
    
    // Only proceed if step flashing length > 0
    if (stepFlashingLength > 0) {
      const stepFlashingItem = this.findLineItem(items, this.EXACT_DESCRIPTIONS.STEP_FLASHING);
      
      if (stepFlashingItem) {
        roofAdjustmentLogger.logItemProcessing(ruleLog, this.EXACT_DESCRIPTIONS.STEP_FLASHING, 
          `Found existing step flashing with quantity ${stepFlashingItem.quantity}, checking against required ${stepFlashingLength}`);
        
        // CRITICAL: Only increase quantity using max()
        const newQuantity = Math.max(stepFlashingItem.quantity, stepFlashingLength);
        
        if (newQuantity > stepFlashingItem.quantity) {
          roofAdjustmentLogger.logAdjustment(ruleLog, this.EXACT_DESCRIPTIONS.STEP_FLASHING, 'quantity', 
            stepFlashingItem.quantity, newQuantity, `Quantity increased to max(current, Total Step Flashing Length)`);
          
          const index = items.findIndex(item => item === stepFlashingItem);
          items[index] = this.adjustQuantity(
            stepFlashingItem,
            newQuantity,
            `Step flashing quantity adjusted to max(${stepFlashingItem.quantity}, ${stepFlashingLength}) = ${newQuantity}`,
            'Category A: Step Flashing Quantity Adjustment'
          );
          this.adjustmentCounts.step_flashing_adjustments++;
      } else {
          roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
            `Current quantity (${stepFlashingItem.quantity}) is already >= required (${stepFlashingLength})`);
        }
      } else {
        // Add step flashing if missing
        roofAdjustmentLogger.logRuleDecision(ruleLog, 'Step flashing not found', 
          'Adding step flashing with quantity = Total Step Flashing Length');
        
        const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.STEP_FLASHING);
        if (masterItem) {
          const newItem = this.addLineItem(
            this.EXACT_DESCRIPTIONS.STEP_FLASHING,
            stepFlashingLength,
            masterItem.unit,
            masterItem.unit_price,
            `${items.length + 1}`,
            `Missing step flashing - added based on Total Step Flashing Length`,
            'Category A: Step Flashing Addition'
          );
          items.push(newItem);
          this.adjustmentCounts.step_flashing_adjustments++;
          roofAdjustmentLogger.logAddition(ruleLog, this.EXACT_DESCRIPTIONS.STEP_FLASHING, 
            stepFlashingLength, 'Added missing step flashing');
        } else {
          roofAdjustmentLogger.logWarning(ruleLog, `Step flashing not found in roof master macro: ${this.EXACT_DESCRIPTIONS.STEP_FLASHING}`);
        }
      }
    } else {
      roofAdjustmentLogger.logRuleDecision(ruleLog, 'No step flashing needed', 
        'Total Step Flashing Length is 0, skipping step flashing adjustments');
    }
    
    roofAdjustmentLogger.endRuleExecution(ruleLog);
    return items;
  }

  private applyValleyMetalAdjustments(items: LineItem[], roofMeasurements: RoofMeasurements): LineItem[] {
    const ruleLog = roofAdjustmentLogger.startRuleExecution('Valley Metal Adjustments', 'Category A');
    
    const valleysLength = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_LINE_LENGTHS_VALLEYS);
    
    roofAdjustmentLogger.logRuleDecision(ruleLog, 'Valley metal length found', 
      `Total Line Lengths (Valleys): ${valleysLength} LF`);
    
    // Only proceed if valleys length > 0
    if (valleysLength > 0) {
      const valleyMetalItem = this.findLineItem(items, this.EXACT_DESCRIPTIONS.VALLEY_METAL);
      const valleyMetalWItem = this.findLineItem(items, this.EXACT_DESCRIPTIONS.VALLEY_METAL_W);
      
      // Check for "Valley metal"
      if (valleyMetalItem) {
        roofAdjustmentLogger.logItemProcessing(ruleLog, this.EXACT_DESCRIPTIONS.VALLEY_METAL, 
          `Found existing valley metal with quantity ${valleyMetalItem.quantity}, checking against required ${valleysLength}`);
        
        // CRITICAL: Only increase quantity using max()
        const newQuantity = Math.max(valleyMetalItem.quantity, valleysLength);
        
        if (newQuantity > valleyMetalItem.quantity) {
          roofAdjustmentLogger.logAdjustment(ruleLog, this.EXACT_DESCRIPTIONS.VALLEY_METAL, 'quantity', 
            valleyMetalItem.quantity, newQuantity, `Quantity increased to max(current, Total Line Lengths (Valleys))`);
          
          const index = items.findIndex(item => item === valleyMetalItem);
          items[index] = this.adjustQuantity(
            valleyMetalItem,
            newQuantity,
            `Valley metal quantity adjusted to max(${valleyMetalItem.quantity}, ${valleysLength}) = ${newQuantity}`,
            'Category A: Valley Metal Quantity Adjustment'
          );
          this.adjustmentCounts.valley_metal_adjustments++;
        } else {
          roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
            `Current quantity (${valleyMetalItem.quantity}) is already >= required (${valleysLength})`);
        }
      }
      
      // Check for "Valley metal - (W) profile"
      if (valleyMetalWItem) {
        roofAdjustmentLogger.logItemProcessing(ruleLog, this.EXACT_DESCRIPTIONS.VALLEY_METAL_W, 
          `Found existing valley metal W profile with quantity ${valleyMetalWItem.quantity}, checking against required ${valleysLength}`);
        
        // CRITICAL: Only increase quantity using max()
        const newQuantity = Math.max(valleyMetalWItem.quantity, valleysLength);
        
        if (newQuantity > valleyMetalWItem.quantity) {
          roofAdjustmentLogger.logAdjustment(ruleLog, this.EXACT_DESCRIPTIONS.VALLEY_METAL_W, 'quantity', 
            valleyMetalWItem.quantity, newQuantity, `Quantity increased to max(current, Total Line Lengths (Valleys))`);
          
          const index = items.findIndex(item => item === valleyMetalWItem);
          items[index] = this.adjustQuantity(
            valleyMetalWItem,
            newQuantity,
            `Valley metal W profile quantity adjusted to max(${valleyMetalWItem.quantity}, ${valleysLength}) = ${newQuantity}`,
            'Category A: Valley Metal W Profile Quantity Adjustment'
          );
          this.adjustmentCounts.valley_metal_adjustments++;
        } else {
          roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
            `Current quantity (${valleyMetalWItem.quantity}) is already >= required (${valleysLength})`);
        }
      }
      
      if (!valleyMetalItem && !valleyMetalWItem) {
        roofAdjustmentLogger.logRuleDecision(ruleLog, 'No valley metal items found', 
          'No valley metal items to adjust');
      }
    } else {
      roofAdjustmentLogger.logRuleDecision(ruleLog, 'No valley metal needed', 
        'Total Line Lengths (Valleys) is 0, skipping valley metal adjustments');
    }
    
    roofAdjustmentLogger.endRuleExecution(ruleLog);
    return items;
  }

  private applyAluminumFlashingAdjustments(items: LineItem[], roofMeasurements: RoofMeasurements): LineItem[] {
    const ruleLog = roofAdjustmentLogger.startRuleExecution('Aluminum/Endwall Flashing Adjustments', 'Category A');
    
    const flashingLength = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_FLASHING_LENGTH);
    
    roofAdjustmentLogger.logRuleDecision(ruleLog, 'Endwall flashing length found', 
      `Total Flashing Length: ${flashingLength} LF`);
    
    // Only proceed if flashing length > 0
    if (flashingLength > 0) {
      const flashingItem = this.findLineItem(items, this.EXACT_DESCRIPTIONS.ALUMINUM_FLASHING);
      
      if (flashingItem) {
        roofAdjustmentLogger.logItemProcessing(ruleLog, this.EXACT_DESCRIPTIONS.ALUMINUM_FLASHING, 
          `Found existing endwall flashing with quantity ${flashingItem.quantity}, checking against required ${flashingLength}`);
        
        // CRITICAL: Only increase quantity using max()
        const newQuantity = Math.max(flashingItem.quantity, flashingLength);
        
        if (newQuantity > flashingItem.quantity) {
          roofAdjustmentLogger.logAdjustment(ruleLog, this.EXACT_DESCRIPTIONS.ALUMINUM_FLASHING, 'quantity', 
            flashingItem.quantity, newQuantity, `Quantity increased to max(current, Total Flashing Length)`);
          
          const index = items.findIndex(item => item === flashingItem);
          items[index] = this.adjustQuantity(
            flashingItem,
            newQuantity,
            `Endwall flashing quantity adjusted to max(${flashingItem.quantity}, ${flashingLength}) = ${newQuantity}`,
            'Category A: Endwall Flashing Quantity Adjustment'
          );
        } else {
          roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
            `Current quantity (${flashingItem.quantity}) is already >= required (${flashingLength})`);
        }
      } else {
        // Add endwall flashing if missing
        roofAdjustmentLogger.logRuleDecision(ruleLog, 'Endwall flashing not found', 
          'Adding endwall flashing with quantity = Total Flashing Length');
        
        const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.ALUMINUM_FLASHING);
        if (masterItem) {
          const newItem = this.addLineItem(
            this.EXACT_DESCRIPTIONS.ALUMINUM_FLASHING,
            flashingLength,
            masterItem.unit,
            masterItem.unit_price,
            `${items.length + 1}`,
            `Missing endwall flashing - added based on Total Flashing Length`,
            'Category A: Endwall Flashing Addition'
          );
          items.push(newItem);
          roofAdjustmentLogger.logAddition(ruleLog, this.EXACT_DESCRIPTIONS.ALUMINUM_FLASHING, 
            flashingLength, 'Added missing endwall flashing');
        } else {
          roofAdjustmentLogger.logWarning(ruleLog, `Endwall flashing not found in roof master macro: ${this.EXACT_DESCRIPTIONS.ALUMINUM_FLASHING}`);
        }
      }
    } else {
      roofAdjustmentLogger.logRuleDecision(ruleLog, 'No endwall flashing needed', 
        'Total Flashing Length is 0, skipping endwall flashing adjustments');
    }
    
    roofAdjustmentLogger.endRuleExecution(ruleLog);
    return items;
  }

  private applyFeltAdjustments(items: LineItem[], roofMeasurements: RoofMeasurements): LineItem[] {
    const ruleLog = roofAdjustmentLogger.startRuleExecution('Felt Adjustments', 'Category A');
    
    // Get all pitch areas
    const area1_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_1_12);
    const area2_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_2_12);
    const area3_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_3_12);
    const area4_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_4_12);
    const area5_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_5_12);
    const area6_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_6_12);
    const area7_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_7_12);
    const area8_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_8_12);
    const area9_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_9_12);
    const area10_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_10_12);
    const area11_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_11_12);
    const area12_12 = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_12_12);
    const area12_plus = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.AREA_PITCH_12_PLUS);
    
    let adjustedItems = [...items];
    
    // Rule 1: Low slope felt (1/12 to 4/12)
    const lowSlopeArea = area1_12 + area2_12 + area3_12 + area4_12;
    if (lowSlopeArea > 0) {
      const requiredQuantity = lowSlopeArea / 100;
      
      roofAdjustmentLogger.logRuleDecision(ruleLog, 'Low slope felt calculation', 
        `Pitches 1/12-4/12 total: ${lowSlopeArea} sq ft, required quantity: ${requiredQuantity}`);
      
      const feltItem = this.findLineItem(adjustedItems, this.EXACT_DESCRIPTIONS.FELT_15LB_DOUBLE_COVERAGE);
      
      if (feltItem) {
        // CRITICAL: Only increase quantity using max()
        const newQuantity = Math.max(feltItem.quantity, requiredQuantity);
        
        if (newQuantity > feltItem.quantity) {
          roofAdjustmentLogger.logAdjustment(ruleLog, this.EXACT_DESCRIPTIONS.FELT_15LB_DOUBLE_COVERAGE, 'quantity', 
            feltItem.quantity, newQuantity, `Quantity increased to max(current, low slope area / 100)`);
          
          const index = adjustedItems.findIndex(item => item === feltItem);
          adjustedItems[index] = this.adjustQuantity(
            feltItem,
            newQuantity,
            `Low slope felt quantity adjusted to max(${feltItem.quantity}, ${requiredQuantity}) = ${newQuantity}`,
            'Category A: Low Slope Felt Adjustment (1/12-4/12)'
          );
        } else {
          roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
            `Current quantity (${feltItem.quantity}) is already >= required (${requiredQuantity})`);
        }
      } else {
        // Add low slope felt if missing
        const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.FELT_15LB_DOUBLE_COVERAGE);
        if (masterItem) {
          const newItem = this.addLineItem(
            this.EXACT_DESCRIPTIONS.FELT_15LB_DOUBLE_COVERAGE,
            requiredQuantity,
            masterItem.unit,
            masterItem.unit_price,
            `${adjustedItems.length + 1}`,
            `Low slope felt added for pitches 1/12-4/12`,
            'Category A: Low Slope Felt Addition (1/12-4/12)'
          );
          adjustedItems.push(newItem);
          roofAdjustmentLogger.logAddition(ruleLog, this.EXACT_DESCRIPTIONS.FELT_15LB_DOUBLE_COVERAGE, 
            requiredQuantity, 'Added missing low slope felt');
        }
      }
    }
    
    // Rule 2: Standard felt (5/12 to 8/12)
    const standardArea = area5_12 + area6_12 + area7_12 + area8_12;
    if (standardArea > 0) {
      const requiredQuantity = standardArea / 100;
      
      roofAdjustmentLogger.logRuleDecision(ruleLog, 'Standard felt calculation', 
        `Pitches 5/12-8/12 total: ${standardArea} sq ft, required quantity: ${requiredQuantity}`);
      
      const feltItem = this.findLineItem(adjustedItems, this.EXACT_DESCRIPTIONS.FELT_15LB);
      
      if (feltItem) {
        // CRITICAL: Only increase quantity using max()
        const newQuantity = Math.max(feltItem.quantity, requiredQuantity);
        
        if (newQuantity > feltItem.quantity) {
          roofAdjustmentLogger.logAdjustment(ruleLog, this.EXACT_DESCRIPTIONS.FELT_15LB, 'quantity', 
            feltItem.quantity, newQuantity, `Quantity increased to max(current, standard area / 100)`);
          
          const index = adjustedItems.findIndex(item => item === feltItem);
          adjustedItems[index] = this.adjustQuantity(
            feltItem,
            newQuantity,
            `Standard felt quantity adjusted to max(${feltItem.quantity}, ${requiredQuantity}) = ${newQuantity}`,
            'Category A: Standard Felt Adjustment (5/12-8/12)'
          );
        } else {
          roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
            `Current quantity (${feltItem.quantity}) is already >= required (${requiredQuantity})`);
        }
      } else {
        // Add standard felt if missing
        const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.FELT_15LB);
        if (masterItem) {
          const newItem = this.addLineItem(
            this.EXACT_DESCRIPTIONS.FELT_15LB,
            requiredQuantity,
            masterItem.unit,
            masterItem.unit_price,
            `${adjustedItems.length + 1}`,
            `Standard felt added for pitches 5/12-8/12`,
            'Category A: Standard Felt Addition (5/12-8/12)'
          );
          adjustedItems.push(newItem);
          roofAdjustmentLogger.logAddition(ruleLog, this.EXACT_DESCRIPTIONS.FELT_15LB, 
            requiredQuantity, 'Added missing standard felt');
        }
      }
    }
    
    // Rule 3: Heavy felt (9/12 to 12/12+)
    const heavyArea = area9_12 + area10_12 + area11_12 + area12_12 + area12_plus;
    if (heavyArea > 0) {
      const requiredQuantity = heavyArea / 100;
      
      roofAdjustmentLogger.logRuleDecision(ruleLog, 'Heavy felt calculation', 
        `Pitches 9/12-12/12+ total: ${heavyArea} sq ft, required quantity: ${requiredQuantity}`);
      
      const feltItem = this.findLineItem(adjustedItems, this.EXACT_DESCRIPTIONS.FELT_30LB);
      
      if (feltItem) {
        // CRITICAL: Only increase quantity using max()
        const newQuantity = Math.max(feltItem.quantity, requiredQuantity);
        
        if (newQuantity > feltItem.quantity) {
          roofAdjustmentLogger.logAdjustment(ruleLog, this.EXACT_DESCRIPTIONS.FELT_30LB, 'quantity', 
            feltItem.quantity, newQuantity, `Quantity increased to max(current, heavy area / 100)`);
          
          const index = adjustedItems.findIndex(item => item === feltItem);
          adjustedItems[index] = this.adjustQuantity(
            feltItem,
            newQuantity,
            `Heavy felt quantity adjusted to max(${feltItem.quantity}, ${requiredQuantity}) = ${newQuantity}`,
            'Category A: Heavy Felt Adjustment (9/12-12/12+)'
          );
        } else {
          roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
            `Current quantity (${feltItem.quantity}) is already >= required (${requiredQuantity})`);
        }
      } else {
        // Add heavy felt if missing
        const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.FELT_30LB);
        if (masterItem) {
          const newItem = this.addLineItem(
            this.EXACT_DESCRIPTIONS.FELT_30LB,
            requiredQuantity,
            masterItem.unit,
            masterItem.unit_price,
            `${adjustedItems.length + 1}`,
            `Heavy felt added for pitches 9/12-12/12+`,
            'Category A: Heavy Felt Addition (9/12-12/12+)'
          );
          adjustedItems.push(newItem);
          roofAdjustmentLogger.logAddition(ruleLog, this.EXACT_DESCRIPTIONS.FELT_30LB, 
            requiredQuantity, 'Added missing heavy felt');
        }
      }
    }
    
    roofAdjustmentLogger.endRuleExecution(ruleLog);
    return adjustedItems;
  }

  public processAdjustments(
    lineItems: LineItem[],
    roofMeasurements: RoofMeasurements
  ): AdjustmentResults {
    console.log('🏗️ Starting Comprehensive Roof Adjustment Engine...');
    console.log(`📊 Processing ${lineItems.length} line items`);
    console.log(`📐 Available roof measurements: ${Object.keys(roofMeasurements).length}`);

    // Reset audit log and counts
    this.auditLog = [];
    this.adjustmentCounts = {
      quantity_adjustments: 0,
      price_adjustments: 0,
      new_additions: 0,
      rounding_adjustments: 0,
      steep_roof_adjustments: 0,
      drip_edge_adjustments: 0,
      starter_course_adjustments: 0,
      ridge_vent_adjustments: 0,
      valley_metal_adjustments: 0,
      step_flashing_adjustments: 0,
    };

    let adjustedItems = [...lineItems];

    // Apply all rule categories in order with detailed logging
    console.log('\n🔧 APPLYING COMPREHENSIVE RULE SET...');
    
    // Category 1: Unit Cost Adjustments
    adjustedItems = this.applyUnitCostAdjustments(adjustedItems);
    
    // Category A: Fully Automatable Calculations
    adjustedItems = this.applyShingleQuantityAdjustments(adjustedItems, roofMeasurements);
    adjustedItems = this.applyRoundingAdjustments(adjustedItems);
    adjustedItems = this.applyStarterCourseAdjustments(adjustedItems, roofMeasurements);
    adjustedItems = this.applySteepRoofAdjustments(adjustedItems, roofMeasurements);
    adjustedItems = this.applyRidgeVentAdjustments(adjustedItems, roofMeasurements);
    adjustedItems = this.applyDripEdgeAdjustments(adjustedItems, roofMeasurements);
    adjustedItems = this.applyStepFlashingAdjustments(adjustedItems, roofMeasurements);
    adjustedItems = this.applyValleyMetalAdjustments(adjustedItems, roofMeasurements);
    adjustedItems = this.applyAluminumFlashingAdjustments(adjustedItems, roofMeasurements);
    adjustedItems = this.applyFeltAdjustments(adjustedItems, roofMeasurements);

    const totalAdjustments = Object.values(this.adjustmentCounts).reduce((sum, count) => sum + count, 0);

    console.log('\n✅ Comprehensive Roof Adjustment Engine completed');
    console.log(`📊 Total adjustments: ${totalAdjustments}`);
    console.log(`📊 New additions: ${this.adjustmentCounts.new_additions}`);
    console.log(`📊 Audit log entries: ${this.auditLog.length}`);

    // Print detailed execution summary
    roofAdjustmentLogger.printExecutionSummary();

    return {
      original_line_items: lineItems,
      adjusted_line_items: adjustedItems,
      audit_log: this.auditLog,
      adjustment_results: {
        total_adjustments: totalAdjustments,
        total_additions: this.adjustmentCounts.new_additions,
        adjustments_by_type: this.adjustmentCounts,
      },
    };
  }
}