const axios = require('axios');

async function debugDetailed() {
  try {
    console.log('🔍 Detailed debugging of BDNS API response...');
    
    const url = 'https://www.infosubvenciones.es/bdnstrans/GE/es/api/v2.1/listadoconvocatoria';
    const params = {
      'fecha-desde': '01/01/2024',
      'fecha-hasta': '31/03/2024',
      'page-size': 2,
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
    console.log('📊 Response is array:', Array.isArray(response.data));
    
    if (Array.isArray(response.data)) {
      console.log('📊 Array length:', response.data.length);
      if (response.data.length > 0) {
        const firstElement = response.data[0];
        console.log('📊 First element type:', typeof firstElement);
        console.log('📊 First element keys:', Object.keys(firstElement));
        
        // This should be our actual data
        const data = firstElement;
        console.log('\n📋 Actual data structure:');
        console.log('  - page:', data.page);
        console.log('  - page-size:', data['page-size']);
        console.log('  - total-pages:', data['total-pages']);
        console.log('  - convocatorias exists:', !!data.convocatorias);
        console.log('  - convocatorias type:', typeof data.convocatorias);
        
        if (data.convocatorias) {
          const convKeys = Object.keys(data.convocatorias);
          console.log('  - convocatorias keys count:', convKeys.length);
          console.log('  - convocatorias sample keys:', convKeys.slice(0, 3));
          
          const convocatoriasArray = Object.values(data.convocatorias);
          console.log('  - convocatorias array length:', convocatoriasArray.length);
          
          if (convocatoriasArray.length > 0) {
            console.log('\n📝 Sample convocatoria:');
            const sample = convocatoriasArray[0];
            console.log('    Keys:', Object.keys(sample));
            console.log('    codigo-BDNS:', sample['codigo-BDNS']);
            console.log('    titulo exists:', !!sample.titulo);
            console.log('    titulo length:', sample.titulo ? sample.titulo.length : 0);
          }
        }
      }
    } else {
      console.log('📊 Response keys:', Object.keys(response.data));
      console.log('📊 Full response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
}

debugDetailed();