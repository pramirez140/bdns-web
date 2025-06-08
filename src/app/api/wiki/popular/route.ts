import { NextRequest, NextResponse } from 'next/server';
import { wikiDb } from '@/lib/wiki-database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const pages = await wikiDb.getPopularPages(limit);
    
    return NextResponse.json({
      success: true,
      data: pages
    });
  } catch (error) {
    console.error('Error fetching popular wiki pages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch popular pages' },
      { status: 500 }
    );
  }
}