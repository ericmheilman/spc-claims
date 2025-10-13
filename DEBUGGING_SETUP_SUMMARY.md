# 🐛 Python Script Debugging Setup - Complete

## Overview

I've successfully configured the Python script (`roof_adjustment_engine.py`) with comprehensive debugging output to help you troubleshoot any execution issues. The script now provides detailed information about data processing, rule execution, and error handling.

## 🔍 **Debugging Features Added**

### **1. Startup Information**
```
🚀 PYTHON RULE ENGINE STARTING...
  Python version: 3.8.9 (default, Jul 19 2021, 09:37:30)
  Working directory: /Users/ericheilman/spc-claims

📋 COMMAND LINE ARGUMENTS:
  Input file: test_debug_data.json
  Line items file: None
  Roof data file: None
  Output file: test_debug_results.json
  Verbose: True
```

### **2. Data Loading Debug**
```
📁 Loading combined data from: test_debug_data.json

🔍 DEBUG: Loading data from test_debug_data.json
📊 DEBUG: Raw data structure:
  Type: <class 'dict'>
  Keys: ['line_items', 'roof_measurements']
📋 DEBUG: Line items extracted: 2 items
🏠 DEBUG: Roof measurements extracted: 8 keys

✅ DATA LOADED SUCCESSFULLY
  Line items: 2
  Roof measurements: 8 keys
```

### **3. Input Data Analysis**
```
📊 INPUT DATA SUMMARY:
  Line Items Count: 2
  Roof Measurements Keys: 8

📋 LINE ITEMS DETAILS:
  Item 1: Remove 3 tab - 25 yr. - composition shingle roofin...
    Line: 1, Qty: 19.67, Unit: SQ
  Item 2: 3 tab 25 yr. comp. shingle roofing - w/out felt...
    Line: 3, Qty: 24.33, Unit: SQ

🏠 ROOF MEASUREMENTS DETAILS:
  Total Roof Area: 1902
  Total Eaves Length: 220
  Total Rakes Length: 12
  Total Ridges/Hips Length: 164
  Total Valleys Length: 17
  Total Step Flashing Length: 41
  Total Flashing Length: 4

📐 PITCH AREAS:
  Area for Pitch 8/12 (sq ft): 5.6

🔍 RAW ROOF MEASUREMENTS STRUCTURE:
  Type: <class 'dict'>
  Keys: ['Total Roof Area', 'Total Eaves Length', ...]
  Sample entry: 'Total Roof Area' -> {'value': 1902} (type: <class 'dict'>)
```

### **4. Variable Extraction & Calculations**
```
📊 EXTRACTED METRICS:
  Total Roof Area: 1902
  Total Eaves Length: 220
  Total Rakes Length: 12
  Total Ridges/Hips Length: 164
  Total Valleys Length: 17
  Total Step Flashing Length: 41
  Total Flashing Length: 4
  Pitch 7/12: 0, Pitch 8/12: 5.6, Pitch 9/12: 0
  Pitch 10/12: 0, Pitch 11/12: 0, Pitch 12/12: 0
  Pitch 12/12+: 0

🧮 CALCULATED VALUES:
  Total Squares (Total Roof Area / 100): 19.02
  Starter Quantity ((Eaves + Rakes) / 100): 2.32
  Steep 7-9 Quantity: 0.055999999999999994
  Steep 10-12 Quantity: 0.0
  Steep 12+ Quantity: 0.0
  Ridges/Hips Quantity: 1.64
  Ridges Quantity: 0.0
  Valleys Quantity: 0.17
  Step Flashing Quantity: 0.41
  Flashing Quantity: 0.04
```

### **5. Rule Execution Details**
```
📝 RULE 1-4: Shingle Removal Quantity Adjustments
  ❌ Not found: Remove Laminated comp. shingle rfg. - w/out felt
  ❌ Not found: Remove 3 tab- 25 yr. comp. shingle roofing - w/out felt
  ❌ Not found: Remove 3 tab 25 yr. composition shingle roofing - incl. felt
  ❌ Not found: Remove Laminated comp. shingle rfg. - w/ felt

🏔️ RULE: Steep Roof 7/12-9/12 Charges
  Steep area total: 5.6 sq ft
  Calculated quantity: 0.055999999999999994
  ✅ Steep roof areas detected - applying rules
    ❌ Not found: Remove Additional charge for steep roof - 7/12 to 9/12 slope - ADDING NEW ITEM
    ❌ Not found: Additional charge for steep roof - 7/12 to 9/12 slope - ADDING NEW ITEM
```

### **6. Error Handling & Traceback**
```
❌ FATAL ERROR: [Error message]
  Error type: [Error type]
  Traceback:
  [Full Python traceback]
```

### **7. API Endpoint Debug Logging**
The API endpoint (`/api/run-python-rules`) now logs all Python script output to the console:
```typescript
pythonProcess.stdout.on('data', (data) => {
  const output = data.toString();
  stdout += output;
  // Log debug output to console for troubleshooting
  console.log('Python stdout:', output);
});

pythonProcess.stderr.on('data', (data) => {
  const error = data.toString();
  stderr += error;
  // Log debug output to console for troubleshooting
  console.error('Python stderr:', error);
});
```

## 🚀 **How to Use Debugging**

### **1. Standalone Python Script**
```bash
python3 roof_adjustment_engine.py --input your_data.json --verbose
```

### **2. Via API Endpoint**
- Click the "🐍 Python Rule Engine" button in your web app
- Check the server console/logs for detailed Python script output
- All debug information will be logged to the console

### **3. Command Line Testing**
```bash
# Test with sample data
python3 roof_adjustment_engine.py --input sample_data.json --verbose

# Test with separate files
python3 roof_adjustment_engine.py --line-items line_items.json --roof-data roof_data.json --verbose
```

## 🔍 **What to Look For**

### **Data Issues:**
- **Line items count**: Should match your expected number of items
- **Roof measurements keys**: Should contain all required measurements
- **Data types**: Check if values are being extracted correctly
- **Missing fields**: Look for ❌ "Not found" messages

### **Calculation Issues:**
- **Extracted metrics**: Verify all roof measurements are being read
- **Calculated values**: Check if formulas are producing expected results
- **Zero values**: Identify if any required measurements are missing

### **Rule Execution Issues:**
- **Item matching**: See which line items are found/not found
- **Rule triggers**: Check if conditions are being met
- **Quantity adjustments**: Verify if quantities are being changed correctly

### **Error Issues:**
- **File loading errors**: Check file paths and JSON format
- **Processing errors**: Look for Python exceptions and tracebacks
- **API errors**: Check server console for Python script output

## 📊 **Example Debug Output**

The script now shows exactly what's happening at each step:

1. **What data is loaded** (line items and roof measurements)
2. **What variables are extracted** from your data format
3. **What calculations are performed** (quantities, areas, etc.)
4. **Which rules are applied** and why
5. **What items are found/not found** in the line items
6. **What adjustments are made** and their reasons
7. **What items are added** and why
8. **Any errors that occur** with full traceback information

## ✅ **Ready for Troubleshooting**

The Python script is now fully instrumented for debugging. When you encounter issues:

1. **Check the console output** for detailed processing information
2. **Look for ❌ error indicators** showing what's not working
3. **Verify data extraction** to ensure your format is being read correctly
4. **Check rule execution** to see which rules are being applied
5. **Review calculations** to ensure formulas are working as expected

This debugging setup will help you identify exactly where and why the Python script isn't executing properly! 🐛🔍
