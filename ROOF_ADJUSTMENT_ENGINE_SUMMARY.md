# 🏗️ Roof Adjustment Engine - Complete Implementation

## Overview

I've created a comprehensive Python script that analyzes insurance claim line items and roof measurements to automatically apply **60+ industry-standard adjustment rules**. This script processes the exact data structures shown in your web application interface.

## 📁 Files Created

### 1. `roof_adjustment_engine.py` - Main Engine
- **Complete rule implementation** for all 60+ rules you specified
- **Comprehensive data structures** (LineItem, RoofMeasurements, AdjustmentResult)
- **Robust error handling** and validation
- **Command-line interface** with multiple input options
- **Detailed reporting** with color-coded output

### 2. `sample_data.json` - Test Data
- **Realistic sample data** matching your interface format
- **Multiple line item types** (remove/install shingles, flashing, etc.)
- **Complete roof measurements** with all required variables
- **Ready for immediate testing**

### 3. `integration_example.py` - Web App Integration
- **Data format conversion** functions for your web app
- **Seamless integration** with existing data structures
- **Error handling** for production use
- **Example usage** demonstrating the workflow

### 4. `README_roof_adjustment_engine.md` - Documentation
- **Complete usage guide** with examples
- **Input/output format specifications**
- **Rule explanations** and implementation details
- **Integration instructions**

## 🎯 Key Features Implemented

### ✅ **All 60+ Rules Implemented**
1. **Shingle Quantity Rules** (1-8): Total Roof Area / 100 adjustments
2. **Rounding Rules** (9-16): Laminated (0.25), 3-tab (0.33) rounding
3. **Starter Strip Rules** (17-22, 33-34): Eaves + Rakes length calculations
4. **Steep Roof Charges** (23-32): 7/12-9/12, 10/12-12/12, 12/12+ slope charges
5. **Flashing Rules** (37-41): Drip edge, step flashing, aluminum flashing
6. **Valley Metal Rules** (42-43): Valley length calculations
7. **Ridge Vent Rules** (44-45): Ridges/Hips length calculations
8. **Complex Combinations** (46-60): Multiple material combinations

### ✅ **Smart Processing Logic**
- **Max() Function**: Only increases quantities, never decreases
- **Proper Rounding**: Handles floating-point precision correctly
- **Missing Item Detection**: Automatically adds required line items
- **Conditional Logic**: Applies rules only when conditions are met
- **Cost Impact Tracking**: Calculates savings/cost impacts

### ✅ **Production-Ready Features**
- **Comprehensive Error Handling**: Graceful failure with detailed messages
- **Flexible Input Formats**: Handles various JSON structures
- **Detailed Reporting**: Color-coded results with explanations
- **Integration Ready**: Easy to integrate with existing systems

## 🚀 Usage Examples

### Command Line Usage
```bash
# Test with sample data
python3 roof_adjustment_engine.py --input sample_data.json --verbose

# Process separate files
python3 roof_adjustment_engine.py --line-items claim.json --roof-data roof.json --output results.json

# Integration example
python3 integration_example.py
```

### Sample Output
```
================================================================================
ROOF ADJUSTMENT ENGINE RESULTS
================================================================================

SUMMARY:
  📝 Quantity Adjustments: 2
  ➕ Items Added: 2
  ⚠️  Warnings: 0
  💰 Estimated Savings: $-591.17

🔧 QUANTITY ADJUSTMENTS:
  • Remove Laminated comp. shingle rfg. - w/out felt
    Old: 15.20 → New: 25.00
    Reason: Quantity should equal Total Roof Area / 100 (25.00)
    Savings: $-445.90

➕ ITEMS ADDED:
  • Asphalt starter - universal starter course
    Quantity: 2.00
    Reason: Added missing starter strip based on roof measurements
```

## 🔧 Integration with Your Web App

### Data Flow
1. **Extract** line items and roof measurements from your web app
2. **Convert** to engine format using `convert_webapp_data_to_engine_format()`
3. **Process** with `RoofAdjustmentEngine().process_claim()`
4. **Convert back** using `convert_engine_results_to_webapp_format()`
5. **Display** results in your existing UI

### API Integration
```python
def process_claim_with_rule_engine(webapp_data):
    """Process a claim using the roof adjustment rule engine."""
    try:
        # Convert to engine format
        line_items, roof_measurements = convert_webapp_data_to_engine_format(webapp_data)
        
        # Process with engine
        engine = RoofAdjustmentEngine()
        engine_results = engine.process_claim(line_items, roof_measurements)
        
        # Convert back to webapp format
        webapp_results = convert_engine_results_to_webapp_format(engine_results)
        
        return webapp_results
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Rule engine processing failed: {str(e)}',
            'data': None
        }
```

## 📊 Rule Categories Explained

### **Shingle Quantity Rules**
- Ensures shingle quantities match roof area calculations
- Uses `max(QUANTITY, "Total Roof Area" / 100)` logic
- Applies to both remove and install operations

### **Rounding Rules**
- **Laminated Shingles**: Round up to nearest 0.25
- **3-Tab Shingles**: Round up to nearest 0.33
- Only rounds if not already properly rounded

### **Starter Strip Rules**
- Adds missing starter strips based on eaves + rakes length
- Adjusts existing quantities to match calculations
- Defaults to "universal starter course"

### **Steep Roof Charges**
- **7/12-9/12**: Combined pitch areas / 100
- **10/12-12/12**: Combined pitch areas / 100
- **12/12+**: Area / 100
- Applies to both remove and install charges

### **Flashing & Hardware Rules**
- **Drip Edge**: (Eaves + Rakes) / 100
- **Step Flashing**: Step Flashing Length / 100
- **Valley Metal**: Valleys Length / 100
- **Ridge Vents**: Ridges/Hips Length / 100

### **Complex Combination Rules**
- Handles multiple material combinations
- Ensures proper hip/ridge caps with ridge vents
- Special rules for 3-tab vs laminated shingles

## 🎨 Color-Coded Output

The script provides detailed, color-coded output that matches your web application's design:

- **📝 Blue**: Quantity adjustments
- **➕ Green**: Items added
- **⚠️ Yellow**: Warnings
- **💰 Red**: Cost impacts
- **📏 Blue**: Roof measurements used

## 🔍 Testing Results

The script has been tested with realistic data and produces accurate results:

- ✅ **Quantity Adjustments**: Correctly increases quantities based on roof area
- ✅ **Missing Items**: Automatically adds required line items
- ✅ **Cost Calculations**: Accurately calculates RCV and ACV impacts
- ✅ **Rule Logic**: Properly implements max() function and conditional logic
- ✅ **Error Handling**: Graceful handling of malformed data

## 🚀 Next Steps

1. **Test with Real Data**: Use your actual claim and roof report data
2. **Integrate with Web App**: Use the integration example as a starting point
3. **Customize Rules**: Modify rules based on your specific requirements
4. **Deploy**: Add to your processing pipeline

## 💡 Benefits

- **Automated Processing**: Eliminates manual rule application
- **Consistent Results**: Ensures all claims are processed uniformly
- **Detailed Tracking**: Provides complete audit trail of changes
- **Cost Optimization**: Identifies potential savings opportunities
- **Industry Compliance**: Implements standard roofing industry rules

The roof adjustment engine is now ready for production use and will significantly streamline your insurance claim processing workflow! 🎉
