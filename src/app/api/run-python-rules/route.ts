import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  try {
    const inputData = await request.json();
    
    console.log('Received request to run Python rule engine with data:', {
      lineItemsCount: inputData.line_items?.length || 0,
      hasRoofMeasurements: !!inputData.roof_measurements
    });

    // Validate input data
    if (!inputData.line_items || !Array.isArray(inputData.line_items)) {
      return NextResponse.json(
        { success: false, error: 'Invalid line items data' },
        { status: 400 }
      );
    }

    if (!inputData.roof_measurements || typeof inputData.roof_measurements !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid roof measurements data' },
        { status: 400 }
      );
    }

    // Handle both nested format ({"Total Roof Area": {value: 1902}}) 
    // and flat format ({totalArea: 1902})
    const rm = inputData.roof_measurements;
    
    // Helper function to get value from either format
    const getValue = (nestedKey: string, flatKey: string, fallback: any = 0) => {
      // If already in nested format with .value
      if (rm[nestedKey] && typeof rm[nestedKey] === 'object' && 'value' in rm[nestedKey]) {
        return rm[nestedKey].value;
      }
      // If in flat format
      if (rm[flatKey] !== undefined) {
        return rm[flatKey];
      }
      return fallback;
    };

    const pythonRoofMeasurements: Record<string, {value: any}> = {
      "Total Roof Area": { value: getValue("Total Roof Area", "totalArea", getValue("Total Roof Area", "netArea", 0)) },
      "Total Eaves Length": { value: getValue("Total Eaves Length", "eaveLength") },
      "Total Rakes Length": { value: getValue("Total Rakes Length", "rakeLength") },
      "Total Ridges/Hips Length": { value: getValue("Total Ridges/Hips Length", "totalRidgesHipsLength", 
        getValue("Total Line Lengths (Ridges)", "ridgeLength") + getValue("Total Line Lengths (Hips)", "hipLength")) },
      "Total Valleys Length": { value: getValue("Total Valleys Length", "valleyLength") },
      "Total Step Flashing Length": { value: getValue("Total Step Flashing Length", "stepFlashingLength") },
      "Total Flashing Length": { value: getValue("Total Flashing Length", "flashingLength") },
      "Total Line Lengths (Ridges)": { value: getValue("Total Line Lengths (Ridges)", "ridgeLength") },
      "Total Line Lengths (Hips)": { value: getValue("Total Line Lengths (Hips)", "hipLength") },
      "Area for Pitch 1/12 (sq ft)": { value: getValue("Area for Pitch 1/12 (sq ft)", "areaPitch1_12") },
      "Area for Pitch 2/12 (sq ft)": { value: getValue("Area for Pitch 2/12 (sq ft)", "areaPitch2_12") },
      "Area for Pitch 3/12 (sq ft)": { value: getValue("Area for Pitch 3/12 (sq ft)", "areaPitch3_12") },
      "Area for Pitch 4/12 (sq ft)": { value: getValue("Area for Pitch 4/12 (sq ft)", "areaPitch4_12") },
      "Area for Pitch 5/12 (sq ft)": { value: getValue("Area for Pitch 5/12 (sq ft)", "areaPitch5_12") },
      "Area for Pitch 6/12 (sq ft)": { value: getValue("Area for Pitch 6/12 (sq ft)", "areaPitch6_12") },
      "Area for Pitch 7/12 (sq ft)": { value: getValue("Area for Pitch 7/12 (sq ft)", "areaPitch7_12") },
      "Area for Pitch 8/12 (sq ft)": { value: getValue("Area for Pitch 8/12 (sq ft)", "areaPitch8_12") },
      "Area for Pitch 9/12 (sq ft)": { value: getValue("Area for Pitch 9/12 (sq ft)", "areaPitch9_12") },
      "Area for Pitch 10/12 (sq ft)": { value: getValue("Area for Pitch 10/12 (sq ft)", "areaPitch10_12") },
      "Area for Pitch 11/12 (sq ft)": { value: getValue("Area for Pitch 11/12 (sq ft)", "areaPitch11_12") },
      "Area for Pitch 12/12 (sq ft)": { value: getValue("Area for Pitch 12/12 (sq ft)", "areaPitch12_12") },
      "Area for Pitch 12/12+ (sq ft)": { value: getValue("Area for Pitch 12/12+ (sq ft)", "areaPitch12_12Plus") }
    };

           console.log('📊 Converted roof measurements for Python:', {
             totalArea: pythonRoofMeasurements["Total Roof Area"].value,
             totalRidgesHipsLength: pythonRoofMeasurements["Total Ridges/Hips Length"].value,
             ridgeLength: pythonRoofMeasurements["Total Line Lengths (Ridges)"].value,
             hipLength: pythonRoofMeasurements["Total Line Lengths (Hips)"].value,
             pitch7_9: pythonRoofMeasurements["Area for Pitch 7/12 (sq ft)"].value + 
                       pythonRoofMeasurements["Area for Pitch 8/12 (sq ft)"].value +
                       pythonRoofMeasurements["Area for Pitch 9/12 (sq ft)"].value
           });

    // Update inputData with Python-formatted roof measurements
    const pythonInputData = {
      line_items: inputData.line_items,
      roof_measurements: pythonRoofMeasurements
    };

    // Create temporary input file
    const tempInputFile = join(tmpdir(), `roof_input_${Date.now()}.json`);
    const tempOutputFile = join(tmpdir(), `roof_output_${Date.now()}.json`);
    
    try {
      // Write input data to temporary file (using converted Python format)
      await writeFile(tempInputFile, JSON.stringify(pythonInputData, null, 2));

      console.log('Created temporary input file:', tempInputFile);

      // Check if we're in a deployment environment without Python
      const isProduction = process.env.NODE_ENV === 'production' || process.env.AWS_EXECUTION_ENV;
      
      if (isProduction) {
        // In production/deployment environments, return a mock response since Python isn't available
        console.log('Running in production environment, skipping Python execution and returning mock response');
        
        const mockResponse = {
          success: true,
          adjustment_results: {
            adjusted_line_items: pythonInputData.line_items.map((item: any, index: number) => ({
              ...item,
              line_number: String(index + 1),
              original_quantity: item.quantity,
              adjustment_note: "Production mode - Python rules engine not available"
            })),
            summary: {
              total_adjustments: 0,
              total_additions: 0,
              total_warnings: 0,
              estimated_savings: 0
            },
            audit_log: [{
              rule_applied: "Production Mode",
              field: "system",
              explanation: "Python rule engine not available in AWS Amplify deployment environment. Returning original line items without adjustments.",
              timestamp: new Date().toISOString()
            }]
          }
        };

        return NextResponse.json({
          success: true,
          data: {
            ...mockResponse,
            debug_output: {
              stdout: "Production mode - Python execution skipped",
              stderr: "",
              execution_time: new Date().toISOString(),
              note: "This is a production deployment running without Python support. For full functionality, deploy to an environment with Python installed."
            }
          }
        });
      }

      // Execute Python script (only in development/local environments)
      const pythonScript = join(process.cwd(), 'roof_adjustment_engine.py');
      
      const pythonProcess = spawn('python3', [
        pythonScript,
        '--input', tempInputFile,
        '--output', tempOutputFile
      ], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

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

      // Wait for Python script to complete
      await new Promise<void>((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Python script exited with code ${code}: ${stderr}`));
          }
        });

        pythonProcess.on('error', (error) => {
          // Handle ENOENT error gracefully
          if (error.message.includes('ENOENT')) {
            console.log('Python3 not found, falling back to mock response');
            resolve(); // Continue with fallback logic below
            return;
          }
          reject(new Error(`Failed to start Python script: ${error.message}`));
        });

        // Set timeout for Python script execution
        setTimeout(() => {
          pythonProcess.kill();
          reject(new Error('Python script execution timeout'));
        }, 30000); // 30 second timeout
      });

      console.log('Python script stdout:', stdout);
      if (stderr) {
        console.log('Python script stderr:', stderr);
      }

      // Check if output file exists (in case Python failed but didn't throw an error)
      let results;
      try {
        const outputData = await import('fs').then(fs => 
          fs.promises.readFile(tempOutputFile, 'utf8')
        );
        results = JSON.parse(outputData);
      } catch (readError) {
        // If we can't read the output file, provide a fallback response
        console.log('Could not read Python output file, providing fallback response');
        results = {
          success: true,
          adjustment_results: {
            adjusted_line_items: pythonInputData.line_items.map((item: any, index: number) => ({
              ...item,
              line_number: String(index + 1),
              original_quantity: item.quantity,
              adjustment_note: "Python execution failed - returning original data"
            })),
            summary: {
              total_adjustments: 0,
              total_additions: 0,
              total_warnings: 0,
              estimated_savings: 0
            },
            audit_log: [{
              rule_applied: "Fallback Mode",
              field: "system",
              explanation: "Python execution failed (ENOENT or other error). Returning original line items without adjustments.",
              timestamp: new Date().toISOString()
            }]
          }
        };
      }
      
      console.log('Python script results:', {
        success: true,
        adjustmentsCount: results.adjustment_results?.summary?.total_adjustments || 0,
        additionsCount: results.adjustment_results?.summary?.total_additions || 0
      });

      return NextResponse.json({
        success: true,
        data: {
          ...results,
          debug_output: {
            stdout: stdout,
            stderr: stderr,
            execution_time: new Date().toISOString()
          }
        }
      });

    } finally {
      // Clean up temporary files
      try {
        await unlink(tempInputFile);
      } catch (error) {
        console.warn('Failed to delete temp input file:', error);
      }
      
      try {
        await unlink(tempOutputFile);
      } catch (error) {
        console.warn('Failed to delete temp output file:', error);
      }
    }

  } catch (error) {
    console.error('Error running Python rule engine:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
