import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const inputData = await request.json();
    
    console.log('Received request to run Python rule engine via Lambda with data:', {
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

    // Prepare the request for the Lambda function
    const lambdaPayload = {
      line_items: inputData.line_items,
      roof_measurements: pythonRoofMeasurements
    };

    console.log('🚀 Calling AWS Lambda function for Python processing...');

    // Get the Lambda function URL from environment variables
    const lambdaUrl = process.env.ROOF_ADJUSTMENT_LAMBDA_URL || 
                     'https://dkgfw5nbyh.execute-api.us-east-2.amazonaws.com/default/roofAdjustmentEngine';

    console.log('🔗 Lambda URL:', lambdaUrl);

    // Call the Lambda function
    const lambdaResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lambdaPayload)
    });

    if (!lambdaResponse.ok) {
      const errorText = await lambdaResponse.text();
      throw new Error(`Lambda function failed with status ${lambdaResponse.status}: ${errorText}`);
    }

    const lambdaResult = await lambdaResponse.json();
    
    console.log('✅ Lambda function executed successfully');
    console.log(`📊 Results:`, {
      success: lambdaResult.success,
      adjustments: lambdaResult.data?.adjustment_results?.total_adjustments || 0,
      additions: lambdaResult.data?.adjustment_results?.total_additions || 0
    });

    return NextResponse.json({
      success: true,
      data: lambdaResult.data
    });

  } catch (error: any) {
    console.error('Error calling Lambda function:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: `Lambda function failed: ${error.message || 'Unknown error'}`,
        debug: {
          message: error.message,
          stack: error.stack,
          engine_type: 'Python',
          processing_method: 'AWS Lambda Python runtime'
        }
      },
      { status: 500 }
    );
  }
}