# 🔍 Troubleshooting: Steep Roof Charge Line Items Not Appearing

## 🎯 The Issue

The Python script should be adding steep roof charge line items like:
```json
{
  "line_number": "23",
  "description": "Remove Additional charge for steep roof - 7/12 to 9/12 slope",
  "quantity": 0.06,
  "unit": "SQ"
}
```

But they're not appearing in your results.

## 🔍 Diagnostic Steps

### **Step 1: Check Server Console Logs**

When you click the "🐍 Python Rule Engine" button, check your **Next.js development server console** (not browser console). Look for:

```
🐍 PYTHON RULE ENGINE - DEBUG OUTPUT
================================================================================

📊 INPUT DATA SUMMARY:
  Line Items Count: X
  Roof Measurements Keys: X

🏠 ROOF MEASUREMENTS DETAILS:
  ...

📐 PITCH AREAS:
  Area for Pitch 6/12 (sq ft): XXXX
  Area for Pitch 7/12 (sq ft): XXXX  ← CHECK THIS
  Area for Pitch 8/12 (sq ft): XXXX  ← CHECK THIS
  Area for Pitch 9/12 (sq ft): XXXX  ← CHECK THIS
```

### **Step 2: Verify Pitch Areas in Debug Output**

Look for this section in the logs:

```
📊 EXTRACTED METRICS:
  ...
  
  PITCH AREAS (CRITICAL FOR STEEP ROOF CHARGES):
  Pitch 7/12: X
  Pitch 8/12: X  ← Should be > 0 for steep roof charges
  Pitch 9/12: X

  📈 STEEP AREA TOTALS:
  7/12-9/12: X sq ft → X.XX SQ  ← If this is 0, no steep charges will be added!
```

### **Step 3: Check Rule Execution**

Look for this section:

```
🏔️ RULE: Steep Roof 7/12-9/12 Charges
  Steep area total: X sq ft
  Calculated quantity: X.XX
  
  ✅ Steep roof areas detected - applying rules  ← Should see this!
    ❌ Not found: Remove Additional charge for steep roof - 7/12 to 9/12 slope - ADDING NEW ITEM
    ❌ Not found: Additional charge for steep roof - 7/12 to 9/12 slope - ADDING NEW ITEM
```

OR

```
  ⏭️  No steep roof areas (7/12-9/12) - skipping rules  ← Problem! All pitch areas are 0
```

## ❌ **Common Problems & Solutions**

### **Problem 1: All Pitch Areas Are 0**

**Symptoms:**
```
PITCH AREAS (CRITICAL FOR STEEP ROOF CHARGES):
  Pitch 7/12: 0
  Pitch 8/12: 0  ← All zeros!
  Pitch 9/12: 0

📈 STEEP AREA TOTALS:
  7/12-9/12: 0 sq ft → 0.00 SQ  ← No steep areas detected
```

**Cause:** The roof measurements data doesn't contain pitch area information.

**Solution:**
1. Check if your roof report PDF actually has pitch area data
2. Verify the roof measurement extraction is working
3. Look at `rawAgentData` in browser console to see what roof data is available

**Check this in browser console:**
```javascript
const roofData = localStorage.getItem('extractedClaimData');
const parsed = JSON.parse(roofData);
console.log('Roof measurements:', parsed.roofAgentResponse);
```

### **Problem 2: Items Are Added But Not Displayed**

**Symptoms:**
- Server logs show "✅ ADJUSTED" or "ADDING NEW ITEM"
- But items don't appear in UI

**Solution:**
Check the frontend code that displays line items. The new items should be in `ruleResults.adjustedLineItems`.

**Check this in browser console after running rule engine:**
```javascript
// In the EstimatePage component
console.log('Rule results:', ruleResults);
console.log('Adjusted line items count:', ruleResults?.adjustedLineItems?.length);
console.log('Last 5 items:', ruleResults?.adjustedLineItems?.slice(-5));
```

### **Problem 3: Data Format Mismatch**

**Symptoms:**
```
🔍 RAW ROOF MEASUREMENTS STRUCTURE:
  Sample entry: 'Total Roof Area' -> 1902 (type: <class 'int'>)  ← Wrong! Should be {'value': 1902}
```

**Cause:** Roof measurements not in nested format.

**Solution:** The API endpoint should be converting flat format to nested format. Check `/api/run-python-rules/route.ts` logs:

```
📊 Converted roof measurements for Python: {
  totalArea: 1902,
  pitch7_9: 5.6  ← Should be > 0 if you have steep roof areas
}
```

### **Problem 4: Frontend Not Sending Pitch Data**

**Symptoms:**
- Browser console shows roof measurements without pitch areas
- OR pitch areas are undefined/null

**Check in browser console BEFORE clicking rule engine button:**
```javascript
const roofMeasurements = rawAgentData?.roofReportData?.extractedData?.roofMeasurements || {};
console.log('Roof measurements to send:', roofMeasurements);
console.log('Pitch 8/12:', roofMeasurements["Area for Pitch 8/12 (sq ft)"]);
```

**Solution:** If pitch areas are missing from `roofMeasurements`, the roof report extraction isn't capturing them.

## ✅ **Expected Behavior**

When everything is working correctly:

### **1. Server Console Shows:**
```
📊 EXTRACTED METRICS:
  PITCH AREAS (CRITICAL FOR STEEP ROOF CHARGES):
  Pitch 8/12: 5.6  ← Non-zero value!

  📈 STEEP AREA TOTALS:
  7/12-9/12: 5.6 sq ft → 0.06 SQ  ← Will generate items!

🏔️ RULE: Steep Roof 7/12-9/12 Charges
  Steep area total: 5.6 sq ft
  Calculated quantity: 0.055999999999999994
  ✅ Steep roof areas detected - applying rules
    ❌ Not found: Remove Additional charge for steep roof - 7/12 to 9/12 slope - ADDING NEW ITEM
    ❌ Not found: Additional charge for steep roof - 7/12 to 9/12 slope - ADDING NEW ITEM

✅ PROCESSING COMPLETED!
  Final line items count: X  ← Should be +2 from original
  Items added: 2  ← Two steep roof charges
```

### **2. API Response Contains:**
```json
{
  "success": true,
  "data": {
    "adjusted_line_items": [
      // ... original items ...
      {
        "line_number": "23",
        "description": "Remove Additional charge for steep roof - 7/12 to 9/12 slope",
        "quantity": 0.055999999999999994,
        "unit": "SQ"
      },
      {
        "line_number": "24",
        "description": "Additional charge for steep roof - 7/12 to 9/12 slope",
        "quantity": 0.055999999999999994,
        "unit": "SQ"
      }
    ]
  }
}
```

### **3. UI Shows:**
- New line items in the adjusted line items list
- "Items Added: 2" in the results summary
- Both steep roof charge items with explanations

## 🚀 **Quick Test**

To verify the Python script is working, test it directly with known data:

```bash
cd /Users/ericheilman/spc-claims

# Create test file with pitch areas
cat > test_steep_roof.json << 'EOF'
{
  "line_items": [
    {
      "line_number": "1",
      "description": "3 tab 25 yr. comp. shingle roofing - w/out felt",
      "quantity": 19.67,
      "unit": "SQ",
      "unit_price": 216.82,
      "RCV": 5275.23,
      "age_life": "14/25 yrs",
      "condition": "Avg.",
      "dep_percent": 56,
      "depreciation_amount": 2954.13,
      "ACV": 2321.1,
      "location_room": "Roof",
      "category": "Roof",
      "page_number": 5
    }
  ],
  "roof_measurements": {
    "Total Roof Area": {"value": 1902},
    "Total Eaves Length": {"value": 220},
    "Total Rakes Length": {"value": 12},
    "Total Ridges/Hips Length": {"value": 164},
    "Total Valleys Length": {"value": 17},
    "Area for Pitch 7/12 (sq ft)": {"value": 0},
    "Area for Pitch 8/12 (sq ft)": {"value": 5.6},
    "Area for Pitch 9/12 (sq ft)": {"value": 0}
  }
}
EOF

# Run Python script
python3 roof_adjustment_engine.py --input test_steep_roof.json --verbose

# Check output - should show:
# - "✅ Steep roof areas detected"
# - "ADDING NEW ITEM" for both steep roof charges
# - Final line items count should be 3 (1 original + 2 added)
```

If this test works but the web app doesn't, the problem is in the data flow from frontend → API → Python script.

## 📋 **Action Items**

1. ✅ Click rule engine button
2. ✅ Check server console for debug output
3. ✅ Verify pitch areas are non-zero
4. ✅ Confirm "Steep roof areas detected" message
5. ✅ Check API response contains new items
6. ✅ Verify UI displays the new items

If any step fails, that's where the problem is! 🔍
