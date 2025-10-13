import { NextRequest, NextResponse } from 'next/server';
import { LyzrAPIService } from '@/lib/LyzrAPIService';

export async function GET(request: NextRequest) {
  try {
    const lyzrAPI = new LyzrAPIService();
    const statusResult = await lyzrAPI.getAgentStatus();
    
    return NextResponse.json({
      success: true,
      connected: statusResult.connected,
      status: statusResult.connected ? 'connected' : 'error',
      error: statusResult.error,
      details: statusResult.details
    });

  } catch (error) {
    console.error('Error checking Lyzr status:', error);
    return NextResponse.json(
      { 
        success: false,
        connected: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

