# Roof Adjustment Engine

A comprehensive Python script that analyzes insurance claim line items and roof measurements to automatically apply industry-standard adjustments based on roof geometry and material specifications.

## Features

This script implements **60+ adjustment rules** covering:

- **Shingle Quantity Rules**: Adjusts quantities based on Total Roof Area / 100
- **Rounding Rules**: Laminated shingles (0.25), 3-tab shingles (0.33)
- **Starter Strip Rules**: Adds missing starter strips or adjusts quantities
- **Ridge/Hip Cap Rules**: Ensures proper ridge vent and cap quantities
- **Steep Roof Charges**: Calculates charges for 7/12-9/12, 10/12-12/12, and 12/12+ slopes
- **Flashing Rules**: Drip edge, step flashing, aluminum flashing adjustments
- **Valley Metal Rules**: Proper valley metal quantities
- **Ridge Vent Rules**: Continuous ridge vent adjustments
- **Complex Combination Rules**: Handles multiple material combinations

## Installation

No additional dependencies required - uses only Python standard library.

```bash
# Make the script executable
chmod +x roof_adjustment_engine.py
```

## Usage

### Option 1: Combined Input File
```bash
python roof_adjustment_engine.py --input sample_data.json --output results.json
```

### Option 2: Separate Files
```bash
python roof_adjustment_engine.py --line-items line_items.json --roof-data roof_data.json --output results.json
```

### Option 3: Verbose Output
```bash
python roof_adjustment_engine.py --input sample_data.json --verbose
```

## Input Data Format

### Line Items Format
```json
{
  "line_items": [
    {
      "line_number": "1",
      "description": "Remove 3 tab - 25 yr. composition shingle roofing incl. felt",
      "quantity": 19.67,
      "unit": "SQ",
      "unit_price": 65.04,
      "RCV": 1279.34,
      "age_life": "14/25 yrs",
      "condition": "Avg.",
      "dep_percent": null,
      "depreciation_amount": 0,
      "ACV": 1279.34,
      "location_room": "Dwelling Roof",
      "category": "Roof"
    }
  ]
}
```

### Roof Measurements Format
```json
{
  "roof_measurements": {
    "totalArea": 2500,
    "netArea": 2300,
    "grossArea": 2500,
    "eaveLength": 120,
    "rakeLength": 80,
    "ridgeLength": 40,
    "hipLength": 20,
    "valleyLength": 30,
    "stepFlashingLength": 15,
    "flashingLength": 25,
    "areaPitch7_12": 500,
    "areaPitch8_12": 300,
    "areaPitch9_12": 200,
    "areaPitch10_12": 100,
    "areaPitch11_12": 50,
    "areaPitch12_12": 25,
    "areaPitch12_12Plus": 10
  }
}
```

## Output Format

The script produces detailed results including:

- **Original Line Items**: Input data unchanged
- **Adjusted Line Items**: Line items with applied adjustments
- **Adjustment Results**: Detailed log of all changes made
- **Roof Measurements**: Summary of roof variables used

### Sample Output
```
================================================================================
ROOF ADJUSTMENT ENGINE RESULTS
================================================================================

SUMMARY:
  📝 Quantity Adjustments: 3
  ➕ Items Added: 1
  ⚠️  Warnings: 0
  💰 Estimated Savings: $1,234.56

ROOF MEASUREMENTS USED:
  📏 Total Roof Area: 2500.00 sq ft
  📏 Total Eaves Length: 120.00 ft
  📏 Total Rakes Length: 80.00 ft
  📏 Total Ridges/Hips Length: 60.00 ft
  📏 Total Valleys Length: 30.00 ft

🔧 QUANTITY ADJUSTMENTS:
  • Remove 3 tab - 25 yr. composition shingle roofing incl. felt
    Old: 19.67 → New: 25.00
    Reason: Quantity should equal Total Roof Area / 100 (25.00)
    Savings: $346.80

➕ ITEMS ADDED:
  • Asphalt starter - universal starter course
    Quantity: 2.00
    Reason: Added missing starter strip based on roof measurements
```

## Key Rules Implemented

### 1. Shingle Quantity Rules (Rules 1-8)
- Ensures shingle quantities equal Total Roof Area / 100
- Applies to both remove and install shingle line items
- Uses max() function to only increase quantities

### 2. Rounding Rules (Rules 9-16)
- Laminated shingles: Round up to nearest 0.25
- 3-tab shingles: Round up to nearest 0.33
- Only rounds if not already properly rounded

### 3. Starter Strip Rules (Rules 17-22, 33-34)
- Adds missing starter strips based on eaves + rakes length
- Adjusts existing starter strip quantities
- Defaults to "universal starter course" if none present

### 4. Steep Roof Charges (Rules 23-32)
- Calculates charges for steep roof areas
- 7/12-9/12: Combined area / 100
- 10/12-12/12: Combined area / 100
- 12/12+: Area / 100

### 5. Flashing Rules (Rules 37-41)
- Drip edge: (Eaves + Rakes) / 100
- Step flashing: Step Flashing Length / 100
- Aluminum flashing: Flashing Length / 100

### 6. Valley Metal Rules (Rules 42-43)
- Valley metal: Valleys Length / 100
- Applies to both standard and W-profile valley metal

### 7. Ridge Vent Rules (Rules 44-45)
- Ridge vents: Ridges/Hips Length / 100
- Applies to aluminum and shingle-over styles

### 8. Complex Combination Rules (Rules 46-60)
- Handles multiple material combinations
- Ensures proper hip/ridge caps with ridge vents
- Special rules for 3-tab vs laminated shingles

## Error Handling

The script includes comprehensive error handling for:
- Invalid JSON format
- Missing required fields
- Malformed data structures
- File I/O errors

## Integration

This script can be easily integrated into:
- Insurance claim processing workflows
- Roof measurement software
- Xactimate integration systems
- Automated claim adjustment systems

## Testing

Test the script with the provided sample data:

```bash
python roof_adjustment_engine.py --input sample_data.json --verbose
```

This will process the sample claim and show all adjustments made according to the rules.

## License

This script is part of the SPC Claims Carrier Network system.
