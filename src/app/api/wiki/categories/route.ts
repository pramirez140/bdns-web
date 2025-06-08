import { NextRequest, NextResponse } from 'next/server';
import { wikiDb } from '@/lib/wiki-database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    const categories = await wikiDb.getCategories(includeInactive);

    // Build hierarchical structure
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach(cat => {
      const categoryWithChildren = categoryMap.get(cat.id);
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    return NextResponse.json({
      success: true,
      data: rootCategories
    });
  } catch (error) {
    console.error('Error fetching wiki categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}