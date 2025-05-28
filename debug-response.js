const axios = require('axios');

async function debugResponse() {
  try {
    console.log('🔍 Debugging BDNS API response...');
    
    const url = 'https://www.infosubvenciones.es/bdnstrans/GE/es/api/v2.1/listadoconvocatoria';
    const params = {
      'fecha-desde': '01/01/2024',
      'fecha-hasta': '31/03/2024',
      'page-size': 3,
      'page': 0
    };
    
    const response = await axios.get(url, {
      params,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ API Response received');
    console.log('📊 Response type:', typeof response.data);
    console.log('📊 Response keys:', Object.keys(response.data));
    
    const data = response.data;
    
    console.log('\n📋 Response structure:');
    console.log('  - page:', data.page);
    console.log('  - page-size:', data['page-size']);
    console.log('  - total-pages:', data['total-pages']);
    console.log('  - convocatorias type:', typeof data.convocatorias);
    
    if (data.convocatorias) {
      console.log('  - convocatorias keys:', Object.keys(data.convocatorias));
      const convocatoriasArray = Object.values(data.convocatorias);
      console.log('  - convocatorias count:', convocatoriasArray.length);
      
      if (convocatoriasArray.length > 0) {
        console.log('\n📝 First convocatoria structure:');
        const first = convocatoriasArray[0];
        console.log('    Keys:', Object.keys(first));
        
        console.log('\n📝 First convocatoria sample data:');
        console.log('    - codigo-BDNS:', first['codigo-BDNS']);
        console.log('    - titulo:', first.titulo ? first.titulo.substring(0, 50) + '...' : 'N/A');
        console.log('    - desc-organo:', first['desc-organo'] ? first['desc-organo'].substring(0, 50) + '...' : 'N/A');
        console.log('    - fecha-registro:', first['fecha-registro']);
        console.log('    - inicio-solicitud:', first['inicio-solicitud']);
        console.log('    - fin-solicitud:', first['fin-solicitud']);
        console.log('    - financiacion:', first.financiacion);
        console.log('    - finalidad:', first.finalidad);
        console.log('    - tipo-beneficiario:', first['tipo-beneficiario']);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugResponse();