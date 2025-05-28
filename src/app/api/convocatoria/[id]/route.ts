import { NextRequest, NextResponse } from 'next/server';
import { bdnsLocalClient } from '@/lib/bdns-local';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    console.log(`🔍 API: Received params:`, params);
    console.log(`🔍 API: ID extracted: "${id}", type: ${typeof id}`);
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de convocatoria requerido'
      }, { status: 400 });
    }

    console.log(`🔍 API: Fetching details for convocatoria ${id} from local database`);

    // Attempt to get detailed information for the convocatoria from local database
    const convocatoria = await bdnsLocalClient.obtenerDetalleConvocatoria(id);

    console.log(`✅ API: Successfully fetched details for convocatoria ${id} from local database`);

    return NextResponse.json({
      success: true,
      data: convocatoria,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error(`💥 API: Error fetching convocatoria ${params.id}:`, error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}