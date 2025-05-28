import { NextRequest, NextResponse } from 'next/server';
import { budgetExtractor } from '@/lib/budget-extractor';

export async function POST(request: NextRequest) {
  try {
    const { convocatoriaIds } = await request.json();
    
    if (!convocatoriaIds || !Array.isArray(convocatoriaIds) || convocatoriaIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere un array de IDs de convocatorias'
      }, { status: 400 });
    }

    // Limit to 10 convocatorias at once to avoid timeout
    if (convocatoriaIds.length > 10) {
      return NextResponse.json({
        success: false,
        error: 'Máximo 10 convocatorias por solicitud'
      }, { status: 400 });
    }

    console.log(`🔍 API: Extracting budgets for ${convocatoriaIds.length} convocatorias`);

    const results = await budgetExtractor.extractMultipleBudgets(convocatoriaIds);

    const successCount = results.filter(r => r.presupuestoTotal !== null).length;
    console.log(`✅ API: Successfully extracted ${successCount}/${results.length} budgets`);

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error(`💥 API: Budget extraction error:`, error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}