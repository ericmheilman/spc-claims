import { NextRequest, NextResponse } from 'next/server';
import { SPCClaimsOrchestrator } from '@/lib/SPCClaimsOrchestrator';

export async function GET(request: NextRequest) {
  try {
    const orchestrator = new SPCClaimsOrchestrator();
    const stats = await orchestrator.getDashboardStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
