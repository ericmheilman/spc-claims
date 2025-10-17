// JavaScript implementation of roof_adjustment_engine.py

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
  [key: string]: any;
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
  };

  constructor(roofMasterMacroData: Record<string, RoofMasterItem>) {
    this.roofMasterMacro = new Map(Object.entries(roofMasterMacroData));
  }

  private logAudit(entry: AuditLogEntry) {
    this.auditLog.push(entry);
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

  private roundToNearestSquare(quantity: number): number {
    // Round to nearest square (100 sq ft)
    return Math.round(quantity);
  }

  private adjustQuantity(item: LineItem, newQuantity: number, reason: string): LineItem {
    if (item.quantity !== newQuantity) {
      this.logAudit({
        line_number: item.line_number,
        field: 'quantity',
        before: item.quantity,
        after: newQuantity,
        explanation: reason,
      });

      const adjustedItem = { ...item };
      adjustedItem.quantity = newQuantity;
      adjustedItem.RCV = newQuantity * item.unit_price;
      adjustedItem.narrative = `Field Changed: quantity | Explanation: ${reason}`;
      this.adjustmentCounts.quantity_adjustments++;

      return adjustedItem;
    }
    return item;
  }

  private adjustUnitPrice(item: LineItem, newPrice: number, reason: string): LineItem {
    if (Math.abs(item.unit_price - newPrice) > 0.01) {
      this.logAudit({
        line_number: item.line_number,
        field: 'unit_price',
        before: item.unit_price,
        after: newPrice,
        explanation: reason,
      });

      const adjustedItem = { ...item };
      adjustedItem.unit_price = newPrice;
      adjustedItem.RCV = item.quantity * newPrice;
      adjustedItem.narrative = `Field Changed: unit_price | Explanation: ${reason}`;
      this.adjustmentCounts.price_adjustments++;

      return adjustedItem;
    }
    return item;
  }

  private addLineItem(
    description: string,
    quantity: number,
    unit: string,
    unitPrice: number,
    lineNumber: string,
    reason: string
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
    });

    this.adjustmentCounts.new_additions++;
    return newItem;
  }

  private checkSteepRoofAdjustment(
    items: LineItem[],
    roofMeasurements: RoofMeasurements
  ): LineItem[] {
    const adjustedItems = [...items];
    const steepRoofThreshold = 7; // 7/12 pitch or greater

    // Get roof pitch from measurements
    const roofPitch = roofMeasurements.roof_pitch || roofMeasurements.roofPitch || 0;

    if (roofPitch >= steepRoofThreshold) {
      console.log(`🏔️ Steep roof detected (${roofPitch}/12 pitch)`);

      for (let i = 0; i < adjustedItems.length; i++) {
        const item = adjustedItems[i];
        const desc = item.description.toLowerCase();

        // Check if this is a roofing labor item that needs steep roof adjustment
        if (
          desc.includes('labor') &&
          (desc.includes('shingle') || desc.includes('roof')) &&
          !desc.includes('steep')
        ) {
          const masterItem = this.getRoofMasterItem(item.description);
          if (masterItem) {
            const steepRoofMultiplier = 1.25; // 25% increase for steep roofs
            const newPrice = masterItem.unit_price * steepRoofMultiplier;

            adjustedItems[i] = this.adjustUnitPrice(
              item,
              newPrice,
              `Steep roof adjustment (${roofPitch}/12 pitch) - 25% labor increase`
            );
            this.adjustmentCounts.steep_roof_adjustments++;
          }
        }
      }
    }

    return adjustedItems;
  }

  private checkDripEdge(
    items: LineItem[],
    roofMeasurements: RoofMeasurements
  ): LineItem[] {
    const adjustedItems = [...items];
    
    // Check if drip edge exists
    const hasDripEdge = items.some(
      (item) =>
        item.description.toLowerCase().includes('drip') &&
        item.description.toLowerCase().includes('edge')
    );

    if (!hasDripEdge) {
      const eaveLength = roofMeasurements.total_eaves_length || roofMeasurements.totalEavesLength || 0;

      if (eaveLength > 0) {
        const dripEdgeItem = this.getRoofMasterItem('Drip edge');
        if (dripEdgeItem) {
          const quantity = this.roundToNearestSquare(eaveLength / 100);
          const newLineNumber = `${adjustedItems.length + 1}`;

          const newItem = this.addLineItem(
            'Drip edge',
            quantity,
            dripEdgeItem.unit,
            dripEdgeItem.unit_price,
            newLineNumber,
            `Missing drip edge - added based on eave length (${eaveLength} LF)`
          );

          adjustedItems.push(newItem);
          this.adjustmentCounts.drip_edge_adjustments++;
        }
      }
    }

    return adjustedItems;
  }

  private adjustLineItemsAgainstMacro(items: LineItem[]): LineItem[] {
    const adjustedItems: LineItem[] = [];

    for (const item of items) {
      let adjustedItem = { ...item };
      const masterItem = this.getRoofMasterItem(item.description);

      if (masterItem) {
        // Check unit price
        if (Math.abs(item.unit_price - masterItem.unit_price) > 0.01) {
          adjustedItem = this.adjustUnitPrice(
            adjustedItem,
            masterItem.unit_price,
            `Unit price adjusted to match roof master macro: $${masterItem.unit_price}`
          );
        }

        // Check unit
        if (item.unit !== masterItem.unit) {
          this.logAudit({
            line_number: item.line_number,
            field: 'unit',
            before: item.unit,
            after: masterItem.unit,
            explanation: `Unit corrected to match roof master macro: ${masterItem.unit}`,
          });
          adjustedItem.unit = masterItem.unit;
        }

        // Round quantities for certain units
        if (masterItem.unit === 'SQ' || masterItem.unit === 'Square') {
          const roundedQty = this.roundToNearestSquare(adjustedItem.quantity);
          if (adjustedItem.quantity !== roundedQty) {
            adjustedItem = this.adjustQuantity(
              adjustedItem,
              roundedQty,
              `Quantity rounded to nearest square: ${roundedQty}`
            );
            this.adjustmentCounts.rounding_adjustments++;
          }
        }
      }

      adjustedItems.push(adjustedItem);
    }

    return adjustedItems;
  }

  public processAdjustments(
    lineItems: LineItem[],
    roofMeasurements: RoofMeasurements
  ): AdjustmentResults {
    console.log('🔧 Starting JavaScript Roof Adjustment Engine...');
    console.log(`📊 Processing ${lineItems.length} line items`);

    // Reset audit log and counts
    this.auditLog = [];
    this.adjustmentCounts = {
      quantity_adjustments: 0,
      price_adjustments: 0,
      new_additions: 0,
      rounding_adjustments: 0,
      steep_roof_adjustments: 0,
      drip_edge_adjustments: 0,
    };

    // Step 1: Adjust line items against roof master macro
    let adjustedItems = this.adjustLineItemsAgainstMacro(lineItems);

    // Step 2: Check for steep roof adjustments
    adjustedItems = this.checkSteepRoofAdjustment(adjustedItems, roofMeasurements);

    // Step 3: Check for missing drip edge
    adjustedItems = this.checkDripEdge(adjustedItems, roofMeasurements);

    const totalAdjustments =
      this.adjustmentCounts.quantity_adjustments +
      this.adjustmentCounts.price_adjustments +
      this.adjustmentCounts.rounding_adjustments +
      this.adjustmentCounts.steep_roof_adjustments +
      this.adjustmentCounts.drip_edge_adjustments;

    console.log('✅ JavaScript adjustment engine completed');
    console.log(`📊 Total adjustments: ${totalAdjustments}`);
    console.log(`📊 New additions: ${this.adjustmentCounts.new_additions}`);

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

