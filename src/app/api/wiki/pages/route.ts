import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { wikiDb } from '@/lib/wiki-database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status') || 'published';
    const visibility = searchParams.get('visibility') || 'public';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderBy = searchParams.get('orderBy') || 'updated_at DESC';

    // Check if user can view non-public content
    const session = await getServerSession(authOptions);
    const canViewPrivate = !!session?.user;

    const options = {
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      status,
      visibility: canViewPrivate ? visibility : 'public',
      limit,
      offset,
      orderBy
    };

    const { pages, total } = await wikiDb.getPages(options);

    return NextResponse.json({
      success: true,
      data: pages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching wiki pages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wiki pages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      slug,
      content,
      excerpt,
      content_type = 'markdown',
      category_id,
      status = 'draft',
      visibility = 'public',
      meta_title,
      meta_description,
      meta_keywords,
      tags
    } = body;

    // Validate required fields
    if (!title || !slug || !content) {
      return NextResponse.json(
        { success: false, error: 'Title, slug, and content are required' },
        { status: 400 }
      );
    }

    // Create the page
    const page = await wikiDb.createPage({
      title,
      slug,
      content,
      excerpt,
      content_type,
      category_id,
      author_id: session.user.id,
      status,
      visibility,
      meta_title,
      meta_description,
      meta_keywords,
      tags
    });

    return NextResponse.json({
      success: true,
      data: page
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating wiki page:', error);
    
    // Handle duplicate slug error
    if (error.code === '23505' && error.constraint === 'wiki_pages_slug_key') {
      return NextResponse.json(
        { success: false, error: 'A page with this slug already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create wiki page' },
      { status: 500 }
    );
  }
}