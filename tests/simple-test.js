const axios = require('axios');

async function testDirectAPI() {
  try {
    console.log('🔍 Testing BDNS API v2.1 directly...');
    
    const url = 'https://www.infosubvenciones.es/bdnstrans/GE/es/api/v2.1/listadoconvocatoria';
    const params = {
      'fecha-desde': '01/01/2024',
      'fecha-hasta': '31/03/2024',
      'page-size': 2,
      'page': 0
    };
    
    console.log('📋 Making request to:', url);
    console.log('📋 Parameters:', params);
    
    const response = await axios.get(url, {
      params,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ Direct API call successful!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data type:', typeof response.data);
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      const data = response.data[0];
      console.log('📊 Response structure:');
      console.log('  - Keys:', Object.keys(data));
      console.log('  - Page size:', data['page-size']);
      console.log('  - Page:', data['page']);
      console.log('  - Total pages:', data['total-pages']);
      
      if (data.convocatorias) {
        const convocatorias = Object.values(data.convocatorias);
        console.log('  - Convocatorias found:', convocatorias.length);
        
        if (convocatorias.length > 0) {
          const first = convocatorias[0];
          console.log('\n📝 First convocatoria:');
          console.log('  - Código BDNS:', first['codigo-BDNS']);
          console.log('  - Título:', first.titulo);
          console.log('  - Órgano:', first['desc-organo']);
          console.log('  - Fecha registro:', first['fecha-registro']);
          console.log('  - Inicio solicitud:', first['inicio-solicitud']);
          console.log('  - Fin solicitud:', first['fin-solicitud']);
          console.log('  - Financiación:', first.financiacion);
          console.log('  - Enlace:', first['permalink-convocatoria']);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Direct API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testDirectAPI();