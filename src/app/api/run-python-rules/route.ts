import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  try {
    const inputData = await request.json();
    
    console.log('Received request to run Python rule engine with data:', {
      lineItemsCount: inputData.line_items?.length || 0,
      hasRoofMeasurements: !!inputData.roof_measurements
    });

    // Convert roof_measurements to Python-friendly format
    const pythonRoofMeasurements = Object.entries(inputData.roof_measurements || {}).reduce((acc, [key, value]) => {
      // Convert camelCase to snake_case for Python
      const pythonKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      acc[pythonKey] = value;
      return acc;
    }, {} as Record<string, any>);

    console.log('📊 Converted roof measurements for Python:', pythonRoofMeasurements);

    // Load Roof Master Macro data
    let roofMasterMacroData = {};
    try {
      const csvPath = join(process.cwd(), 'public', 'roof_master_macro.csv');
      const csvContent = await fs.readFile(csvPath, 'utf8');

      // Parse CSV content (assuming tab-delimited)
      const lines = csvContent.split('\n').filter(line => line.trim());
      const headers = lines[0].split('\t');

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        if (values.length >= 3) {
          roofMasterMacroData[values[0]] = {
            description: values[0],
            unit: values[1],
            unit_price: parseFloat(values[2]) || 0
          };
        }
      }
      
      console.log('Loaded Roof Master Macro data:', Object.keys(roofMasterMacroData).length, 'items');
    } catch (error) {
      console.warn('Could not load Roof Master Macro CSV:', error);
    }

    // Update inputData with Python-formatted roof measurements and Roof Master Macro
    const pythonInputData = {
      line_items: inputData.line_items,
      roof_measurements: pythonRoofMeasurements,
      roof_master_macro: roofMasterMacroData
    };

    // Create temporary input file
    const tempInputFile = join(tmpdir(), `roof_input_${Date.now()}.json`);
    const tempOutputFile = join(tmpdir(), `roof_output_${Date.now()}.json`);
    
    try {
      // Write input data to temporary file (using converted Python format)
      await fs.writeFile(tempInputFile, JSON.stringify(pythonInputData, null, 2));

      console.log('Created temporary input file:', tempInputFile);

      // Try to locate Python script
      let pythonScript = join(process.cwd(), 'roof_adjustment_engine.py');
      
      // Check if script exists in current directory
      try {
        await fs.access(pythonScript);
        console.log('✅ Python script found at:', pythonScript);
      } catch (error) {
        console.warn('Python script not found in expected location:', pythonScript);
        throw new Error('Python script not found');
      }

      // Execute Python script
      console.log('🐍 Attempting to execute Python script:', pythonScript);
      console.log('📁 Input file:', tempInputFile);
      console.log('📁 Output file:', tempOutputFile);
      
      // Use python3 command (should be available from amplify.yml installation)
      const pythonCommand = 'python3';
      console.log('🔍 Using Python command:', pythonCommand);
      
      const pythonProcess = spawn(pythonCommand, [
        pythonScript,
        '--input', tempInputFile,
        '--output', tempOutputFile
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('Python stdout:', output);
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
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
          console.error('❌ Failed to start Python script:', error.message);
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

      // Read the results
      let results;
      try {
        const outputData = await fs.readFile(tempOutputFile, 'utf8');
        results = JSON.parse(outputData);
      } catch (readError) {
        console.log('Could not read Python output file, providing fallback response');
        results = {
          success: true,
          original_line_items: pythonInputData.line_items,
          adjusted_line_items: pythonInputData.line_items.map((item: any, index: number) => ({
            ...item,
            line_number: String(index + 1),
            narrative: `Field Changed: quantity |Explanation: Mock adjustment - Python execution failed, returning original data with test narrative`
          })),
          audit_log: [
            {
              line_number: "1",
              description: "Mock adjustment",
              field: "quantity",
              before: 0,
              after: 0,
              action: "adjusted",
              explanation: "Python execution failed - using mock response",
              rule_applied: "Mock Rule"
            }
          ],
          debug_output: {
            execution_time: new Date().toISOString(),
            stdout: stdout || 'No stdout output',
            stderr: stderr || 'No stderr output',
            python_command: pythonCommand,
            script_path: pythonScript,
            input_file: tempInputFile,
            output_file: tempOutputFile,
            error_details: `Could not read output file: ${readError instanceof Error ? readError.message : 'Unknown error'}`
          },
          adjustment_results: {
            total_adjustments: 1,
            total_additions: 0,
            total_rcv_change: 0,
            total_acv_change: 0,
            total_warnings: 0,
            total_errors: 1,
            error_details: ['Python execution failed - using mock response']
          }
        };
      }

      console.log('✅ Rule engine processing completed');
      console.log('📊 Processing summary:', {
        success: results.success,
        adjustmentsCount: results.adjustment_results?.total_adjustments || 0,
        additionsCount: results.adjustment_results?.total_additions || 0
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
        await fs.unlink(tempInputFile);
      } catch (error) {
        console.warn('Failed to delete temp input file:', error);
      }
      
      try {
        await fs.unlink(tempOutputFile);
      } catch (error) {
        console.warn('Failed to delete temp output file:', error);
      }
    }

  } catch (error: any) {
    console.error('Error running Python rule engine:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: `Python rule engine failed: ${error.message || 'Unknown error'}`,
        debug: {
          message: error.message,
          stack: error.stack,
          engine_type: 'Python',
          processing_method: 'Direct Python execution'
        }
      },
      { status: 500 }
    );
  }
}