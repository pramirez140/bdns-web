const axios = require('axios');

// Simulate the BDNS client functionality
class TestBDNSClient {
  constructor() {
    this.baseUrl = 'https://www.infosubvenciones.es/bdnstrans';
    this.api = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
  }

  buildBDNSv21Params(filtros, params) {
    const queryParams = {
      page: (params.page || 1) - 1,
      'page-size': params.pageSize || 20,
    };

    if (filtros.fechaConvocatoria?.desde) {
      queryParams['fecha-desde'] = this.formatDateForBDNS(filtros.fechaConvocatoria.desde);
    } else {
      const currentYear = new Date().getFullYear();
      queryParams['fecha-desde'] = `01/01/${currentYear}`;
    }

    if (filtros.fechaConvocatoria?.hasta) {
      queryParams['fecha-hasta'] = this.formatDateForBDNS(filtros.fechaConvocatoria.hasta);
    } else {
      const currentYear = new Date().getFullYear();
      queryParams['fecha-hasta'] = `31/12/${currentYear}`;
    }

    return queryParams;
  }

  formatDateForBDNS(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  parseSpanishDate(dateStr) {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    } catch (error) {
      console.log('❌ Error parsing date:', dateStr);
    }
    return null;
  }

  extractImporteFromFinanciacion(financiacion) {
    if (!Array.isArray(financiacion) || financiacion.length === 0) {
      return 0;
    }
    
    return financiacion.reduce((total, item) => {
      const importe = parseFloat(item.importe || '0');
      return total + (isNaN(importe) ? 0 : importe);
    }, 0);
  }

  extractBeneficiariosFromTipo(tipoBeneficiario) {
    if (!Array.isArray(tipoBeneficiario) || tipoBeneficiario.length === 0) {
      return 'Consultar bases de la convocatoria';
    }
    
    return tipoBeneficiario
      .map(tipo => tipo.descripcion || tipo.codigo)
      .filter(Boolean)
      .join(', ');
  }

  mapBDNSv21ToConvocatoria(item) {
    return {
      identificador: item['codigo-BDNS'] || `BDNS-${Date.now()}`,
      titulo: item.titulo || 'Título no disponible',
      organoConvocante: item['desc-organo'] || 'Organismo no especificado',
      fechaPublicacion: this.parseSpanishDate(item['fecha-registro']) || new Date(),
      fechaApertura: this.parseSpanishDate(item['inicio-solicitud']) || this.parseSpanishDate(item['fecha-registro']) || new Date(),
      fechaCierre: this.parseSpanishDate(item['fin-solicitud']) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      importeTotal: this.extractImporteFromFinanciacion(item.financiacion) || 0,
      importeMaximoBeneficiario: 0,
      objetivos: item.finalidad?.descripcion || item.titulo || 'Consultar convocatoria para objetivos específicos',
      beneficiarios: this.extractBeneficiariosFromTipo(item['tipo-beneficiario']) || 'Consultar bases de la convocatoria',
      requisitos: item.descripcionBR ? [item.descripcionBR] : ['Consultar bases oficiales de la convocatoria'],
      documentacionRequerida: item.URLespBR ? ['Ver bases reguladoras', item.URLespBR] : ['Consultar bases oficiales de la convocatoria'],
      criteriosSeleccion: ['Consultar bases oficiales de la convocatoria'],
      enlaceOficial: item['permalink-convocatoria'] || `${this.baseUrl}/GE/es/convocatorias/${item['codigo-BDNS']}`,
      boe: item.URLespBR || '',
      enlaceBOE: item.URLespBR || ''
    };
  }

  async buscarConvocatorias(filtros = {}, params = {}) {
    try {
      console.log('🔍 Connecting to BDNS API v2.1...');
      
      const endpoint = '/GE/es/api/v2.1/listadoconvocatoria';
      const queryParams = this.buildBDNSv21Params(filtros, params);
      
      console.log('📋 Request params:', queryParams);
      
      const response = await this.api.get(endpoint, { params: queryParams });
      
      console.log('✅ BDNS API SUCCESS!');
      
      const data = response.data;
      let convocatorias = [];
      let totalElements = 0;
      let pageNumber = 0;
      let pageSize = params.pageSize || 20;
      let totalPages = 1;

      // Handle the array wrapper format
      let actualData = data;
      if (Array.isArray(data) && data.length > 0) {
        actualData = data[0];
        console.log('📊 Extracted data from array wrapper');
      }
      
      if (actualData && typeof actualData === 'object') {
        pageSize = actualData['page-size'] || params.pageSize || 20;
        pageNumber = actualData['page'] || 0;
        totalPages = actualData['total-pages'] || 1;
        totalElements = totalPages * pageSize;
        
        console.log(`📊 Pagination: page ${pageNumber + 1} of ${totalPages}, size ${pageSize}`);
        
        if (actualData.convocatorias && typeof actualData.convocatorias === 'object') {
          convocatorias = Object.values(actualData.convocatorias);
          console.log(`📊 Found ${convocatorias.length} convocatorias`);
        }
      }

      if (convocatorias.length > 0) {
        const mappedData = convocatorias.map(item => this.mapBDNSv21ToConvocatoria(item));

        // Apply text filtering if needed
        let filteredData = mappedData;
        const searchTerm = filtros.query || params.query;
        if (searchTerm) {
          const searchQuery = searchTerm.toLowerCase();
          filteredData = mappedData.filter(item => 
            item.titulo.toLowerCase().includes(searchQuery) ||
            item.organoConvocante.toLowerCase().includes(searchQuery) ||
            item.objetivos.toLowerCase().includes(searchQuery) ||
            item.beneficiarios.toLowerCase().includes(searchQuery)
          );
          console.log(`🔍 Filtered from ${mappedData.length} to ${filteredData.length} results for "${searchQuery}"`);
        }

        return {
          data: filteredData,
          total: searchTerm ? filteredData.length : totalElements,
          page: pageNumber + 1,
          pageSize: pageSize,
          totalPages: searchTerm ? Math.ceil(filteredData.length / pageSize) : totalPages
        };
      }

      throw new Error('No convocatorias found');
      
    } catch (error) {
      console.error('❌ BDNS API Error:', error.message);
      throw error;
    }
  }
}

// Test the integration
async function testIntegration() {
  try {
    console.log('🧪 Testing BDNS Integration...\n');
    
    const client = new TestBDNSClient();
    
    const filters = {
      fechaConvocatoria: {
        desde: new Date('2024-01-01'),
        hasta: new Date('2024-03-31')
      }
    };
    
    const params = {
      page: 1,
      pageSize: 3
    };
    
    const result = await client.buscarConvocatorias(filters, params);
    
    console.log('\n✅ Integration test successful!');
    console.log('📊 Results Summary:');
    console.log(`  - Total: ${result.total.toLocaleString()}`);
    console.log(`  - Page: ${result.page} of ${result.totalPages}`);
    console.log(`  - Page Size: ${result.pageSize}`);
    console.log(`  - Results in this page: ${result.data.length}`);
    
    console.log('\n📝 Sample Convocatorias:');
    result.data.forEach((conv, i) => {
      console.log(`\n${i + 1}. ${conv.titulo}`);
      console.log(`   Órgano: ${conv.organoConvocante}`);
      console.log(`   ID: ${conv.identificador}`);
      console.log(`   Importe: ${conv.importeTotal.toLocaleString()}€`);
      console.log(`   Fecha apertura: ${conv.fechaApertura.toLocaleDateString('es-ES')}`);
      console.log(`   Fecha cierre: ${conv.fechaCierre.toLocaleDateString('es-ES')}`);
      console.log(`   Beneficiarios: ${conv.beneficiarios}`);
      console.log(`   Enlace: ${conv.enlaceOficial}`);
    });
    
    // Test with search query
    console.log('\n🔍 Testing search functionality...');
    const searchFilters = {
      ...filters,
      query: 'centro'
    };
    
    const searchResult = await client.buscarConvocatorias(searchFilters, { pageSize: 5 });
    
    console.log(`\n📊 Search results for "centro": ${searchResult.data.length} matches`);
    searchResult.data.forEach((conv, i) => {
      console.log(`${i + 1}. ${conv.titulo.substring(0, 80)}...`);
    });
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}

testIntegration();