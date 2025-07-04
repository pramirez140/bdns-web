import { BDNSDatabase } from './database';
import { 
  ConvocatoriaData, 
  SearchFilters, 
  SearchResult, 
  SearchParams 
} from '@/types/bdns';

export class BDNSLocalClient {
  private db: BDNSDatabase;

  constructor() {
    this.db = new BDNSDatabase();
  }

  async buscarConvocatorias(filtros: SearchFilters = {}, params: SearchParams = {}): Promise<SearchResult<ConvocatoriaData>> {
    try {
      console.log('🔍 Searching local BDNS database...');
      console.log('📋 Filters:', filtros);
      console.log('📋 Params:', params);

      const startTime = Date.now();
      
      // Calculate pagination
      const page = params.page || 1;
      const pageSize = params.pageSize || 20;
      const offset = (page - 1) * pageSize;

      // Extract search parameters
      const searchTerm = filtros.query || params.query;
      const organoFilter = filtros.organoConvocante;
      const fechaDesde = filtros.fechaConvocatoria?.desde;
      const fechaHasta = filtros.fechaConvocatoria?.hasta;
      const importeMin = filtros.importeMinimo;
      const importeMax = filtros.importeMaximo;
      const soloAbiertas = filtros.estadoConvocatoria === 'abierta';

      // Build sort clause - default to newest grants first by publication date
      let sortClause = 'ORDER BY c.registration_date DESC';
      if (params.sortBy && params.sortOrder) {
        const sortFieldMap: { [key: string]: string } = {
          'fechaPublicacion': 'c.registration_date',
          'importeTotal': 'c.total_amount', 
          'titulo': 'c.title'
        };
        
        const dbField = sortFieldMap[params.sortBy];
        if (dbField) {
          sortClause = `ORDER BY ${dbField} ${params.sortOrder.toUpperCase()}`;
        }
      }

      // Perform search with sorting
      const results = await this.db.searchConvocatoriasWithSort(
        searchTerm,
        organoFilter,
        fechaDesde,
        fechaHasta,
        importeMin,
        importeMax,
        soloAbiertas,
        pageSize,
        offset,
        sortClause
      );

      // Get total count for pagination
      const totalCount = await this.db.getSearchCount(
        searchTerm,
        organoFilter,
        fechaDesde,
        fechaHasta,
        importeMin,
        importeMax,
        soloAbiertas
      );

      // Convert database results to our ConvocatoriaData format
      const convocatorias = results.map(row => this.mapDatabaseToConvocatoria(row));

      const searchTime = Date.now() - startTime;
      console.log(`✅ Local search completed in ${searchTime}ms`);
      console.log(`📊 Found ${totalCount} total results, returning ${convocatorias.length} for page ${page}`);

      return {
        data: convocatorias,
        total: totalCount,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      };

    } catch (error: any) {
      console.error('💥 Local database search failed:', error.message);
      throw new Error(`Database search failed: ${error.message}`);
    }
  }

  async obtenerDetalleConvocatoria(id: string): Promise<ConvocatoriaData> {
    try {
      console.log(`🔍 Getting convocatoria details for ID: ${id}`);

      // Search by codigo_bdns
      const results = await this.db.searchConvocatorias(undefined, undefined, undefined, undefined, undefined, undefined, false, 1, 0);
      
      // For now, let's implement a direct query to get by bdns_code
      const query = `
        SELECT 
          c.bdns_code as codigo_bdns, 
          c.title as titulo, 
          c.title_co_official as titulo_cooficial, 
          o.name as desc_organo,
          c.registration_date as fecha_registro, 
          c.modification_date as fecha_mod, 
          c.application_start_date as inicio_solicitud, 
          c.application_end_date as fin_solicitud,
          c.is_open as abierto, 
          c.total_amount as importe_total,
          c.max_beneficiary_amount as importe_maximo_beneficiario,
          c.description_br, 
          c.url_esp_br, 
          c.eu_fund as fondo_ue,
          c.permalink_grant as permalink_convocatoria, 
          c.permalink_awards as permalink_concesiones,
          c.legacy_financiacion as financiacion,
          c.legacy_finalidad as finalidad,
          c.legacy_instrumento as instrumento,
          c.legacy_sector as sector,
          c.legacy_tipo_beneficiario as tipo_beneficiario
        FROM convocatorias c
        JOIN organizations o ON c.organization_id = o.id
        WHERE c.bdns_code = $1 
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error(`Convocatoria with ID ${id} not found`);
      }

      return this.mapDatabaseToConvocatoria(result.rows[0]);

    } catch (error: any) {
      console.error(`💥 Failed to get convocatoria detail for ${id}:`, error.message);
      throw error;
    }
  }

  async getSyncStatistics() {
    try {
      const stats = await this.db.getSyncStatistics();
      return {
        total_convocatorias: parseInt(stats.total_convocatorias || '0'),
        convocatorias_abiertas: parseInt(stats.convocatorias_abiertas || '0'),
        fecha_mas_antigua: stats.fecha_mas_antigua,
        fecha_mas_reciente: stats.fecha_mas_reciente,
        total_organismos: parseInt(stats.total_organismos || '0'),
        importe_promedio: parseFloat(stats.importe_promedio || '0'),
        importe_total_acumulado: parseFloat(stats.importe_total_acumulado || '0'),
        ultima_sincronizacion: stats.ultima_sincronizacion
      };
    } catch (error: any) {
      console.error('💥 Failed to get sync statistics:', error.message);
      throw error;
    }
  }

  async getLatestSyncInfo() {
    try {
      const query = `
        SELECT id, sync_type, status, started_at, completed_at, 
               processed_pages, processed_records, new_records, updated_records,
               error_message
        FROM sync_status 
        ORDER BY started_at DESC 
        LIMIT 1
      `;
      const result = await this.db.query(query);
      return result.rows[0] || null;
    } catch (error: any) {
      console.error('💥 Failed to get latest sync info:', error.message);
      throw error;
    }
  }

  private mapDatabaseToConvocatoria(row: any): ConvocatoriaData {
    // Parse JSON fields safely
    const parseJSON = (jsonStr: string | object, defaultValue: any = {}) => {
      if (typeof jsonStr === 'object') return jsonStr;
      try {
        return JSON.parse(jsonStr);
      } catch {
        return defaultValue;
      }
    };

    const financiacion = parseJSON(row.financiacion, []);
    const finalidad = parseJSON(row.finalidad, {});
    const tipoBeneficiario = parseJSON(row.tipo_beneficiario, []);
    const instrumento = parseJSON(row.instrumento, []);
    const sector = parseJSON(row.sector, []);

    return {
      identificador: row.codigo_bdns, // This is aliased in the query
      titulo: row.titulo || '', // This is aliased in the query
      organoConvocante: row.desc_organo || '', // This is aliased in the query  
      fechaPublicacion: row.fecha_registro || new Date(), // This is aliased in the query
      fechaApertura: row.inicio_solicitud || row.fecha_registro || new Date(), // This is aliased in the query
      fechaCierre: row.fin_solicitud || null, // This is aliased in the query
      importeTotal: parseFloat(row.importe_total || '0'), // This is aliased in the query
      importeMaximoBeneficiario: parseFloat(row.importe_maximo_beneficiario || '0'),
      objetivos: finalidad.descripcion || row.titulo || 'Consultar convocatoria para objetivos específicos',
      beneficiarios: this.extractBeneficiariosDescription(tipoBeneficiario),
      requisitos: row.descripcion_br ? [row.descripcion_br] : ['Consultar bases oficiales de la convocatoria'],
      documentacionRequerida: row.url_esp_br ? ['Ver bases reguladoras', row.url_esp_br] : ['Consultar bases oficiales de la convocatoria'],
      criteriosSeleccion: ['Consultar bases oficiales de la convocatoria'],
      enlaceOficial: row.permalink_convocatoria || `https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias/${row.codigo_bdns}`,
      boe: row.url_esp_br || '',
      enlaceBOE: row.url_esp_br || ''
    };
  }

  private extractBeneficiariosDescription(tipoBeneficiario: any[]): string {
    if (!Array.isArray(tipoBeneficiario) || tipoBeneficiario.length === 0) {
      return 'Consultar bases de la convocatoria';
    }
    
    return tipoBeneficiario
      .map(tipo => tipo.descripcion || tipo.codigo)
      .filter(Boolean)
      .join(', ');
  }

  // Health check for database connection
  async isHealthy(): Promise<boolean> {
    try {
      const stats = await this.getSyncStatistics();
      return stats.total_convocatorias > 0;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const bdnsLocalClient = new BDNSLocalClient();