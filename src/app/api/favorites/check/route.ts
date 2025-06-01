import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// GET /api/favorites/check?grantIds=1,2,3 - Check if grants are favorited
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    
    if (!session?.user?.id) {
      return NextResponse.json({ favorited: {} })
    }

    const url = new URL(request.url)
    const grantIds = url.searchParams.get('grantIds')

    if (!grantIds) {
      return NextResponse.json({ favorited: {} })
    }

    const ids = grantIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))

    if (ids.length === 0) {
      return NextResponse.json({ favorited: {} })
    }

    const result = await pool.query(
      `SELECT grant_id FROM favorites 
       WHERE user_id = $1 AND grant_id = ANY($2::int[])`,
      [session.user.id, ids]
    )

    const favorited = ids.reduce((acc, id) => {
      acc[id] = result.rows.some(row => row.grant_id === id)
      return acc
    }, {} as Record<number, boolean>)

    return NextResponse.json({ favorited })

  } catch (error) {
    console.error('Error checking favorites:', error)
    return NextResponse.json({ favorited: {} })
  }
}