import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// GET /api/tracking - Get user's tracked grants
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
        gt.id,
        gt.grant_id,
        gt.status,
        gt.application_deadline,
        gt.notes,
        gt.documents,
        gt.reminders,
        gt.created_at,
        gt.updated_at,
        c.titulo,
        c.organo_convocante,
        c.tipo_beneficiario,
        c.tipo_convocatoria,
        c.presupuesto_total,
        c.fecha_publicacion,
        c.fecha_fin_solicitud,
        c.url_convocatoria
      FROM grant_tracking gt
      JOIN convocatorias c ON gt.grant_id = c.id
      WHERE gt.user_id = $1
      ORDER BY 
        CASE gt.status 
          WHEN 'applying' THEN 1
          WHEN 'interested' THEN 2
          WHEN 'applied' THEN 3
          WHEN 'awarded' THEN 4
          WHEN 'rejected' THEN 5
          ELSE 6
        END,
        gt.application_deadline ASC NULLS LAST`,
      [session.user.id]
    )

    return NextResponse.json({
      tracking: result.rows.map(row => ({
        id: row.id,
        grantId: row.grant_id,
        status: row.status,
        applicationDeadline: row.application_deadline,
        notes: row.notes,
        documents: row.documents,
        reminders: row.reminders,
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
    console.error('Error fetching tracking:', error)
    return NextResponse.json(
      { error: 'Error al obtener seguimiento' },
      { status: 500 }
    )
  }
}

// POST /api/tracking - Add or update grant tracking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { 
      grantId, 
      status = 'interested',
      applicationDeadline,
      notes,
      documents,
      reminders 
    } = await request.json()

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

    // Upsert tracking record
    const result = await pool.query(
      `INSERT INTO grant_tracking (
        user_id, grant_id, status, application_deadline, 
        notes, documents, reminders
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, grant_id) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        application_deadline = EXCLUDED.application_deadline,
        notes = EXCLUDED.notes,
        documents = EXCLUDED.documents,
        reminders = EXCLUDED.reminders,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        session.user.id, 
        grantId, 
        status,
        applicationDeadline || null,
        notes || null,
        documents || [],
        reminders || []
      ]
    )

    // Create notification for status change
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        session.user.id,
        'tracking_update',
        'Estado de seguimiento actualizado',
        `Has actualizado el estado de la convocatoria a "${status}"`,
        { grantId, status }
      ]
    )

    return NextResponse.json({
      tracking: result.rows[0],
      message: 'Seguimiento actualizado'
    }, { status: 201 })

  } catch (error) {
    console.error('Error updating tracking:', error)
    return NextResponse.json(
      { error: 'Error al actualizar seguimiento' },
      { status: 500 }
    )
  }
}

// DELETE /api/tracking - Remove grant from tracking
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
      'DELETE FROM grant_tracking WHERE user_id = $1 AND grant_id = $2 RETURNING *',
      [session.user.id, grantId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Seguimiento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Eliminado del seguimiento'
    })

  } catch (error) {
    console.error('Error removing tracking:', error)
    return NextResponse.json(
      { error: 'Error al eliminar del seguimiento' },
      { status: 500 }
    )
  }
}