import { NextRequest, NextResponse } from 'next/server';
import { bdnsRealApi } from '@/lib/bdns-api-real';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || undefined;
    
    // Test the search functionality
    const results = await bdnsRealApi.buscarConvocatorias(
      {}, 
      { 
        query,
        page: 1,
        pageSize: 3 
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Search test completed successfully',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}