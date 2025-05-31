import { NextRequest, NextResponse } from 'next/server';
import { bdnsLocalClient } from '@/lib/bdns-local';
import { SearchFilters, SearchParams } from '@/types/bdns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract search parameters
    const query = searchParams.get('query') || searchParams.get('q') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || undefined;
    
    // Extract filters
    const organoConvocante = searchParams.get('organoConvocante') || searchParams.get('organo');
    const organoConvocanteArray = organoConvocante ? (organoConvocante.includes(',') ? organoConvocante.split(',').filter(Boolean) : [organoConvocante]) : undefined;
    const importeMinimo = searchParams.get('importeMinimo') ? parseFloat(searchParams.get('importeMinimo')!) : undefined;
    const importeMaximo = searchParams.get('importeMaximo') ? parseFloat(searchParams.get('importeMaximo')!) : undefined;
    const fechaDesde = searchParams.get('fechaDesde') ? new Date(searchParams.get('fechaDesde')!) : undefined;
    const fechaHasta = searchParams.get('fechaHasta') ? new Date(searchParams.get('fechaHasta')!) : undefined;
    const estadoConvocatoria = searchParams.get('estadoConvocatoria') || undefined;
    
    // Build filters object
    const filtros: SearchFilters = {
      query,
      organoConvocante: organoConvocanteArray,
      importeMinimo,
      importeMaximo,
      fechaConvocatoria: (fechaDesde || fechaHasta) ? {
        desde: fechaDesde,
        hasta: fechaHasta
      } : undefined,
      estadoConvocatoria
    };

    // Build search params object
    const searchConfig: SearchParams = {
      page,
      pageSize,
      sortBy,
      sortOrder
    };

    console.log('🔍 API Search request (local database):', { filtros, searchConfig });

    // Perform search using local database
    const results = await bdnsLocalClient.buscarConvocatorias(filtros, searchConfig);

    console.log('✅ Local database search successful:', {
      total: results.total,
      page: results.page,
      resultsCount: results.data.length
    });

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('💥 API Search error:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}