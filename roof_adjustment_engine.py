#!/usr/bin/env python3
"""
Insurance Claim Roof Adjustment Engine

This script analyzes insurance claim line items and roof measurements to automatically
apply industry-standard adjustments based on roof geometry and material specifications.

Usage:
    python roof_adjustment_engine.py --line-items line_items.json --roof-data roof_data.json
    python roof_adjustment_engine.py --input combined_data.json
"""

import json
import math
import argparse
import sys
import os
import traceback
import csv
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from decimal import Decimal, ROUND_UP
import copy


@dataclass
class AdjustmentResult:
    """Tracks the results of adjustment operations."""
    
    def __init__(self):
        self.adjustments: List[Dict[str, Any]] = []
        self.additions: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.summary = {
            'total_adjustments': 0,
            'total_additions': 0,
            'total_warnings': 0,
            'estimated_savings': 0.0
        }

    def add_adjustment(self, description: str, old_quantity: float, new_quantity: float, 
                      reason: str, savings: float = 0.0):
        """Add a quantity adjustment record."""
        self.adjustments.append({
            'type': 'quantity_adjustment',
            'description': description,
            'old_quantity': old_quantity,
            'new_quantity': new_quantity,
            'reason': reason,
            'savings': savings
        })
        self.summary['total_adjustments'] += 1
        self.summary['estimated_savings'] += savings

    def add_addition(self, description: str, quantity: float, reason: str):
        """Add a new line item record."""
        self.additions.append({
            'type': 'addition',
            'description': description,
            'quantity': quantity,
            'reason': reason
        })
        self.summary['total_additions'] += 1

    def add_warning(self, description: str, reason: str):
        """Add a warning record."""
        self.warnings.append({
            'type': 'warning',
            'description': description,
            'reason': reason
        })
        self.summary['total_warnings'] += 1


class RoofAdjustmentEngine:
    """Main engine for processing roof adjustment rules."""
    
    def __init__(self):
        self.results = AdjustmentResult()
        self.roof_master_macro = self.load_roof_master_macro()
        
    def load_roof_master_macro(self) -> Dict[str, Dict[str, Any]]:
        """Load Roof Master Macro CSV file (3 columns: description, unit, unit_price)."""
        macro_data = {}
        try:
            # Try multiple paths for the CSV file
            csv_paths = [
                os.path.join(os.path.dirname(__file__), 'roof_master_macro.csv'),
                os.path.join(os.path.dirname(__file__), '..', 'public', 'roof_master_macro.csv'),
                os.path.join('public', 'roof_master_macro.csv'),
                'roof_master_macro.csv'
            ]
            
            csv_path = None
            for path in csv_paths:
                if os.path.exists(path):
                    csv_path = path
                    break
            
            if csv_path:
                print(f"📂 Loading Roof Master Macro from: {csv_path}")
                with open(csv_path, 'r', encoding='utf-8') as f:
                    # Auto-detect delimiter (tab or comma)
                    sample = f.read(1024)
                    f.seek(0)
                    sniffer = csv.Sniffer()
                    try:
                        dialect = sniffer.sniff(sample)
                        csv_reader = csv.DictReader(f, dialect=dialect)
                    except:
                        # Fallback to comma delimiter
                        csv_reader = csv.DictReader(f)
                    
                    # Verify required columns are present
                    if csv_reader.fieldnames:
                        # Normalize field names (case-insensitive, strip whitespace)
                        fieldnames = [field.strip().lower().replace(' ', '_') for field in csv_reader.fieldnames]
                        
                        if 'description' not in fieldnames or 'unit' not in fieldnames or 'unit_price' not in fieldnames:
                            print(f"⚠️ CSV file missing required columns. Expected: Description, Unit, Unit Price (or description, unit, unit_price)")
                            print(f"   Found columns: {csv_reader.fieldnames}")
                            return macro_data
                    
                    # Reset reader to process rows
                    f.seek(0)
                    try:
                        csv_reader = csv.DictReader(f, dialect=dialect)
                    except:
                        csv_reader = csv.DictReader(f)
                    
                    for row in csv_reader:
                        try:
                            # Get values with case-insensitive keys (handle spaces in column names)
                            description = None
                            unit = None
                            unit_price = None
                            
                            for key, value in row.items():
                                key_normalized = key.strip().lower().replace(' ', '_')
                                if key_normalized == 'description':
                                    description = value.strip()
                                elif key_normalized == 'unit':
                                    unit = value.strip().upper()
                                elif key_normalized == 'unit_price':
                                    unit_price = float(value.strip())
                            
                            if description and unit and unit_price is not None and unit_price > 0:
                                macro_data[description] = {
                                    'unit_price': unit_price,
                                    'rcv': unit_price,
                                    'acv': unit_price,
                                    'unit': unit
                                }
                        except (ValueError, KeyError) as e:
                            print(f"⚠️ Skipping invalid row: {row} - Error: {e}")
                            continue
                
                print(f"✅ Loaded {len(macro_data)} items from Roof Master Macro CSV")
            else:
                print(f"⚠️ Roof Master Macro CSV file not found in any of these locations:")
                for path in csv_paths:
                    print(f"   - {path}")
        except Exception as e:
            print(f"⚠️ Error loading Roof Master Macro CSV: {e}")
            import traceback
            traceback.print_exc()
        
        return macro_data

    def lookup_unit_price(self, description: str) -> Dict[str, Any]:
        """Look up unit price and other details from Roof Master Macro."""
        # Try exact match first
        if description in self.roof_master_macro:
            return self.roof_master_macro[description]
        
        # Try partial matches (case-insensitive)
        description_lower = description.lower()
        for macro_desc, data in self.roof_master_macro.items():
            if description_lower in macro_desc.lower() or macro_desc.lower() in description_lower:
                return data
        
        # Return default values if no match found
        return {
            'unit_price': 0.0,
            'rcv': 0.0,
            'acv': 0.0,
            'unit': 'SQ'
        }

    def get_metric(self, roof_metrics: Dict[str, Any], name: str) -> float:
        """Function to get metric value, default to 0 if not present."""
        return roof_metrics.get(name, {"value": 0})["value"]

    def update_item_costs(self, item: Dict[str, Any]) -> None:
        """Update RCV and ACV based on current quantity and unit price."""
        quantity = item.get("quantity", 0)
        unit_price = item.get("unit_price", 0)
        dep_percent = item.get("dep_percent", 0)
        
        # Calculate RCV
        rcv = quantity * unit_price
        item["RCV"] = rcv
        
        # Calculate ACV (RCV minus depreciation)
        depreciation_amount = rcv * (dep_percent / 100)
        item["depreciation_amount"] = depreciation_amount
        item["ACV"] = rcv - depreciation_amount

    def is_multiple_of(self, qty: float, step: float) -> bool:
        """Function to check if quantity ends in specific decimals for rounding check."""
        # Check if qty is multiple of step (with floating point tolerance)
        return math.isclose((qty / step) - round(qty / step), 0, abs_tol=1e-5)

    def find_item(self, line_items: List[Dict[str, Any]], desc: str) -> Optional[Dict[str, Any]]:
        """Function to find item by description (exact match)."""
        for item in line_items:
            if item.get("description", "").strip() == desc.strip():
                return item
        return None

    def add_new_item(self, line_items: List[Dict[str, Any]], desc: str, qty: float, 
                    unit: str = "SQ", location_room: str = "Roof", category: str = "Roof") -> Dict[str, Any]:
        """Function to add new item with unit prices from Roof Master Macro."""
        max_line = max(int(item.get("line_number", 0)) for item in line_items) + 1
        
        # Round quantity to 2 decimal places for practicality
        rounded_qty = round(qty, 2)
        
        # Look up unit price and other details from Roof Master Macro
        macro_data = self.lookup_unit_price(desc)
        unit_price = macro_data['unit_price']
        
        # Use the unit from macro data if available, otherwise use the provided unit
        macro_unit = macro_data.get('unit', unit)
        
        # Calculate RCV and ACV
        rcv = unit_price * rounded_qty
        acv = rcv  # Assuming no depreciation for new items
        
        new_item = {
            "line_number": str(max_line),
            "description": desc,
            "quantity": rounded_qty,
            "unit": macro_unit,
            "unit_price": unit_price,
            "RCV": rcv,
            "age_life": "0/NA",
            "condition": "Avg.",
            "dep_percent": 0,
            "depreciation_amount": 0,
            "ACV": acv,
            "location_room": location_room,
            "category": category,
            "page_number": max(int(item.get("page_number", 0)) for item in line_items)
        }
        line_items.append(new_item)
        print(f"    ✅ Added: {desc} - Qty: {rounded_qty} {macro_unit} @ ${unit_price:.2f}/{macro_unit} = ${rcv:.2f}")
        print(f"       📊 Unit Price: ${unit_price:.2f}, RCV: ${rcv:.2f}, ACV: ${acv:.2f}")
        self.results.add_addition(desc, qty, f"Added missing line item based on roof measurements")
        return new_item

    def apply_logic(self, line_items: List[Dict[str, Any]], roof_metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Main logic function that applies all the adjustment rules."""
        
        print(f"\n🔧 APPLYING BUSINESS RULES...")
        
        # Extract metrics
        total_roof_area = self.get_metric(roof_metrics, "Total Roof Area")
        total_eaves_length = self.get_metric(roof_metrics, "Total Eaves Length")
        total_rakes_length = self.get_metric(roof_metrics, "Total Rakes Length")
        area_pitch_1 = self.get_metric(roof_metrics, "Area for Pitch 1/12 (sq ft)")
        area_pitch_2 = self.get_metric(roof_metrics, "Area for Pitch 2/12 (sq ft)")
        area_pitch_3 = self.get_metric(roof_metrics, "Area for Pitch 3/12 (sq ft)")
        area_pitch_4 = self.get_metric(roof_metrics, "Area for Pitch 4/12 (sq ft)")
        area_pitch_5 = self.get_metric(roof_metrics, "Area for Pitch 5/12 (sq ft)")
        area_pitch_6 = self.get_metric(roof_metrics, "Area for Pitch 6/12 (sq ft)")
        area_pitch_7 = self.get_metric(roof_metrics, "Area for Pitch 7/12 (sq ft)")
        area_pitch_8 = self.get_metric(roof_metrics, "Area for Pitch 8/12 (sq ft)")
        area_pitch_9 = self.get_metric(roof_metrics, "Area for Pitch 9/12 (sq ft)")
        area_pitch_10 = self.get_metric(roof_metrics, "Area for Pitch 10/12 (sq ft)")
        area_pitch_11 = self.get_metric(roof_metrics, "Area for Pitch 11/12 (sq ft)")
        area_pitch_12 = self.get_metric(roof_metrics, "Area for Pitch 12/12 (sq ft)")
        area_pitch_12_plus = self.get_metric(roof_metrics, "Area for Pitch 12/12+ (sq ft)")
        total_ridges_hips_length = self.get_metric(roof_metrics, "Total Ridges/Hips Length")
        total_line_lengths_ridges = self.get_metric(roof_metrics, "Total Line Lengths (Ridges)")
        total_valleys_length = self.get_metric(roof_metrics, "Total Valleys Length")
        total_step_flashing_length = self.get_metric(roof_metrics, "Total Step Flashing Length")
        total_flashing_length = self.get_metric(roof_metrics, "Total Flashing Length")

        print(f"\n📊 EXTRACTED METRICS:")
        print(f"  Total Roof Area: {total_roof_area}")
        print(f"  Total Eaves Length: {total_eaves_length}")
        print(f"  Total Rakes Length: {total_rakes_length}")
        print(f"  Total Ridges/Hips Length: {total_ridges_hips_length}")
        print(f"  Total Valleys Length: {total_valleys_length}")
        print(f"  Total Step Flashing Length: {total_step_flashing_length}")
        print(f"  Total Flashing Length: {total_flashing_length}")
        print(f"\n  PITCH AREAS (ALL SLOPES):")
        print(f"  Pitch 1/12: {area_pitch_1}")
        print(f"  Pitch 2/12: {area_pitch_2}")
        print(f"  Pitch 3/12: {area_pitch_3}")
        print(f"  Pitch 4/12: {area_pitch_4}")
        print(f"  Pitch 5/12: {area_pitch_5}")
        print(f"  Pitch 6/12: {area_pitch_6}")
        print(f"  Pitch 7/12: {area_pitch_7}")
        print(f"  Pitch 8/12: {area_pitch_8}")
        print(f"  Pitch 9/12: {area_pitch_9}")
        print(f"  Pitch 10/12: {area_pitch_10}")
        print(f"  Pitch 11/12: {area_pitch_11}")
        print(f"  Pitch 12/12: {area_pitch_12}")
        print(f"  Pitch 12/12+: {area_pitch_12_plus}")
        
        # Calculate totals
        steep_7_9_total = area_pitch_7 + area_pitch_8 + area_pitch_9
        steep_10_12_total = area_pitch_10 + area_pitch_11 + area_pitch_12
        print(f"\n  📈 STEEP AREA TOTALS:")
        print(f"  7/12-9/12: {steep_7_9_total} sq ft → {steep_7_9_total / 100:.2f} SQ")
        print(f"  10/12-12/12: {steep_10_12_total} sq ft → {steep_10_12_total / 100:.2f} SQ")
        print(f"  12/12+: {area_pitch_12_plus} sq ft → {area_pitch_12_plus / 100:.2f} SQ")

        # Calculate common values
        total_squares = total_roof_area / 100.0
        starter_qty = (total_eaves_length + total_rakes_length) / 100.0
        steep_7_9_qty = (area_pitch_7 + area_pitch_8 + area_pitch_9) / 100.0
        steep_10_12_qty = (area_pitch_10 + area_pitch_11 + area_pitch_12) / 100.0
        steep_12_plus_qty = area_pitch_12_plus / 100.0
        ridges_hips_qty = total_ridges_hips_length / 100.0
        ridges_qty = total_line_lengths_ridges / 100.0
        valleys_qty = total_valleys_length / 100.0
        step_flashing_qty = total_step_flashing_length / 100.0
        flashing_qty = total_flashing_length / 100.0

        print(f"\n🧮 CALCULATED VALUES:")
        print(f"  Total Squares (Total Roof Area / 100): {total_squares}")
        print(f"  Starter Quantity ((Eaves + Rakes) / 100): {starter_qty}")
        print(f"  Steep 7-9 Quantity: {steep_7_9_qty}")
        print(f"  Steep 10-12 Quantity: {steep_10_12_qty}")
        print(f"  Steep 12+ Quantity: {steep_12_plus_qty}")
        print(f"  Ridges/Hips Quantity: {ridges_hips_qty}")
        print(f"  Ridges Quantity: {ridges_qty}")
        print(f"  Valleys Quantity: {valleys_qty}")
        print(f"  Step Flashing Quantity: {step_flashing_qty}")
        print(f"  Flashing Quantity: {flashing_qty}")

        # Rule 1-4: Adjust removal quantities to max with total_squares
        print(f"\n📝 RULE 1-4: Shingle Removal Quantity Adjustments")
        
        if total_roof_area == 0 or total_squares == 0:
            print(f"  ⚠️  WARNING: Total Roof Area is 0 - skipping shingle quantity adjustments!")
            print(f"  This usually means roof measurements are missing or not loaded correctly.")
            self.results.add_warning("Shingle Quantity Adjustments", 
                                   "Total Roof Area is 0 - cannot adjust shingle quantities. Please verify roof measurements are loaded correctly.")
        else:
            # Use exact descriptions from Roof Master Macro CSV
            removal_descriptions = [
                "Remove Laminated - comp. shingle rfg. - w/out felt",
                "Remove 3 tab - 25 yr. - comp. shingle roofing - w/out felt",
                "Remove 3 tab - 25 yr. - composition shingle roofing - incl. felt",
                "Remove Laminated - comp. shingle rfg. - w/ felt"
            ]
            
            for desc in removal_descriptions:
                item = self.find_item(line_items, desc)
                if item:
                    qty = float(item["quantity"])
                    print(f"  Found: {desc} - Current Qty: {qty}, Target: {total_squares}")
                    if not math.isclose(qty, total_squares):
                        old_qty = qty
                        item["quantity"] = max(qty, total_squares)
                        print(f"    ✅ ADJUSTED: {old_qty} → {item['quantity']}")
                        self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                                  f"Quantity should equal Total Roof Area / 100 ({total_squares:.2f})")
                    else:
                        print(f"    ⏭️  No change needed (already matches)")
                else:
                    print(f"  ❌ Not found: {desc}")

        # Rule 5-8: Adjust installation quantities to max with total_squares
        print(f"\n📝 RULE 5-8: Shingle Installation Quantity Adjustments")
        
        if total_roof_area == 0 or total_squares == 0:
            print(f"  ⚠️  WARNING: Total Roof Area is 0 - skipping shingle quantity adjustments!")
        else:
            # Use exact descriptions from Roof Master Macro CSV
            installation_descriptions = [
                "Laminated - comp. shingle rfg. - w/out felt",
                "3 tab - 25 yr. - comp. shingle roofing - w/out felt",
                "3 tab - 25 yr. - composition shingle roofing - incl. felt",
                "Laminated - comp. shingle rfg. - w/ felt"
            ]
            
            for desc in installation_descriptions:
                item = self.find_item(line_items, desc)
                if item:
                    qty = float(item["quantity"])
                    print(f"  Found: {desc} - Current Qty: {qty}, Target: {total_squares}")
                    if not math.isclose(qty, total_squares):
                        old_qty = qty
                        item["quantity"] = max(qty, total_squares)
                        print(f"    ✅ ADJUSTED: {old_qty} → {item['quantity']}")
                        self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                                  f"Quantity should equal Total Roof Area / 100 ({total_squares:.2f})")
                    else:
                        print(f"    ⏭️  No change needed (already matches)")
                else:
                    print(f"  ❌ Not found: {desc}")

        # Rounding rules for laminated (0.25) - Use exact descriptions
        for desc in [
            "Remove Laminated - comp. shingle rfg. - w/out felt",
            "Laminated - comp. shingle rfg. - w/out felt",
            "Remove Laminated - comp. shingle rfg. - w/ felt",
            "Laminated - comp. shingle rfg. - w/ felt"
        ]:
            item = self.find_item(line_items, desc)
            if item:
                qty = float(item["quantity"])
                if not self.is_multiple_of(qty % 1, 0.25):  # Check fractional part
                    old_qty = qty
                    item["quantity"] = math.ceil(qty * 4) / 4
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              "Laminated shingles should be rounded up to nearest 0.25")

        # Rounding rules for 3 tab (0.33) - Use exact descriptions
        for desc in [
            "Remove 3 tab - 25 yr. - comp. shingle roofing - w/out felt",
            "3 tab - 25 yr. - comp. shingle roofing - w/out felt",
            "Remove 3 tab - 25 yr. - composition shingle roofing - incl. felt",
            "3 tab - 25 yr. - composition shingle roofing - incl. felt"
        ]:
            item = self.find_item(line_items, desc)
            if item:
                qty = float(item["quantity"])
                frac = qty - math.floor(qty)
                if not (math.isclose(frac, 0) or math.isclose(frac, 0.33, abs_tol=0.01) or math.isclose(frac, 0.67, abs_tol=0.01)):
                    old_qty = qty
                    item["quantity"] = math.ceil(qty * 3) / 3
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              "3-tab shingles should be rounded up to nearest 0.33")

        # Starter rules for removals - Use exact descriptions
        for remove_desc in [
            "Remove Laminated - comp. shingle rfg. - w/out felt",
            "Remove 3 tab - 25 yr. - comp. shingle roofing - w/out felt"
        ]:
            if self.find_item(line_items, remove_desc):
                for starter_desc in [
                    "Asphalt starter - universal starter course",
                    "Asphalt starter - peel and stick",
                    "Asphalt starter - laminated double layer starter"
                ]:
                    item = self.find_item(line_items, starter_desc)
                    if item:
                        qty = float(item["quantity"])
                        if qty < starter_qty:
                            old_qty = qty
                            item["quantity"] = starter_qty
                            self.results.add_adjustment(starter_desc, old_qty, item["quantity"], 
                                                      f"Starter strip quantity should equal (Total Eaves + Total Rakes) / 100 ({starter_qty:.2f})")

        # Steep rules for 7-9
        print(f"\n🏔️ RULE: Steep Roof 7/12-9/12 Charges")
        print(f"  Steep area total: {area_pitch_7 + area_pitch_8 + area_pitch_9} sq ft")
        print(f"  Calculated quantity: {steep_7_9_qty:.4f}")
        print(f"  Rounded quantity: {round(steep_7_9_qty, 2):.2f}")
        
        if area_pitch_7 != 0 or area_pitch_8 != 0 or area_pitch_9 != 0:
            print(f"  ✅ Steep roof areas detected - applying rules")
            rounded_qty = round(steep_7_9_qty, 2)
            for desc, is_remove in [("Remove Additional charge for steep roof - 7/12 to 9/12 slope", True), ("Additional charge for steep roof - 7/12 to 9/12 slope", False)]:
                item = self.find_item(line_items, desc)
                if item:
                    qty = float(item["quantity"])
                    print(f"    Found: {desc} - Current: {qty}, Target: {rounded_qty}")
                    if qty < rounded_qty:
                        old_qty = qty
                        item["quantity"] = rounded_qty
                        print(f"      ✅ ADJUSTED: {old_qty} → {item['quantity']}")
                        self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                                  f"Steep roof charge should equal (Area 7/12 + 8/12 + 9/12) / 100 ({rounded_qty:.2f})")
                    else:
                        print(f"      ⏭️  No change needed (already sufficient)")
                else:
                    print(f"    ❌ Not found: {desc} - ADDING NEW ITEM")
                    print(f"      Adding with quantity: {rounded_qty:.2f} SQ")
                    self.add_new_item(line_items, desc, rounded_qty)
        else:
            print(f"  ⏭️  No steep roof areas (7/12-9/12) - skipping rules")

        # Steep rules for 10-12
        if area_pitch_10 != 0 or area_pitch_11 != 0 or area_pitch_12 != 0:
            for desc, is_remove in [("Remove Additional charge for steep roof - 10/12 - 12/12 slope", True), ("Additional charge for steep roof - 10/12 - 12/12 slope", False)]:
                item = self.find_item(line_items, desc)
                if item:
                    qty = float(item["quantity"])
                    if qty < steep_10_12_qty:
                        old_qty = qty
                        item["quantity"] = steep_10_12_qty
                        self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                                  f"Steep roof charge should equal (Area 10/12 + 11/12 + 12/12) / 100 ({steep_10_12_qty:.2f})")
                else:
                    self.add_new_item(line_items, desc, steep_10_12_qty)

        # Steep rules for 12+
        if area_pitch_12_plus != 0:
            for desc in ["Remove Additional charge for steep roof greater than 12/12 slope", "Additional charge for steep roof greater than 12/12 slope"]:
                item = self.find_item(line_items, desc)
                if item:
                    qty = float(item["quantity"])
                    if qty < steep_12_plus_qty:
                        old_qty = qty
                        item["quantity"] = max(qty, steep_12_plus_qty)
                        self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                                  f"Steep roof charge should equal Area 12/12+ / 100 ({steep_12_plus_qty:.2f})")
                else:
                    self.add_new_item(line_items, desc, steep_12_plus_qty)

        # Starter add if none present
        starters = [
            "Asphalt starter - universal starter course",
            "Asphalt starter - peel and stick",
            "Asphalt starter - laminated double layer starter"
        ]
        has_starter = any(self.find_item(line_items, s) for s in starters)
        if not has_starter:
            self.add_new_item(line_items, "Asphalt starter - universal starter course", starter_qty)
        else:
            for s in starters:
                item = self.find_item(line_items, s)
                if item and float(item["quantity"]) < starter_qty:
                    old_qty = float(item["quantity"])
                    item["quantity"] = starter_qty
                    self.results.add_adjustment(s, old_qty, item["quantity"], 
                                              f"Starter strip quantity should equal (Total Eaves + Total Rakes) / 100 ({starter_qty:.2f})")

        # Ridge vent add if no hip/ridge - Use exact descriptions
        hip_ridges = [
            "Hip / Ridge cap - High profile - composition shingles",
            "Hip / Ridge cap - Standard profile - composition shingles"
        ]
        has_hip_ridge = any(self.find_item(line_items, h) for h in hip_ridges)
        if not has_hip_ridge:
            item = self.find_item(line_items, "Continuous ridge vent - Detach & reset")
            if item:
                qty = float(item["quantity"])
                if qty < ridges_hips_qty:
                    old_qty = qty
                    item["quantity"] = max(qty, ridges_hips_qty)
                    self.results.add_adjustment("Continuous ridge vent - Detach & reset", old_qty, item["quantity"], 
                                              f"Ridge vent quantity should equal Total Ridges/Hips Length / 100 ({ridges_hips_qty:.2f})")
            else:
                self.add_new_item(line_items, "Continuous ridge vent - Detach & reset", ridges_hips_qty, unit="LF")
        else:
            for h in hip_ridges:
                item = self.find_item(line_items, h)
                if item:
                    qty = float(item["quantity"])
                    if qty < ridges_hips_qty:
                        old_qty = qty
                        item["quantity"] = max(qty, ridges_hips_qty)
                        self.results.add_adjustment(h, old_qty, item["quantity"], 
                                                  f"Hip/Ridge cap quantity should equal Total Ridges/Hips Length / 100 ({ridges_hips_qty:.2f})")

        # Max for steep if present
        for desc, calc_qty in [
            ("Remove Additional charge for steep roof - 7/12 to 9/12 slope", steep_7_9_qty),
            ("Additional charge for steep roof - 7/12 to 9/12 slope", steep_7_9_qty),
            ("Remove Additional charge for steep roof - 10/12 - 12/12 slope", steep_10_12_qty),
            ("Additional charge for steep roof - 10/12 - 12/12 slope", steep_10_12_qty),
            ("Remove Additional charge for steep roof greater than 12/12 slope", steep_12_plus_qty),
            ("Additional charge for steep roof greater than 12/12 slope", steep_12_plus_qty)
        ]:
            item = self.find_item(line_items, desc)
            if item:
                qty = float(item["quantity"])
                if qty < calc_qty:
                    old_qty = qty
                    item["quantity"] = max(qty, calc_qty)
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Steep roof charge should equal calculated area / 100 ({calc_qty:.2f})")

        # Continuous ridge vent - Use exact descriptions
        for desc, calc_qty in [
            ("Continuous ridge vent - aluminum", ridges_qty),
            ("Continuous ridge vent - shingle-over style", ridges_qty)
        ]:
            item = self.find_item(line_items, desc)
            if item:
                qty = float(item["quantity"])
                if qty < calc_qty:
                    old_qty = qty
                    item["quantity"] = max(qty, calc_qty)
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Ridge vent quantity should equal Total Line Lengths (Ridges) / 100 ({calc_qty:.2f})")

        # Hip/Ridge cap - Use exact descriptions
        for desc, calc_qty in [
            ("Hip / Ridge cap - High profile - composition shingles", ridges_hips_qty),
            ("Hip / Ridge cap - cut from 3 tab - composition shingles", ridges_hips_qty),
            ("Hip / Ridge cap - Standard profile - composition shingles", ridges_hips_qty)
        ]:
            item = self.find_item(line_items, desc)
            if item:
                qty = float(item["quantity"])
                if qty < calc_qty:
                    old_qty = qty
                    item["quantity"] = max(qty, calc_qty)
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Hip/Ridge cap quantity should equal Total Ridges/Hips Length / 100 ({calc_qty:.2f})")

        # Drip edge
        print(f"\n📏 RULE: Drip Edge Adjustments")
        drip_edge_length = total_eaves_length + total_rakes_length  # Full length in LF, not divided by 100
        print(f"  Calculated drip edge length: {drip_edge_length} LF (Eaves: {total_eaves_length} + Rakes: {total_rakes_length})")
        
        # Try multiple description variations
        drip_edge_descriptions = [
            "Drip edge/gutter apron",
            "Drip edge",
            "Drip Edge"
        ]
        
        found_drip_edge = False
        for desc in drip_edge_descriptions:
            item = self.find_item(line_items, desc)
            if item:
                found_drip_edge = True
                qty = float(item["quantity"])
                print(f"  Found: {desc} - Current Qty: {qty}, Target: {drip_edge_length}")
                if not math.isclose(qty, drip_edge_length):
                    old_qty = qty
                    item["quantity"] = max(qty, drip_edge_length)
                    print(f"    ✅ ADJUSTED: {old_qty} → {item['quantity']}")
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Drip edge quantity should equal (Total Eaves + Total Rakes) = {drip_edge_length:.2f} LF")
                else:
                    print(f"    ⏭️  No change needed (already matches)")
                break
        
        if not found_drip_edge:
            print(f"  ❌ Not found: Drip edge (tried all variations)")

        # Step flashing
        print(f"\n📏 RULE: Step Flashing Adjustments")
        step_flashing_length = total_step_flashing_length  # Full length in LF
        print(f"  Calculated step flashing length: {step_flashing_length} LF")
        
        desc = "Step flashing"
        item = self.find_item(line_items, desc)
        if item:
            old_qty = float(item["quantity"])
            print(f"  Found: {desc} - Current Qty: {old_qty}, Target: {step_flashing_length}")
            if not math.isclose(old_qty, step_flashing_length):
                item["quantity"] = step_flashing_length
                print(f"    ✅ ADJUSTED: {old_qty} → {item['quantity']}")
                self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                          f"Step flashing quantity should equal Total Step Flashing Length = {step_flashing_length:.2f} LF")
            else:
                print(f"    ⏭️  No change needed (already matches)")
        else:
            print(f"  ❌ Not found: {desc}")

        # Aluminum sidewall
        print(f"\n📏 RULE: Aluminum Flashing Adjustments")
        aluminum_flashing_length = total_flashing_length  # Full length in LF
        print(f"  Calculated aluminum flashing length: {aluminum_flashing_length} LF")
        
        desc = "Aluminum sidewall/endwall flashing - mill finish"
        item = self.find_item(line_items, desc)
        if item:
            qty = float(item["quantity"])
            print(f"  Found: {desc} - Current Qty: {qty}, Target: {aluminum_flashing_length}")
            if qty < aluminum_flashing_length:
                old_qty = qty
                item["quantity"] = max(qty, aluminum_flashing_length)
                print(f"    ✅ ADJUSTED: {old_qty} → {item['quantity']}")
                self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                          f"Aluminum flashing quantity should equal Total Flashing Length = {aluminum_flashing_length:.2f} LF")
            else:
                print(f"    ⏭️  No change needed (already sufficient)")
        else:
            print(f"  ❌ Not found: {desc}")

        # Continuous ridge vent shingle-over style additional - Use exact descriptions
        if self.find_item(line_items, "Continuous ridge vent - shingle-over style"):
            for desc, calc_qty in [
                ("Hip / Ridge cap - High profile - composition shingles", ridges_hips_qty),
                ("Hip / Ridge cap - cut from 3 tab - composition shingles", ridges_hips_qty),
                ("Hip / Ridge cap - Standard profile - composition shingles", ridges_hips_qty)
            ]:
                item = self.find_item(line_items, desc)
                if item:
                    qty = float(item["quantity"])
                    if qty < calc_qty:
                        old_qty = qty
                        item["quantity"] = max(qty, calc_qty)
                        self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                                  f"Hip/Ridge cap quantity should equal Total Ridges/Hips Length / 100 ({calc_qty:.2f})")

        # Continuous ridge vent aluminum additional - Use exact descriptions
        if self.find_item(line_items, "Continuous ridge vent - aluminum"):
            for desc, calc_qty in [
                ("Hip / Ridge cap - High profile - composition shingles", ridges_hips_qty),
                ("Hip / Ridge cap - cut from 3 tab - composition shingles", ridges_hips_qty),
                ("Hip / Ridge cap - Standard profile - composition shingles", ridges_hips_qty)
            ]:
                item = self.find_item(line_items, desc)
                if item:
                    old_qty = float(item["quantity"])
                    item["quantity"] = ridges_hips_qty  # Set directly as per some rules
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Hip/Ridge cap quantity should equal Total Ridges/Hips Length / 100 ({ridges_hips_qty:.2f})")

        # Specific combinations - Use exact descriptions
        if self.find_item(line_items, "Continuous ridge vent - shingle-over style") and self.find_item(line_items, "3 tab - 25 yr. - composition shingle roofing - incl. felt"):
            desc = "Hip / Ridge cap - cut from 3 tab - composition shingles"
            item = self.find_item(line_items, desc)
            if item:
                qty = float(item["quantity"])
                if qty < ridges_qty:
                    old_qty = qty
                    item["quantity"] = max(qty, ridges_qty)
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Hip/Ridge cap quantity should equal Total Line Lengths (Ridges) / 100 ({ridges_qty:.2f})")
            else:
                self.add_new_item(line_items, desc, ridges_qty)

        if self.find_item(line_items, "Continuous ridge vent - shingle-over style") and self.find_item(line_items, "Remove Laminated - comp. shingle rfg. - w/out felt"):
            desc = "Hip / Ridge cap - Standard profile - composition shingles"
            item = self.find_item(line_items, desc)
            if item:
                qty = float(item["quantity"])
                if qty < ridges_qty:
                    old_qty = qty
                    item["quantity"] = max(qty, ridges_qty)
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Hip/Ridge cap quantity should equal Total Line Lengths (Ridges) / 100 ({ridges_qty:.2f})")
            else:
                self.add_new_item(line_items, desc, ridges_qty)

        if self.find_item(line_items, "Continuous ridge vent - shingle-over style") and self.find_item(line_items, "Remove Laminated - comp. shingle rfg. - w/ felt"):
            desc = "Hip / Ridge cap - Standard profile - composition shingles"
            item = self.find_item(line_items, desc)
            if item:
                qty = float(item["quantity"])
                if qty < ridges_qty:
                    old_qty = qty
                    item["quantity"] = max(qty, ridges_qty)
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Hip/Ridge cap quantity should equal Total Line Lengths (Ridges) / 100 ({ridges_qty:.2f})")
            else:
                self.add_new_item(line_items, desc, ridges_qty)

        # Valley metal
        print(f"\n📏 RULE: Valley Metal Adjustments")
        valley_length = total_valleys_length  # Full length in LF
        print(f"  Calculated valley length: {valley_length} LF")
        
        for desc in ["Valley metal", "Valley metal - (W) profile"]:
            item = self.find_item(line_items, desc)
            if item:
                qty = float(item["quantity"])
                print(f"  Found: {desc} - Current Qty: {qty}, Target: {valley_length}")
                if qty < valley_length:
                    old_qty = qty
                    item["quantity"] = max(qty, valley_length)
                    print(f"    ✅ ADJUSTED: {old_qty} → {item['quantity']}")
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Valley metal quantity should equal Total Valleys Length = {valley_length:.2f} LF")
                else:
                    print(f"    ⏭️  No change needed (already sufficient)")
                break
        else:
            print(f"  ❌ Not found: Valley metal (tried all variations)")

        # Roofing felt logic based on pitch areas
        print(f"\n📄 RULE: Roofing Felt Adjustments Based on Pitch")
        
        # Calculate pitch area totals for different slope ranges
        low_slope_area = area_pitch_1 + area_pitch_2 + area_pitch_3 + area_pitch_4
        medium_slope_area = area_pitch_5 + area_pitch_6 + area_pitch_7 + area_pitch_8
        steep_slope_area = area_pitch_9 + area_pitch_10 + area_pitch_11 + area_pitch_12 + area_pitch_12_plus
        
        print(f"  Low Slope (1/12-4/12): {low_slope_area} sq ft → {low_slope_area / 100:.2f} SQ")
        print(f"  Medium Slope (5/12-8/12): {medium_slope_area} sq ft → {medium_slope_area / 100:.2f} SQ")
        print(f"  Steep Slope (9/12+): {steep_slope_area} sq ft → {steep_slope_area / 100:.2f} SQ")
        
        # Rule 1: Low slope roofing felt (1/12 to 4/12)
        if low_slope_area != 0:
            desc = "Roofing felt - 15 lb. double coverage/low slope"
            low_slope_qty = low_slope_area / 100.0
            item = self.find_item(line_items, desc)
            if item:
                old_qty = float(item["quantity"])
                print(f"  Found: {desc} - Current Qty: {old_qty}, Target: {low_slope_qty:.2f}")
                if old_qty < low_slope_qty:
                    item["quantity"] = max(old_qty, low_slope_qty)
                    self.update_item_costs(item)
                    print(f"    ✅ ADJUSTED: {old_qty} → {item['quantity']}")
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Quantity should equal (Area 1/12 + 2/12 + 3/12 + 4/12) / 100 ({low_slope_qty:.2f})")
                else:
                    print(f"    ⏭️  No change needed (already sufficient)")
            else:
                print(f"  ❌ Not found: {desc} - ADDING NEW ITEM")
                self.add_new_item(line_items, desc, low_slope_qty)
        else:
            print(f"  ⏭️  No low slope areas (1/12-4/12) - skipping low slope felt")
        
        # Rule 2: Medium slope roofing felt (5/12 to 8/12)
        if medium_slope_area != 0:
            desc = "Roofing felt - 15 lb."
            medium_slope_qty = medium_slope_area / 100.0
            item = self.find_item(line_items, desc)
            if item:
                old_qty = float(item["quantity"])
                print(f"  Found: {desc} - Current Qty: {old_qty}, Target: {medium_slope_qty:.2f}")
                if old_qty < medium_slope_qty:
                    item["quantity"] = max(old_qty, medium_slope_qty)
                    self.update_item_costs(item)
                    print(f"    ✅ ADJUSTED: {old_qty} → {item['quantity']}")
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Quantity should equal (Area 5/12 + 6/12 + 7/12 + 8/12) / 100 ({medium_slope_qty:.2f})")
                else:
                    print(f"    ⏭️  No change needed (already sufficient)")
            else:
                print(f"  ❌ Not found: {desc} - ADDING NEW ITEM")
                self.add_new_item(line_items, desc, medium_slope_qty)
        else:
            print(f"  ⏭️  No medium slope areas (5/12-8/12) - skipping medium slope felt")
        
        # Rule 3: Steep slope roofing felt (9/12 and above)
        if steep_slope_area != 0:
            desc = "Roofing felt - 30 lb."
            steep_slope_qty = steep_slope_area / 100.0
            item = self.find_item(line_items, desc)
            if item:
                old_qty = float(item["quantity"])
                print(f"  Found: {desc} - Current Qty: {old_qty}, Target: {steep_slope_qty:.2f}")
                if old_qty < steep_slope_qty:
                    item["quantity"] = max(old_qty, steep_slope_qty)
                    self.update_item_costs(item)
                    print(f"    ✅ ADJUSTED: {old_qty} → {item['quantity']}")
                    self.results.add_adjustment(desc, old_qty, item["quantity"], 
                                              f"Quantity should equal (Area 9/12 + 10/12 + 11/12 + 12/12 + 12/12+) / 100 ({steep_slope_qty:.2f})")
                else:
                    print(f"    ⏭️  No change needed (already sufficient)")
            else:
                print(f"  ❌ Not found: {desc} - ADDING NEW ITEM")
                self.add_new_item(line_items, desc, steep_slope_qty)
        else:
            print(f"  ⏭️  No steep slope areas (9/12+) - skipping steep slope felt")

        # Chimney saddle/cricket logic
        print(f"\n🏠 RULE: Chimney Saddle/Cricket Logic")
        
        # Check for chimney flashing average (32" x 36")
        chimney_avg = self.find_item(line_items, "Chimney flashing average (32\" x 36\")")
        if chimney_avg:
            print(f"  ✅ Found: Chimney flashing average (32\" x 36\")")
            
            # Check if saddle up to 25 SF is missing
            saddle_25 = self.find_item(line_items, "Saddle or cricket up to 25 SF")
            if not saddle_25:
                print(f"    ❌ Missing: Saddle or cricket up to 25 SF - ADDING")
                self.add_new_item(line_items, "Saddle or cricket up to 25 SF", 1.0, unit="EA", 
                                location_room="Roof", category="Roof")
            else:
                print(f"    ✅ Already present: Saddle or cricket up to 25 SF")
        else:
            print(f"  ❌ Not found: Chimney flashing average (32\" x 36\")")
        
        # Check for chimney flashing large (32" x 60")
        chimney_large = self.find_item(line_items, "Chimney flashing- large (32\" x 60\")")
        if chimney_large:
            print(f"  ✅ Found: Chimney flashing- large (32\" x 60\")")
            
            # Check if saddle 26 to 50 SF is missing
            saddle_50 = self.find_item(line_items, "Saddle or cricket 26 to 50 SF")
            if not saddle_50:
                print(f"    ❌ Missing: Saddle or cricket 26 to 50 SF - ADDING")
                self.add_new_item(line_items, "Saddle or cricket 26 to 50 SF", 1.0, unit="EA", 
                                location_room="Roof", category="Roof")
            else:
                print(f"    ✅ Already present: Saddle or cricket 26 to 50 SF")
        else:
            print(f"  ❌ Not found: Chimney flashing- large (32\" x 60\")")

        # LINE ITEM REPLACEMENT RULES
        # Replace carrier estimate items with proper Roof Master Macro items
        print(f"\n🔄 RULE: Line Item Replacements (Carrier → Roof Master)")
        
        # Define replacement rules: [carrier_patterns, roof_master_description]
        replacement_rules = [
            # Ridge vents
            (["Detach & Reset Continuous ridge vent - shingle-over", "Install Continuous ridge vent - shingle-over style"], 
             "R&R Continuous ridge vent - shingle-over style"),
            (["Detach & Reset Continuous ridge vent - aluminum", "Install Continuous ridge vent - aluminum"], 
             "R&R Continuous ridge vent - aluminum"),
            
            # Turtle vents
            (["Detach & Reset Roof vent - turtle type - Plastic", "Install Roof vent - turtle type - Plastic"], 
             "R&R Roof vent - turtle type - Plastic"),
            (["Detach & Reset Roof vent - turtle type - Metal", "Install Roof vent - turtle type - Metal"], 
             "R&R Roof vent - turtle type - Metal"),
            
            # Off ridge vents
            (["Detach & Reset Roof vent - off ridge type - 8'", "Install Roof vent - off ridge type - 8'"], 
             "R&R Roof vent - off ridge type - 8'"),
            (["Detach & Reset Roof vent - off ridge type - 6'", "Install Roof vent - off ridge type - 6'"], 
             "R&R Roof vent - off ridge type - 6'"),
            (["Detach & Reset Roof vent - off ridge type - 4'", "Install Roof vent - off ridge type - 4'"], 
             "R&R Roof vent - off ridge type - 4'"),
            (["Detach & Reset Roof vent - off ridge type - 2'", "Install Roof vent - off ridge type - 2'"], 
             "R&R Roof vent - off ridge type - 2'"),
            
            # Dormer and turbine vents
            (["Detach & Reset Roof vent - dormer type - Metal", "Install Roof vent - dormer type - Metal"], 
             "R&R Roof vent - dormer type - Metal"),
            (["Detach & Reset Roof vent - turbine type", "Install Roof vent - turbine type"], 
             "R&R Roof vent - turbine type"),
            
            # Power attic vents
            (["Detach & Reset Roof mount power attic vent - Large", "Install Roof mount power attic vent - Large"], 
             "R&R Roof mount power attic vent - Large"),
            (["Detach & Reset Roof mount power attic vent", "Install Roof mount power attic vent"], 
             "R&R Roof mount power attic vent"),
            
            # Exhaust caps
            (["Detach & Reset Exhaust cap - through roof - up to 4\"", "Install Exhaust cap - through roof - up to 4\""], 
             "R&R Exhaust cap - through roof - up to 4\""),
            (["Detach & Reset Exhaust cap - through roof - 6\" to 8\"", "Install Exhaust cap - through roof - 6\" to 8\""], 
             "R&R Exhaust cap - through roof - 6\" to 8\""),
            
            # Power attic vent covers
            (["Detach & Reset Power attic vent cover only - metal", "Install Power attic vent cover only - metal"], 
             "R&R Power attic vent cover only - metal"),
            (["Detach & Reset Power attic vent cover only - plastic", "Install Power attic vent cover only - plastic"], 
             "R&R Power attic vent cover only - plastic"),
            
            # Flashing items
            (["Install Counterflashing - Apron flashing"], 
             "R&R Counterflashing - Apron flashing"),
            (["Install Valley metal"], 
             "R&R Valley metal"),
            (["Install Valley metal - (W) profile"], 
             "R&R Valley metal - (W) profile"),
            (["Install Furnace vent - rain cap and storm collar, 6\""], 
             "R&R Furnace vent - rain cap and storm collar, 6\""),
            (["Install Flashing - rain diverter"], 
             "R&R Flashing - rain diverter"),
            (["Install Flashing - kick-out diverter"], 
             "R&R Flashing - kick-out diverter"),
            (["Install Flashing - pipe jack - copper"], 
             "R&R Flashing - pipe jack - copper"),
            (["Install Flashing - pipe jack - lead"], 
             "R&R Flashing - pipe jack - lead"),
            (["Install Flashing - pipe jack - 6\""], 
             "R&R Flashing - pipe jack - 6\""),
            (["Install Flashing - pipe jack - 8\""], 
             "R&R Flashing - pipe jack - 8\""),
            (["Install Flashing - pipe jack - split boot"], 
             "R&R Flashing - pipe jack - split boot"),
            (["Install Flashing - pipe jack"], 
             "R&R Flashing - pipe jack"),
            
            # Rain caps
            (["Install Rain cap - 10\""], 
             "R&R Rain cap - 10\""),
            (["Install Rain cap - 12\""], 
             "R&R Rain cap - 12\""),
            (["Install Rain cap - 4\" to 5\""], 
             "R&R Rain cap - 4\" to 5\""),
            (["Install Rain cap - 6\""], 
             "R&R Rain cap - 6\""),
            (["Install Rain cap - 8\""], 
             "R&R Rain cap - 8\""),
            
            # Step flashing and aluminum
            (["Install Step flashing"], 
             "Step flashing"),
            (["Install Aluminum sidewall/endwall flashing - mill"], 
             "Aluminum sidewall/endwall flashing - mill finish"),
            (["Install Flashing, 14\" wide"], 
             "R&R Flashing, 14\" wide"),
            (["Install Flashing, 14\" wide - copper"], 
             "R&R Flashing, 14\" wide - copper"),
            (["Install Flashing, 20\" wide"], 
             "R&R Flashing, 20\" wide"),
            
            # Evaporative cooler
            (["Install Evaporative cooler - Detach & reset"], 
             "Evaporative cooler - Detach & reset"),
            
            # Chimney flashing
            (["Install Chimney flashing - small (24\" x 24\")"], 
             "R&R Chimney flashing - small (24\" x 24\")"),
            (["Install Chimney flashing - average (32\" x 36\")"], 
             "R&R Chimney flashing - average (32\" x 36\")"),
            (["Install Chimney flashing - large (32\" x 60\")"], 
             "R&R Chimney flashing - large (32\" x 60\")"),
            
            # Saddle/cricket
            (["Install Saddle or cricket - up to 25 SF"], 
             "Saddle or cricket - up to 25 SF"),
            (["Install Saddle or cricket - 26 to 50 SF"], 
             "Saddle or cricket - 26 to 50 SF"),
            
            # Skylight flashing kits
            (["Install Skylight flashing kit - dome"], 
             "R&R Skylight flashing kit - dome"),
            (["Install Skylight flashing kit - dome - High grade"], 
             "R&R Skylight flashing kit - dome - High grade"),
            (["Install Skylight flashing kit - dome - Large - High"], 
             "R&R Skylight flashing kit - dome - Large - High grade"),
            (["Install Skylight flashing kit - dome - Large"], 
             "R&R Skylight flashing kit - dome - Large"),
            (["Install Roof window step flashing kit"], 
             "R&R Roof window step flashing kit"),
            (["Install Roof window step flashing kit - Large"], 
             "R&R Roof window step flashing kit - Large"),
            
            # Gutter and drip edge
            (["Install Gutter / downspout - Detach & reset"], 
             "Gutter / downspout - Detach & reset"),
            (["Install Drip edge/gutter apron"], 
             "R&R Drip edge/gutter apron"),
            (["Install Drip edge"], 
             "R&R Drip edge"),
            (["Install Drip edge - copper"], 
             "R&R Drip edge - copper"),
        ]
        
        # Apply replacement rules
        replacements_made = 0
        for carrier_patterns, roof_master_desc in replacement_rules:
            for carrier_pattern in carrier_patterns:
                # Find items matching carrier pattern (partial match to handle variations)
                for item in line_items:
                    item_desc = item.get("description", "").strip()
                    
                    # Check for exact match or close match
                    if (item_desc == carrier_pattern or 
                        carrier_pattern in item_desc or 
                        item_desc in carrier_pattern):
                        
                        # Get the roof master macro data
                        macro_data = self.lookup_unit_price(roof_master_desc)
                        
                        if macro_data['unit_price'] > 0:
                            old_desc = item["description"]
                            old_price = item.get("unit_price", 0)
                            
                            # Replace with roof master description and pricing
                            item["description"] = roof_master_desc
                            item["unit_price"] = macro_data['unit_price']
                            item["unit"] = macro_data.get('unit', item.get("unit", "EA"))
                            
                            # Recalculate costs
                            self.update_item_costs(item)
                            
                            print(f"  ✅ REPLACED: '{old_desc}'")
                            print(f"     → '{roof_master_desc}'")
                            print(f"     Unit Price: ${old_price:.2f} → ${macro_data['unit_price']:.2f}")
                            print(f"     Unit: {item['unit']}")
                            
                            self.results.add_adjustment(
                                old_desc, 
                                item.get("quantity", 0), 
                                item.get("quantity", 0),
                                f"Replaced carrier item with Roof Master item: {roof_master_desc}"
                            )
                            replacements_made += 1
                            break  # Only replace first match for this pattern
        
        print(f"\n  📊 Total replacements made: {replacements_made}")
        
        # Note: The following items from user's request are NOT in the current Roof Master Macro CSV:
        # - Items 106b-131b (various skylight items)
        # - Gutter guard/screen
        # - Flue cap
        # - Skylight flashing kit - dome - High grade (102b)
        # - Skylight flashing kit - dome - Large - High grade (103b)
        # - Roof window step flashing kit (105b)
        # - Roof window step flashing kit - Large (107b)
        # These would need to be added to the roof_master_macro.csv file first
        
        if replacements_made == 0:
            print(f"  ℹ️  No carrier estimate items found that match replacement patterns")

        return line_items

    def process_claim(self, line_items: List[Dict[str, Any]], roof_measurements: Dict[str, Any]) -> Dict[str, Any]:
        """Process the claim with all adjustment rules."""
        
        # DEBUG: Print detailed input information
        print("\n" + "="*80)
        print("🐍 PYTHON RULE ENGINE - DEBUG OUTPUT")
        print("="*80)
        
        print(f"\n📊 INPUT DATA SUMMARY:")
        print(f"  Line Items Count: {len(line_items)}")
        print(f"  Roof Measurements Keys: {len(roof_measurements.keys())}")
        
        print(f"\n📋 LINE ITEMS DETAILS:")
        print(f"  Total Line Items: {len(line_items)}")
        for i, item in enumerate(line_items):  # Show ALL items
            print(f"  Item {i+1}:")
            print(f"    Line Number: {item.get('line_number', 'N/A')}")
            print(f"    Description: {item.get('description', 'NO DESCRIPTION')}")
            print(f"    Quantity: {item.get('quantity', 'N/A')}")
            print(f"    Unit: {item.get('unit', 'N/A')}")
            print(f"    Unit Price: ${item.get('unit_price', 'N/A')}")
            print(f"    RCV: ${item.get('RCV', 'N/A')}")
            print(f"    ACV: ${item.get('ACV', 'N/A')}")
            print(f"    Location: {item.get('location_room', 'N/A')}")
            print(f"    Category: {item.get('category', 'N/A')}")
            print(f"    ---")
        
        print(f"\n🏠 ROOF MEASUREMENTS DETAILS:")
        print(f"  Total Roof Measurements Available: {len(roof_measurements)}")
        
        # Show ALL roof measurements
        for key, value in roof_measurements.items():
            if isinstance(value, dict) and 'value' in value:
                print(f"  {key}: {value['value']}")
            else:
                print(f"  {key}: {value}")
        
        print(f"\n📐 KEY METRICS SUMMARY:")
        key_metrics = [
            "Total Roof Area", "Total Eaves Length", "Total Rakes Length", 
            "Total Ridges/Hips Length", "Total Valleys Length",
            "Total Step Flashing Length", "Total Flashing Length",
            "Total Line Lengths (Ridges)", "Total Line Lengths (Hips)"
        ]
        
        for key in key_metrics:
            value = self.get_metric(roof_measurements, key)
            print(f"  {key}: {value}")
        
        print(f"\n📐 PITCH AREAS:")
        pitch_areas = [
            "Area for Pitch 1/12 (sq ft)", "Area for Pitch 2/12 (sq ft)", "Area for Pitch 3/12 (sq ft)",
            "Area for Pitch 4/12 (sq ft)", "Area for Pitch 5/12 (sq ft)", "Area for Pitch 6/12 (sq ft)", 
            "Area for Pitch 7/12 (sq ft)", "Area for Pitch 8/12 (sq ft)", "Area for Pitch 9/12 (sq ft)",
            "Area for Pitch 10/12 (sq ft)", "Area for Pitch 11/12 (sq ft)", "Area for Pitch 12/12 (sq ft)", 
            "Area for Pitch 12/12+ (sq ft)"
        ]
        
        for pitch in pitch_areas:
            value = self.get_metric(roof_measurements, pitch)
            print(f"  {pitch}: {value}")
        
        print(f"\n🔍 RAW ROOF MEASUREMENTS STRUCTURE:")
        print(f"  Type: {type(roof_measurements)}")
        print(f"  All Keys: {list(roof_measurements.keys())}")
        if roof_measurements:
            print(f"  Sample entries:")
            for i, (key, value) in enumerate(list(roof_measurements.items())[:3]):
                print(f"    '{key}' -> {value} (type: {type(value)})")
        
        # Create a copy of line items for processing
        adjusted_line_items = copy.deepcopy(line_items)
        
        print(f"\n⚙️ PROCESSING STARTED...")
        print(f"  Processing {len(adjusted_line_items)} line items...")
        print(f"  Roof measurements: {self.get_metric(roof_measurements, 'Total Roof Area')} sq ft total area")
        
        # Apply all rules
        adjusted_line_items = self.apply_logic(adjusted_line_items, roof_measurements)
        
        print(f"\n✅ PROCESSING COMPLETED!")
        print(f"  Final line items count: {len(adjusted_line_items)}")
        print(f"  Adjustments made: {len(self.results.adjustments)}")
        print(f"  Items added: {len(self.results.additions)}")
        print(f"  Warnings: {len(self.results.warnings)}")
        
        print(f"\n📊 FINAL DEBUG SUMMARY:")
        print(f"  Total Roof Area Used: {self.get_metric(roof_measurements, 'Total Roof Area')} sq ft")
        print(f"  Total Eaves Length Used: {self.get_metric(roof_measurements, 'Total Eaves Length')} ft")
        print(f"  Total Rakes Length Used: {self.get_metric(roof_measurements, 'Total Rakes Length')} ft")
        print(f"  Total Ridges/Hips Length Used: {self.get_metric(roof_measurements, 'Total Ridges/Hips Length')} ft")
        print(f"  Total Valleys Length Used: {self.get_metric(roof_measurements, 'Total Valleys Length')} ft")
        
        # Show which adjustments were made
        if self.results.adjustments:
            print(f"\n🔧 ADJUSTMENTS MADE:")
            for i, adj in enumerate(self.results.adjustments):
                print(f"  {i+1}. {adj['description']}: {adj['old_quantity']} → {adj['new_quantity']}")
                print(f"     Reason: {adj['reason']}")
        
        # Show which items were added
        if self.results.additions:
            print(f"\n➕ ITEMS ADDED:")
            for i, add in enumerate(self.results.additions):
                print(f"  {i+1}. {add['description']}: {add['quantity']} {add.get('unit', 'SQ')}")
                print(f"     Reason: {add['reason']}")
        
        # Show warnings
        if self.results.warnings:
            print(f"\n⚠️ WARNINGS:")
            for i, warn in enumerate(self.results.warnings):
                print(f"  {i+1}. {warn['description']}")
                print(f"     Reason: {warn['reason']}")
        
        print(f"\n" + "="*80)
        print("🐍 PYTHON RULE ENGINE - DEBUG OUTPUT COMPLETE")
        print("="*80)
        
        return {
            'original_line_items': line_items,
            'adjusted_line_items': adjusted_line_items,
            'adjustment_results': {
                'adjustments': self.results.adjustments,
                'additions': self.results.additions,
                'warnings': self.results.warnings,
                'summary': self.results.summary
            },
            'roof_measurements': {
                'total_roof_area': self.get_metric(roof_measurements, 'Total Roof Area'),
                'total_eaves_length': self.get_metric(roof_measurements, 'Total Eaves Length'),
                'total_rakes_length': self.get_metric(roof_measurements, 'Total Rakes Length'),
                'total_ridges_hips_length': self.get_metric(roof_measurements, 'Total Ridges/Hips Length'),
                'total_valleys_length': self.get_metric(roof_measurements, 'Total Valleys Length'),
                'steep_roof_areas': {
                    '7_12_to_9_12': self.get_metric(roof_measurements, 'Area for Pitch 7/12 (sq ft)') + 
                                   self.get_metric(roof_measurements, 'Area for Pitch 8/12 (sq ft)') + 
                                   self.get_metric(roof_measurements, 'Area for Pitch 9/12 (sq ft)'),
                    '10_12_to_12_12': self.get_metric(roof_measurements, 'Area for Pitch 10/12 (sq ft)') + 
                                     self.get_metric(roof_measurements, 'Area for Pitch 11/12 (sq ft)') + 
                                     self.get_metric(roof_measurements, 'Area for Pitch 12/12 (sq ft)'),
                    '12_12_plus': self.get_metric(roof_measurements, 'Area for Pitch 12/12+ (sq ft)')
                }
            }
        }


def load_line_items(file_path: str) -> List[Dict[str, Any]]:
    """Load line items from JSON file."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and 'line_items' in data:
            return data['line_items']
        else:
            raise ValueError("Invalid line items format")
            
    except Exception as e:
        print(f"Error loading line items: {e}")
        sys.exit(1)


def load_roof_measurements(file_path: str) -> Dict[str, Any]:
    """Load roof measurements from JSON file."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        if isinstance(data, dict):
            return data
        else:
            raise ValueError("Invalid roof measurements format")
            
    except Exception as e:
        print(f"Error loading roof measurements: {e}")
        sys.exit(1)


def load_combined_data(file_path: str) -> tuple:
    """Load combined data from JSON file."""
    try:
        print(f"\n🔍 DEBUG: Loading data from {file_path}")
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        print(f"📊 DEBUG: Raw data structure:")
        print(f"  Type: {type(data)}")
        print(f"  Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
        
        # Extract line items
        line_items_data = data.get('line_items', [])
        line_items = line_items_data
        print(f"📋 DEBUG: Line items extracted: {len(line_items)} items")
        
        # Extract roof measurements
        roof_data = data.get('roof_measurements', {})
        roof_measurements = roof_data
        print(f"🏠 DEBUG: Roof measurements extracted: {len(roof_measurements)} keys")
        
        return line_items, roof_measurements
        
    except Exception as e:
        print(f"❌ ERROR loading combined data: {e}")
        print(f"  File path: {file_path}")
        print(f"  Error type: {type(e).__name__}")
        sys.exit(1)


def print_results(results: Dict[str, Any]):
    """Print formatted results."""
    
    print("\n" + "="*80)
    print("ROOF ADJUSTMENT ENGINE RESULTS")
    print("="*80)
    
    # Summary
    summary = results['adjustment_results']['summary']
    print(f"\nSUMMARY:")
    print(f"  📝 Quantity Adjustments: {summary['total_adjustments']}")
    print(f"  ➕ Items Added: {summary['total_additions']}")
    print(f"  ⚠️  Warnings: {summary['total_warnings']}")
    print(f"  💰 Estimated Savings: ${summary['estimated_savings']:,.2f}")
    
    # Roof measurements used
    roof_data = results['roof_measurements']
    print(f"\nROOF MEASUREMENTS USED:")
    print(f"  📏 Total Roof Area: {roof_data['total_roof_area']:.2f} sq ft")
    print(f"  📏 Total Eaves Length: {roof_data['total_eaves_length']:.2f} ft")
    print(f"  📏 Total Rakes Length: {roof_data['total_rakes_length']:.2f} ft")
    print(f"  📏 Total Ridges/Hips Length: {roof_data['total_ridges_hips_length']:.2f} ft")
    print(f"  📏 Total Valleys Length: {roof_data['total_valleys_length']:.2f} ft")
    
    steep_areas = roof_data['steep_roof_areas']
    print(f"\nSTEEP ROOF AREAS:")
    print(f"  📐 7/12 to 9/12 slope: {steep_areas['7_12_to_9_12']:.2f} sq ft")
    print(f"  📐 10/12 to 12/12 slope: {steep_areas['10_12_to_12_12']:.2f} sq ft")
    print(f"  📐 12/12+ slope: {steep_areas['12_12_plus']:.2f} sq ft")
    
    # Adjustments
    adjustments = results['adjustment_results']['adjustments']
    if adjustments:
        print(f"\n🔧 QUANTITY ADJUSTMENTS:")
        for adj in adjustments:
            print(f"  • {adj['description']}")
            print(f"    Old: {adj['old_quantity']:.2f} → New: {adj['new_quantity']:.2f}")
            print(f"    Reason: {adj['reason']}")
            print(f"    Savings: ${adj['savings']:,.2f}")
            print()
    
    # Additions
    additions = results['adjustment_results']['additions']
    if additions:
        print(f"\n➕ ITEMS ADDED:")
        for add in additions:
            print(f"  • {add['description']}")
            print(f"    Quantity: {add['quantity']:.2f}")
            print(f"    Reason: {add['reason']}")
            print()
    
    # Warnings
    warnings = results['adjustment_results']['warnings']
    if warnings:
        print(f"\n⚠️  WARNINGS:")
        for warn in warnings:
            print(f"  • {warn['description']}")
            print(f"    Reason: {warn['reason']}")
            print()


def main():
    """Main function."""
    print(f"\n🚀 PYTHON RULE ENGINE STARTING...")
    print(f"  Python version: {sys.version}")
    print(f"  Working directory: {os.getcwd()}")
    
    parser = argparse.ArgumentParser(description='Insurance Claim Roof Adjustment Engine')
    parser.add_argument('--line-items', help='Path to line items JSON file')
    parser.add_argument('--roof-data', help='Path to roof measurements JSON file')
    parser.add_argument('--input', help='Path to combined input JSON file')
    parser.add_argument('--output', help='Path to output JSON file (optional)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    print(f"\n📋 COMMAND LINE ARGUMENTS:")
    print(f"  Input file: {args.input}")
    print(f"  Line items file: {args.line_items}")
    print(f"  Roof data file: {args.roof_data}")
    print(f"  Output file: {args.output}")
    print(f"  Verbose: {args.verbose}")
    
    if not args.input and not (args.line_items and args.roof_data):
        parser.error("Either --input or both --line-items and --roof-data must be specified")
    
    try:
        # Load data
        if args.input:
            print(f"\n📁 Loading combined data from: {args.input}")
            line_items, roof_measurements = load_combined_data(args.input)
        else:
            print(f"\n📁 Loading separate files:")
            print(f"  Line items: {args.line_items}")
            print(f"  Roof data: {args.roof_data}")
            line_items = load_line_items(args.line_items)
            roof_measurements = load_roof_measurements(args.roof_data)
        
        print(f"\n✅ DATA LOADED SUCCESSFULLY")
        print(f"  Line items: {len(line_items)}")
        print(f"  Roof measurements: {len(roof_measurements)} keys")
        
        # Process claim
        print(f"\n⚙️ STARTING CLAIM PROCESSING...")
        engine = RoofAdjustmentEngine()
        results = engine.process_claim(line_items, roof_measurements)
        
        print(f"\n🎉 PROCESSING COMPLETED SUCCESSFULLY!")
        
        # Print results
        if args.verbose:
            print_results(results)
        
        # Save results if output file specified
        if args.output:
            print(f"\n💾 SAVING RESULTS TO: {args.output}")
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"✅ Results saved successfully")
        
        return results
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        print(f"  Error type: {type(e).__name__}")
        import traceback
        print(f"  Traceback:")
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()