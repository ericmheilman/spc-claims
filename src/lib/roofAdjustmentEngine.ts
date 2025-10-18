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
    
    // Installation items
    LAMINATED_WITHOUT_FELT: "Laminated comp. shingle rfg. w/out felt",
    TAB_25YR_WITHOUT_FELT: "3 tab 25 yr. comp. shingle roofing - w/out felt",
    TAB_25YR_WITH_FELT: "3 tab 25 yr. composition shingle roofing incl. felt",
    LAMINATED_WITH_FELT: "Laminated comp. shingle rfg. - w/ felt",
    
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
  };

  // Exact variable names from RMR measurements
  private readonly RMR_VARIABLES = {
    TOTAL_ROOF_AREA: "Total Roof Area",
    TOTAL_EAVES_LENGTH: "Total Eaves Length",
    TOTAL_RAKES_LENGTH: "Total Rakes Length",
    TOTAL_RIDGES_HIPS_LENGTH: "Total Ridges/Hips Length",
    TOTAL_VALLEYS_LENGTH: "Total Valleys Length",
    TOTAL_STEP_FLASHING_LENGTH: "Total Step Flashing Length",
    TOTAL_FLASHING_LENGTH: "Total Flashing Length",
    TOTAL_LINE_LENGTHS_RIDGES: "Total Line Lengths (Ridges)",
    TOTAL_LINE_LENGTHS_HIPS: "Total Line Lengths (Hips)",
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
    const requiredQuantity = totalRoofArea / 100;
    
    roofAdjustmentLogger.logRuleDecision(ruleLog, 'Calculated required quantity', 
      `Total Roof Area (${totalRoofArea}) / 100 = ${requiredQuantity} SQ`);
    
    const shingleDescriptions = [
      this.EXACT_DESCRIPTIONS.REMOVE_LAMINATED_WITHOUT_FELT,
      this.EXACT_DESCRIPTIONS.REMOVE_3TAB_25YR_WITHOUT_FELT,
      this.EXACT_DESCRIPTIONS.REMOVE_3TAB_25YR_WITH_FELT,
      this.EXACT_DESCRIPTIONS.REMOVE_LAMINATED_WITH_FELT,
      this.EXACT_DESCRIPTIONS.LAMINATED_WITHOUT_FELT,
      this.EXACT_DESCRIPTIONS.TAB_25YR_WITHOUT_FELT,
      this.EXACT_DESCRIPTIONS.TAB_25YR_WITH_FELT,
      this.EXACT_DESCRIPTIONS.LAMINATED_WITH_FELT,
    ];

    const result = items.map(item => {
      if (shingleDescriptions.includes(item.description)) {
        roofAdjustmentLogger.logItemProcessing(ruleLog, item.description, 
          `Checking if quantity (${item.quantity}) needs adjustment to ${requiredQuantity}`);
        
        // CRITICAL: Only increase quantity using max()
        const newQuantity = Math.max(item.quantity, requiredQuantity);
        
        if (newQuantity > item.quantity) {
          roofAdjustmentLogger.logAdjustment(ruleLog, item.description, 'quantity', 
            item.quantity, newQuantity, `Quantity increased to max(current, Total Roof Area / 100)`);
          
          return this.adjustQuantity(
            item,
            newQuantity,
            `Quantity adjusted to max(${item.quantity}, ${requiredQuantity}) = ${newQuantity}`,
            'Category A: Shingle Quantity Adjustment'
          );
        } else {
          roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
            `Current quantity (${item.quantity}) is already >= required (${requiredQuantity})`);
        }
      }
      return item;
    });
    
    roofAdjustmentLogger.endRuleExecution(ruleLog);
    return result;
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
          item.description === this.EXACT_DESCRIPTIONS.LAMINATED_WITH_FELT) {
        newQuantity = this.roundToNearest(item.quantity, 0.25);
        ruleApplied = 'Category A: Laminated Rounding (0.25)';
        increment = 0.25;
      }
      
      // 3-tab shingles - round up to nearest 0.33
      else if (item.description === this.EXACT_DESCRIPTIONS.REMOVE_3TAB_25YR_WITHOUT_FELT ||
               item.description === this.EXACT_DESCRIPTIONS.TAB_25YR_WITHOUT_FELT ||
               item.description === this.EXACT_DESCRIPTIONS.REMOVE_3TAB_25YR_WITH_FELT ||
               item.description === this.EXACT_DESCRIPTIONS.TAB_25YR_WITH_FELT) {
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
    const requiredQuantity = (eavesLength + rakesLength) / 100;
    
    roofAdjustmentLogger.logRuleDecision(ruleLog, 'Calculated required quantity', 
      `(Eaves ${eavesLength} + Rakes ${rakesLength}) / 100 = ${requiredQuantity} LF`);
    
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
    const requiredQuantityRidgesHips = ridgesHipsLength / 100;
    const requiredQuantityRidges = ridgesLength / 100;
    
    let adjustedItems = [...items];
    
    // Check for hip/ridge caps
    const hasHipRidgeHigh = this.hasLineItem(adjustedItems, this.EXACT_DESCRIPTIONS.HIP_RIDGE_HIGH);
    const hasHipRidgeStandard = this.hasLineItem(adjustedItems, this.EXACT_DESCRIPTIONS.HIP_RIDGE_STANDARD);
    
    if (!hasHipRidgeHigh && !hasHipRidgeStandard) {
      // Add continuous ridge vent - detach & reset
      const masterItem = this.getRoofMasterItem(this.EXACT_DESCRIPTIONS.RIDGE_VENT_DETACH_RESET);
      if (masterItem) {
        const newItem = this.addLineItem(
          this.EXACT_DESCRIPTIONS.RIDGE_VENT_DETACH_RESET,
          requiredQuantityRidgesHips,
          masterItem.unit,
          masterItem.unit_price,
          `${adjustedItems.length + 1}`,
          `Missing hip/ridge cap - added continuous ridge vent`,
          'Category A: Ridge Vent Addition'
        );
        adjustedItems.push(newItem);
        this.adjustmentCounts.ridge_vent_adjustments++;
      }
    } else {
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
    }
    
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
    const requiredQuantity = (eavesLength + rakesLength) / 100;
    
    const dripEdgeItem = this.findLineItem(items, this.EXACT_DESCRIPTIONS.DRIP_EDGE);
    
    if (dripEdgeItem) {
      if (dripEdgeItem.quantity < requiredQuantity) {
        const index = items.findIndex(item => item === dripEdgeItem);
        items[index] = this.adjustQuantity(
          dripEdgeItem,
          requiredQuantity,
          `Drip edge quantity adjusted to (Eaves + Rakes) / 100: ${requiredQuantity}`,
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
    const requiredQuantity = stepFlashingLength / 100;
    
    roofAdjustmentLogger.logRuleDecision(ruleLog, 'Calculated required quantity', 
      `Total Step Flashing Length (${stepFlashingLength}) / 100 = ${requiredQuantity}`);
    
    const stepFlashingItem = this.findLineItem(items, this.EXACT_DESCRIPTIONS.STEP_FLASHING);
    
    if (stepFlashingItem) {
      roofAdjustmentLogger.logItemProcessing(ruleLog, this.EXACT_DESCRIPTIONS.STEP_FLASHING, 
        `Checking if quantity (${stepFlashingItem.quantity}) needs adjustment to ${requiredQuantity}`);
      
      // CRITICAL: Only increase quantity using max()
      const newQuantity = Math.max(stepFlashingItem.quantity, requiredQuantity);
      
      if (newQuantity > stepFlashingItem.quantity) {
        roofAdjustmentLogger.logAdjustment(ruleLog, this.EXACT_DESCRIPTIONS.STEP_FLASHING, 'quantity', 
          stepFlashingItem.quantity, newQuantity, `Quantity increased to max(current, required)`);
        
        const index = items.findIndex(item => item === stepFlashingItem);
        items[index] = this.adjustQuantity(
          stepFlashingItem,
          newQuantity,
          `Step flashing quantity adjusted to max(${stepFlashingItem.quantity}, ${requiredQuantity}) = ${newQuantity}`,
          'Category A: Step Flashing Quantity Adjustment'
        );
        this.adjustmentCounts.step_flashing_adjustments++;
      } else {
        roofAdjustmentLogger.logRuleDecision(ruleLog, 'No adjustment needed', 
          `Current quantity (${stepFlashingItem.quantity}) is already >= required (${requiredQuantity})`);
      }
    }
    
    roofAdjustmentLogger.endRuleExecution(ruleLog);
    return items;
  }

  private applyValleyMetalAdjustments(items: LineItem[], roofMeasurements: RoofMeasurements): LineItem[] {
    console.log('🔧 Applying Category A: Valley Metal Adjustments');
    
    const valleysLength = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_VALLEYS_LENGTH);
    const requiredQuantity = valleysLength / 100;
    
    return items.map(item => {
      if (item.description === this.EXACT_DESCRIPTIONS.VALLEY_METAL ||
          item.description === this.EXACT_DESCRIPTIONS.VALLEY_METAL_W) {
        if (item.quantity < requiredQuantity) {
          this.adjustmentCounts.valley_metal_adjustments++;
          return this.adjustQuantity(
            item,
            requiredQuantity,
            `Valley metal quantity adjusted to Total Valleys Length / 100: ${requiredQuantity}`,
            'Category A: Valley Metal Quantity Adjustment'
          );
        }
      }
      return item;
    });
  }

  private applyAluminumFlashingAdjustments(items: LineItem[], roofMeasurements: RoofMeasurements): LineItem[] {
    console.log('🔧 Applying Category A: Aluminum Flashing Adjustments');
    
    const flashingLength = this.getRMRValue(roofMeasurements, this.RMR_VARIABLES.TOTAL_FLASHING_LENGTH);
    const requiredQuantity = flashingLength / 100;
    
    return items.map(item => {
      if (item.description === this.EXACT_DESCRIPTIONS.ALUMINUM_FLASHING) {
        if (item.quantity < requiredQuantity) {
          return this.adjustQuantity(
            item,
            requiredQuantity,
            `Aluminum flashing quantity adjusted to Total Flashing Length / 100: ${requiredQuantity}`,
            'Category A: Aluminum Flashing Quantity Adjustment'
          );
        }
      }
      return item;
    });
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