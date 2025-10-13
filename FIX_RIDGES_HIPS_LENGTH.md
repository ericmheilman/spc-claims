# Fix for "Total Ridges/Hips Length" Display Issue

## Problem
The "Total Ridges/Hips" field was showing 0 ft instead of the correct value of 164.0 ft from the roof measurement data.

## Root Cause
The frontend was looking for separate "Total Line Lengths (Ridges)" and "Total Line Lengths (Hips)" fields, but the actual data contains a single "Total Ridges/Hips Length" field with the combined value.

## Changes Made

### 1. Frontend UI Display (`src/app/estimate/page.tsx`)
- Updated the "Total Ridges/Hips" display to check for "Total Ridges/Hips Length" first
- Added fallback to individual ridge and hip lengths if the combined field is not available
- Added proper TypeScript typing to fix linting errors

### 2. API Route (`src/app/api/run-python-rules/route.ts`)
- Updated the roof measurements mapping to check for `rm.totalRidgesHipsLength` first
- Falls back to calculating from individual `rm.ridgeLength + rm.hipLength` if needed

### 3. Data Extraction Logic (`src/app/estimate/page.tsx`)
- Added `totalRidgesHipsLength` field to the data sent to the Python script
- Added text pattern matching for "Total Ridges/Hips Length" in the comprehensive extraction logic
- Updated both text pattern matching sections to include the ridges/hips pattern

### 4. Python Script
- Already correctly configured to look for "Total Ridges/Hips Length" field
- No changes needed to the Python script

## Result
The "Total Ridges/Hips" field should now correctly display 164.0 ft instead of 0 ft, and the Python script will receive the correct value for its calculations.

## Testing
To test the fix:
1. Upload documents and process them
2. Click the "🐍 Python Rule Engine" button
3. Check that "Total Ridges/Hips" shows 164.0 ft in the "Roof Variables Used" section
4. Verify that the Python script receives the correct value for ridge/hip calculations
