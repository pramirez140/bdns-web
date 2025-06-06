import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let result;
    
    if (query) {
      // Get search suggestions based on partial query
      result = await pool.query(`
        SELECT DISTINCT query, MAX(created_at) as last_searched, MAX(result_count) as result_count
        FROM search_history
        WHERE user_id = $1
          AND LOWER(query) LIKE LOWER($2)
        GROUP BY query
        ORDER BY last_searched DESC
        LIMIT $3 OFFSET $4
      `, [session.user.id, `%${query}%`, limit, offset]);
    } else {
      // Get recent searches
      result = await pool.query(`
        SELECT DISTINCT query, MAX(created_at) as last_searched, MAX(result_count) as result_count
        FROM search_history
        WHERE user_id = $1
        GROUP BY query
        ORDER BY last_searched DESC
        LIMIT $2 OFFSET $3
      `, [session.user.id, limit, offset]);
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
    });

  } catch (error: any) {
    console.error('Failed to fetch search history:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (query) {
      // Delete specific search
      await pool.query(`
        DELETE FROM search_history
        WHERE user_id = $1 AND query = $2
      `, [session.user.id, query]);
    } else {
      // Clear all search history
      await pool.query(`
        DELETE FROM search_history
        WHERE user_id = $1
      `, [session.user.id]);
    }

    return NextResponse.json({
      success: true,
      message: query ? 'Search removed from history' : 'Search history cleared',
    });

  } catch (error: any) {
    console.error('Failed to delete search history:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}