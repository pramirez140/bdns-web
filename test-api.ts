import { BDNSRealApiClient } from './src/lib/bdns-api-real.js';

async function testBDNSAPI() {
  try {
    console.log('🔍 Testing BDNS API v2.1 integration...');
    
    const client = new BDNSRealApiClient();
    
    const filters = {
      fechaConvocatoria: {
        desde: new Date('2024-01-01'),
        hasta: new Date('2024-03-31')
      }
    };
    
    const params = {
      page: 1,
      pageSize: 2
    };
    
    console.log('📋 Making request with filters:', filters);
    console.log('📋 Parameters:', params);
    
    const result = await client.buscarConvocatorias(filters, params);
    
    console.log('✅ API call successful!');
    console.log('📊 Results:');
    console.log(`  - Total: ${result.total}`);
    console.log(`  - Page: ${result.page}`);
    console.log(`  - Page Size: ${result.pageSize}`);
    console.log(`  - Total Pages: ${result.totalPages}`);
    console.log(`  - Data Length: ${result.data.length}`);
    
    if (result.data.length > 0) {
      console.log('\n📝 First convocatoria:');
      const first = result.data[0];
      console.log(`  - ID: ${first.identificador}`);
      console.log(`  - Título: ${first.titulo}`);
      console.log(`  - Órgano: ${first.organoConvocante}`);
      console.log(`  - Importe: ${first.importeTotal}€`);
      console.log(`  - Fecha Publicación: ${first.fechaPublicacion.toLocaleDateString()}`);
      console.log(`  - Fecha Cierre: ${first.fechaCierre.toLocaleDateString()}`);
      console.log(`  - Enlace: ${first.enlaceOficial}`);
    }
    
  } catch (error: any) {
    console.error('❌ API test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testBDNSAPI();