import { NextRequest, NextResponse } from 'next/server';
import { wikiDb } from '@/lib/wiki-database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    const categoryId = searchParams.get('categoryId');
    const tagIds = searchParams.get('tagIds');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const options = {
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      tagIds: tagIds ? tagIds.split(',').map(id => parseInt(id)) : undefined,
      limit,
      offset
    };

    const { results, total } = await wikiDb.searchPages(query, options);

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error searching wiki pages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search wiki pages' },
      { status: 500 }
    );
  }
}