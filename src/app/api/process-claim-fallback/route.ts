import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const claimFile = formData.get('claimFile') as File;
    const roofReportFile = formData.get('roofReportFile') as File;
    
    if (!claimFile) {
      return NextResponse.json(
        { error: 'No insurance claim file provided' },
        { status: 400 }
      );
    }

    if (claimFile.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Insurance claim file must be a PDF' },
        { status: 400 }
      );
    }

    // Simple success response with basic data
    const responseData = {
      claim: {
        id: `CLM-${Date.now()}`,
        fileName: claimFile.name,
        uploadDate: new Date(),
        extractedData: {
          propertyInfo: {
            address: '123 Main Street',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345',
            propertyType: 'Single Family Residential',
            squareFootage: 2500,
            yearBuilt: 1995
          },
          claimDetails: {
            claimNumber: `CLM-${Date.now()}`,
            dateOfLoss: new Date(),
            causeOfLoss: 'Water Damage',
            policyNumber: 'POL-123456789',
            adjusterName: 'John Smith',
            adjusterContact: 'john.smith@insurance.com',
            contractorName: 'ABC Construction',
            contractorContact: 'contact@abcconstruction.com'
          },
          lineItems: [
            {
              id: 'LI-001',
              line_number: '1',
              description: 'Sample line item',
              quantity: 1,
              unit: 'ea',
              unit_price: 100.00,
              RCV: 100.00,
              age_life: 'New',
              condition: 'Good',
              dep_percent: 0,
              depreciation_amount: 0,
              ACV: 100.00,
              location_room: 'Living Room',
              category: 'General',
              page_number: 1
            }
          ],
          totals: {
            subtotal: 100.00,
            tax: 8.00,
            total: 108.00,
            overhead: 10.00,
            profit: 5.00
          },
          metadata: {
            pdfPages: 1,
            processingTime: 1.0,
            confidenceScore: 0.8,
            extractedAt: new Date()
          }
        }
      },
      roofReport: roofReportFile ? {
        id: `RPT-${Date.now()}`,
        fileName: roofReportFile.name,
        uploadDate: new Date(),
        extractedData: {
          propertyInfo: {
            address: '123 Main Street',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345',
            propertyType: 'Residential'
          },
          roofMeasurements: {
            totalArea: 2500,
            netArea: 2300,
            grossArea: 2500,
            wastePercentage: 15,
            predominantPitch: '6/12',
            eaveLength: 120,
            rakeLength: 80,
            ridgeLength: 40,
            hipLength: 0,
            valleyLength: 20,
            facetCount: 4,
            atticSquareFootage: 2500
          }
        }
      } : null,
      processingMode: 'fallback',
      message: 'Files uploaded successfully'
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error processing PDFs:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process PDFs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}