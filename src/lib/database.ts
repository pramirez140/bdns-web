import { Pool, PoolClient } from 'pg';

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bdns_user:bdns_password@localhost:5432/bdns_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Database connection wrapper
export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = pool;
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0].health === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// BDNS-specific database operations
export class BDNSDatabase {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  // Expose query method for direct SQL queries
  async query(text: string, params?: any[]): Promise<any> {
    return await this.db.query(text, params);
  }

  // Insert or update convocatoria
  async upsertConvocatoria(convocatoria: any): Promise<void> {
    const query = `
      INSERT INTO convocatorias (
        codigo_bdns, titulo, titulo_cooficial, desc_organo, dir3_organo,
        fecha_registro, fecha_mod, inicio_solicitud, fin_solicitud,
        abierto, region, financiacion, importe_total, importe_maximo_beneficiario,
        finalidad, instrumento, sector, tipo_beneficiario,
        descripcion_br, url_esp_br, fondo_ue,
        permalink_convocatoria, permalink_concesiones
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      )
      ON CONFLICT (codigo_bdns) 
      DO UPDATE SET
        titulo = EXCLUDED.titulo,
        titulo_cooficial = EXCLUDED.titulo_cooficial,
        desc_organo = EXCLUDED.desc_organo,
        dir3_organo = EXCLUDED.dir3_organo,
        fecha_mod = EXCLUDED.fecha_mod,
        inicio_solicitud = EXCLUDED.inicio_solicitud,
        fin_solicitud = EXCLUDED.fin_solicitud,
        abierto = EXCLUDED.abierto,
        region = EXCLUDED.region,
        financiacion = EXCLUDED.financiacion,
        importe_total = EXCLUDED.importe_total,
        importe_maximo_beneficiario = EXCLUDED.importe_maximo_beneficiario,
        finalidad = EXCLUDED.finalidad,
        instrumento = EXCLUDED.instrumento,
        sector = EXCLUDED.sector,
        tipo_beneficiario = EXCLUDED.tipo_beneficiario,
        descripcion_br = EXCLUDED.descripcion_br,
        url_esp_br = EXCLUDED.url_esp_br,
        fondo_ue = EXCLUDED.fondo_ue,
        permalink_convocatoria = EXCLUDED.permalink_convocatoria,
        permalink_concesiones = EXCLUDED.permalink_concesiones,
        updated_at = NOW(),
        last_synced_at = NOW()
    `;

    const values = [
      convocatoria['codigo-BDNS'],
      convocatoria.titulo,
      convocatoria['titulo-cooficial'] || null,
      convocatoria['desc-organo'],
      convocatoria['dir3-organo'] || null,
      this.parseDate(convocatoria['fecha-registro']),
      this.parseDate(convocatoria['fecha-mod']),
      this.parseDate(convocatoria['inicio-solicitud']),
      this.parseDate(convocatoria['fin-solicitud']),
      convocatoria.abierto || false,
      convocatoria.region || [],
      JSON.stringify(convocatoria.financiacion || {}),
      this.extractImporteTotal(convocatoria.financiacion),
      null, // importe_maximo_beneficiario not in v2.1 API
      JSON.stringify(convocatoria.finalidad || {}),
      JSON.stringify(convocatoria.instrumento || []),
      JSON.stringify(convocatoria.sector || []),
      JSON.stringify(convocatoria['tipo-beneficiario'] || []),
      convocatoria.descripcionBR || null,
      convocatoria.URLespBR || null,
      convocatoria.fondoUE || null,
      convocatoria['permalink-convocatoria'] || null,
      convocatoria['permalink-concesiones'] || null
    ];

    await this.db.query(query, values);
  }

  // Search convocatorias using the database function
  async searchConvocatorias(
    searchTerm?: string,
    organoFilter?: string,
    fechaDesde?: Date,
    fechaHasta?: Date,
    importeMin?: number,
    importeMax?: number,
    soloAbiertas?: boolean,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    const query = `
      SELECT * FROM search_convocatorias($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    const values = [
      searchTerm || null,
      organoFilter || null,
      fechaDesde || null,
      fechaHasta || null,
      importeMin || null,
      importeMax || null,
      soloAbiertas || false,
      limit,
      offset
    ];

    const result = await this.db.query(query, values);
    return result.rows;
  }

  // Get total count for search
  async getSearchCount(
    searchTerm?: string,
    organoFilter?: string,
    fechaDesde?: Date,
    fechaHasta?: Date,
    importeMin?: number,
    importeMax?: number,
    soloAbiertas?: boolean
  ): Promise<number> {
    let query = `
      SELECT COUNT(*) as total
      FROM convocatorias c
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramIndex = 1;

    if (searchTerm) {
      query += ` AND (
        c.search_vector @@ plainto_tsquery('spanish', $${paramIndex}) OR
        c.titulo ILIKE '%' || $${paramIndex} || '%' OR
        c.desc_organo ILIKE '%' || $${paramIndex} || '%'
      )`;
      values.push(searchTerm);
      paramIndex++;
    }

    if (organoFilter) {
      query += ` AND c.desc_organo ILIKE '%' || $${paramIndex} || '%'`;
      values.push(organoFilter);
      paramIndex++;
    }

    if (fechaDesde) {
      query += ` AND c.fecha_registro >= $${paramIndex}`;
      values.push(fechaDesde);
      paramIndex++;
    }

    if (fechaHasta) {
      query += ` AND c.fecha_registro <= $${paramIndex}`;
      values.push(fechaHasta);
      paramIndex++;
    }

    if (importeMin) {
      query += ` AND c.importe_total >= $${paramIndex}`;
      values.push(importeMin);
      paramIndex++;
    }

    if (importeMax) {
      query += ` AND c.importe_total <= $${paramIndex}`;
      values.push(importeMax);
      paramIndex++;
    }

    if (soloAbiertas) {
      query += ` AND c.abierto = true`;
    }

    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].total);
  }

  // Get sync statistics
  async getSyncStatistics(): Promise<any> {
    const result = await this.db.query('SELECT * FROM sync_statistics');
    return result.rows[0];
  }

  // Record sync status
  async recordSyncStart(syncType: string, totalPages?: number, totalRecords?: number, parameters?: any): Promise<number> {
    const query = `
      INSERT INTO sync_status (sync_type, started_at, total_pages, total_records, sync_parameters)
      VALUES ($1, NOW(), $2, $3, $4)
      RETURNING id
    `;
    const values = [syncType, totalPages, totalRecords, JSON.stringify(parameters || {})];
    const result = await this.db.query(query, values);
    return result.rows[0].id;
  }

  // Update sync progress
  async updateSyncProgress(syncId: number, processedPages: number, processedRecords: number, newRecords: number, updatedRecords: number): Promise<void> {
    const query = `
      UPDATE sync_status 
      SET processed_pages = $2, processed_records = $3, new_records = $4, updated_records = $5
      WHERE id = $1
    `;
    await this.db.query(query, [syncId, processedPages, processedRecords, newRecords, updatedRecords]);
  }

  // Complete sync
  async completeSyncStatus(syncId: number, status: 'completed' | 'failed', errorMessage?: string): Promise<void> {
    const query = `
      UPDATE sync_status 
      SET completed_at = NOW(), status = $2, error_message = $3
      WHERE id = $1
    `;
    await this.db.query(query, [syncId, status, errorMessage || null]);

    // Update last sync time if successful
    if (status === 'completed') {
      await this.db.query(
        "UPDATE search_config SET config_value = NOW()::date::text WHERE config_key = 'last_full_sync'"
      );
    }
  }

  // Helper methods
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
    }
    return null;
  }

  private extractImporteTotal(financiacion: any[]): number | null {
    if (!Array.isArray(financiacion) || financiacion.length === 0) {
      return null;
    }
    
    return financiacion.reduce((total, item) => {
      const importe = parseFloat(item.importe || '0');
      return total + (isNaN(importe) ? 0 : importe);
    }, 0);
  }
}

export default Database;