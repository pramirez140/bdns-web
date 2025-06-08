import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { wikiDb } from '@/lib/wiki-database';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const page = await wikiDb.getPageBySlug(params.slug);
    
    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // Check if user can view the page
    const session = await getServerSession(authOptions);
    if (page.visibility === 'authenticated' && !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (page.visibility === 'admin' && session?.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Record page view
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    await wikiDb.recordPageView(page.id, session?.user?.id, ipAddress || undefined);

    return NextResponse.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('Error fetching wiki page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wiki page' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the page first to check permissions
    const existingPage = await wikiDb.getPageBySlug(params.slug);
    if (!existingPage) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // Check if user can edit the page
    const isAuthor = existingPage.author_id === session.user.id;
    const isAdmin = session.user.role === 'admin';
    
    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit this page' },
        { status: 403 }
      );
    }

    if (existingPage.is_locked && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'This page is locked and can only be edited by administrators' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updatedPage = await wikiDb.updatePage(existingPage.id, {
      ...body,
      author_id: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: updatedPage
    });
  } catch (error) {
    console.error('Error updating wiki page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update wiki page' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the page first to check permissions
    const existingPage = await wikiDb.getPageBySlug(params.slug);
    if (!existingPage) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // Only admins or the author can delete
    const isAuthor = existingPage.author_id === session.user.id;
    const isAdmin = session.user.role === 'admin';
    
    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this page' },
        { status: 403 }
      );
    }

    const deleted = await wikiDb.deletePage(existingPage.id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete page' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Page deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting wiki page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete wiki page' },
      { status: 500 }
    );
  }
}