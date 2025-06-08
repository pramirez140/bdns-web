import { NextRequest, NextResponse } from 'next/server';
import { wikiDb } from '@/lib/wiki-database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const pages = await wikiDb.getRecentPages(limit);
    
    return NextResponse.json({
      success: true,
      data: pages
    });
  } catch (error) {
    console.error('Error fetching recent wiki pages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent pages' },
      { status: 500 }
    );
  }
}