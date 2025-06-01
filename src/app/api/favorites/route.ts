import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// GET /api/favorites - Get user's favorites
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const result = await pool.query(
      `SELECT 
        f.id,
        f.grant_id,
        f.notes,
        f.tags,
        f.created_at,
        f.updated_at,
        c.titulo,
        c.organo_convocante,
        c.tipo_beneficiario,
        c.tipo_convocatoria,
        c.presupuesto_total,
        c.fecha_publicacion,
        c.fecha_fin_solicitud,
        c.url_convocatoria
      FROM favorites f
      JOIN convocatorias c ON f.grant_id = c.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC`,
      [session.user.id]
    )

    return NextResponse.json({
      favorites: result.rows.map(row => ({
        id: row.id,
        grantId: row.grant_id,
        notes: row.notes,
        tags: row.tags,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        grant: {
          id: row.grant_id,
          titulo: row.titulo,
          organoConvocante: row.organo_convocante,
          tipoBeneficiario: row.tipo_beneficiario,
          tipoConvocatoria: row.tipo_convocatoria,
          presupuestoTotal: row.presupuesto_total,
          fechaPublicacion: row.fecha_publicacion,
          fechaFinSolicitud: row.fecha_fin_solicitud,
          urlConvocatoria: row.url_convocatoria,
        }
      }))
    })

  } catch (error) {
    console.error('Error fetching favorites:', error)
    return NextResponse.json(
      { error: 'Error al obtener favoritos' },
      { status: 500 }
    )
  }
}

// POST /api/favorites - Add to favorites
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { grantId, notes, tags } = await request.json()

    if (!grantId) {
      return NextResponse.json(
        { error: 'El ID de la convocatoria es requerido' },
        { status: 400 }
      )
    }

    // Check if grant exists
    const grantCheck = await pool.query(
      'SELECT id FROM convocatorias WHERE id = $1',
      [grantId]
    )

    if (grantCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'La convocatoria no existe' },
        { status: 404 }
      )
    }

    // Add to favorites
    const result = await pool.query(
      `INSERT INTO favorites (user_id, grant_id, notes, tags)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, grant_id) 
      DO UPDATE SET 
        notes = EXCLUDED.notes,
        tags = EXCLUDED.tags,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [session.user.id, grantId, notes || null, tags || []]
    )

    return NextResponse.json({
      favorite: result.rows[0],
      message: 'Añadido a favoritos'
    }, { status: 201 })

  } catch (error) {
    console.error('Error adding favorite:', error)
    return NextResponse.json(
      { error: 'Error al añadir a favoritos' },
      { status: 500 }
    )
  }
}

// DELETE /api/favorites/:id - Remove from favorites
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const grantId = url.searchParams.get('grantId')

    if (!grantId) {
      return NextResponse.json(
        { error: 'El ID de la convocatoria es requerido' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND grant_id = $2 RETURNING *',
      [session.user.id, grantId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Favorito no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Eliminado de favoritos'
    })

  } catch (error) {
    console.error('Error removing favorite:', error)
    return NextResponse.json(
      { error: 'Error al eliminar de favoritos' },
      { status: 500 }
    )
  }
}