#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');

// Configuration
const BDNS_API_BASE = 'https://www.infosubvenciones.es/bdnstrans';
const BATCH_SIZE = 100; // Records per API call
const MAX_CONCURRENT_REQUESTS = 3; // Limit concurrent API calls
const DELAY_BETWEEN_REQUESTS = 200; // ms delay between requests

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bdns_user:bdns_password@localhost:5432/bdns_db',
  max: 10,
});

class BDNSDataSynchronizer {
  constructor() {
    this.syncId = null;
    this.totalPages = 0;
    this.processedPages = 0;
    this.totalRecords = 0;
    this.processedRecords = 0;
    this.newRecords = 0;
    this.updatedRecords = 0;
    this.errors = [];
    this.startTime = Date.now();
  }

  async run(fullSync = false, completeMigration = false) {
    console.log('🚀 Starting BDNS Data Synchronization...');
    
    let mode = 'Incremental sync';
    if (completeMigration) {
      mode = 'Complete Migration (ALL Historical Data)';
    } else if (fullSync) {
      mode = 'Full sync';
    }
    
    console.log(`📊 Mode: ${mode}`);
    console.log(`📅 Date: ${new Date().toLocaleString()}`);
    
    try {
      // Initialize sync tracking
      const syncType = completeMigration ? 'complete' : fullSync;
      await this.initializeSync(syncType);
      
      // Get date range for sync
      const dateRange = await this.getDateRange(fullSync, completeMigration);
      console.log(`📅 Sync date range: ${dateRange.desde} to ${dateRange.hasta}`);
      
      // Get total pages to sync
      await this.getTotalPages(dateRange);
      console.log(`📊 Total pages to sync: ${this.totalPages.toLocaleString()}`);
      console.log(`📊 Estimated total records: ${(this.totalPages * BATCH_SIZE).toLocaleString()}`);
      
      if (completeMigration) {
        console.log(`🔄 COMPLETE MIGRATION: Processing ALL ${this.totalPages.toLocaleString()} pages...`);
        console.log(`⏱️ Estimated time: ${Math.round(this.totalPages / 60)} hours`);
      }
      
      // Start synchronization
      await this.syncAllPages(dateRange);
      
      // Complete sync
      await this.completeSync('completed');
      
      this.printSummary();
      
    } catch (error) {
      console.error('💥 Synchronization failed:', error.message);
      if (this.syncId) {
        await this.completeSync('failed', error.message);
      }
      process.exit(1);
    } finally {
      await pool.end();
    }
  }

  async initializeSync(fullSync) {
    const syncType = fullSync ? 'full' : 'incremental';
    const query = `
      INSERT INTO sync_status (sync_type, started_at, sync_parameters)
      VALUES ($1, NOW(), $2)
      RETURNING id
    `;
    const params = {
      batch_size: BATCH_SIZE,
      max_concurrent: MAX_CONCURRENT_REQUESTS,
      full_sync: fullSync
    };
    
    const result = await pool.query(query, [syncType, JSON.stringify(params)]);
    this.syncId = result.rows[0].id;
    console.log(`📝 Sync initialized with ID: ${this.syncId}`);
  }

  async getDateRange(fullSync, completeMigration = false) {
    if (completeMigration) {
      // Complete migration: get ALL historical data
      const currentYear = new Date().getFullYear();
      return {
        desde: '01/01/2008',  // BDNS started around 2008
        hasta: `31/12/${currentYear + 1}`
      };
    } else if (fullSync) {
      // Regular full sync: get recent data from 2023 to next year
      const currentYear = new Date().getFullYear();
      return {
        desde: '01/01/2023',
        hasta: `31/12/${currentYear + 1}`
      };
    } else {
      // Incremental sync: get data from last sync date
      const query = "SELECT config_value FROM search_config WHERE config_key = 'last_full_sync'";
      const result = await pool.query(query);
      const lastSync = new Date(result.rows[0].config_value);
      const today = new Date();
      
      return {
        desde: this.formatDateForBDNS(lastSync),
        hasta: this.formatDateForBDNS(today)
      };
    }
  }

  async getTotalPages(dateRange) {
    try {
      const response = await this.makeAPIRequest(0, 1, dateRange);
      
      if (Array.isArray(response) && response.length > 0) {
        this.totalPages = response[0]['total-pages'] || 1;
        this.totalRecords = this.totalPages * BATCH_SIZE; // Approximate
      } else {
        throw new Error('Invalid API response format');
      }
      
      // Update sync status with total pages
      await pool.query(
        'UPDATE sync_status SET total_pages = $1, total_records = $2 WHERE id = $3',
        [this.totalPages, this.totalRecords, this.syncId]
      );
    } catch (error) {
      console.error('❌ Failed to get total pages:', error.message);
      throw error;
    }
  }

  async syncAllPages(dateRange) {
    console.log('\n🔄 Starting page-by-page synchronization...');
    
    const semaphore = new Semaphore(MAX_CONCURRENT_REQUESTS);
    const promises = [];
    
    for (let page = 0; page < this.totalPages; page++) {
      const promise = semaphore.acquire().then(async (release) => {
        try {
          await this.syncPage(page, dateRange);
          
          // Update progress
          this.processedPages++;
          if (this.processedPages % 10 === 0 || this.processedPages === this.totalPages) {
            await this.updateProgress();
            this.printProgress();
          }
          
        } catch (error) {
          console.error(`❌ Error syncing page ${page}:`, error.message);
          this.errors.push({ page, error: error.message });
        } finally {
          release();
        }
      });
      
      promises.push(promise);
      
      // Add delay to avoid overwhelming the API
      if (promises.length % MAX_CONCURRENT_REQUESTS === 0) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
    }
    
    await Promise.all(promises);
    console.log('\n✅ All pages processed!');
  }

  async syncPage(page, dateRange) {
    try {
      const response = await this.makeAPIRequest(page, BATCH_SIZE, dateRange);
      
      if (!Array.isArray(response) || response.length === 0) {
        console.warn(`⚠️ Page ${page}: No data received`);
        return;
      }

      const data = response[0];
      if (!data.convocatorias) {
        console.warn(`⚠️ Page ${page}: No convocatorias in response`);
        return;
      }

      const convocatorias = Object.values(data.convocatorias);
      
      for (const convocatoria of convocatorias) {
        try {
          await this.upsertConvocatoria(convocatoria);
          this.processedRecords++;
        } catch (error) {
          console.warn(`⚠️ Skipping problematic convocatoria ${convocatoria['codigo-BDNS']}: ${error.message}`);
          this.errors.push({ 
            page, 
            convocatoria: convocatoria['codigo-BDNS'], 
            error: error.message 
          });
          // Continue with next record instead of failing the page
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to sync page ${page}:`, error.message);
      throw error;
    }
  }

  async makeAPIRequest(page, pageSize, dateRange) {
    const url = `${BDNS_API_BASE}/GE/es/api/v2.1/listadoconvocatoria`;
    const params = {
      page: page,
      'page-size': pageSize,
      'fecha-desde': dateRange.desde,
      'fecha-hasta': dateRange.hasta
    };

    const response = await axios.get(url, {
      params,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BDNS-Sync-Service/1.0'
      }
    });

    return response.data;
  }

  async upsertConvocatoria(convocatoria) {
    const query = `
      INSERT INTO convocatorias (
        codigo_bdns, titulo, titulo_cooficial, desc_organo, dir3_organo,
        fecha_registro, fecha_mod, inicio_solicitud, fin_solicitud,
        abierto, region, financiacion, importe_total,
        finalidad, instrumento, sector, tipo_beneficiario,
        descripcion_br, url_esp_br, fondo_ue,
        permalink_convocatoria, permalink_concesiones
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
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
      RETURNING (xmax = 0) AS inserted
    `;

    const values = [
      convocatoria['codigo-BDNS'],
      convocatoria.titulo || '',
      convocatoria['titulo-cooficial'] || null,
      convocatoria['desc-organo'] || '',
      convocatoria['dir3-organo'] || null,
      this.parseDate(convocatoria['fecha-registro']),
      this.parseDate(convocatoria['fecha-mod']),
      this.parseDate(convocatoria['inicio-solicitud']),
      this.parseDate(convocatoria['fin-solicitud']),
      convocatoria.abierto || false,
      JSON.stringify(convocatoria.region || []),
      JSON.stringify(convocatoria.financiacion || []),
      this.extractImporteTotal(convocatoria.financiacion),
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

    try {
      const result = await pool.query(query, values);
      if (result.rows[0].inserted) {
        this.newRecords++;
      } else {
        this.updatedRecords++;
      }
    } catch (error) {
      // Don't log full error details for common issues, just throw to be caught by caller
      throw error;
    }
  }

  async updateProgress() {
    await pool.query(
      `UPDATE sync_status 
       SET processed_pages = $1, processed_records = $2, new_records = $3, updated_records = $4
       WHERE id = $5`,
      [this.processedPages, this.processedRecords, this.newRecords, this.updatedRecords, this.syncId]
    );
  }

  async completeSync(status, errorMessage = null) {
    await pool.query(
      `UPDATE sync_status 
       SET completed_at = NOW(), status = $1, error_message = $2
       WHERE id = $3`,
      [status, errorMessage, this.syncId]
    );

    if (status === 'completed') {
      await pool.query(
        "UPDATE search_config SET config_value = NOW()::date::text WHERE config_key = 'last_full_sync'"
      );
    }
  }

  printProgress() {
    const elapsed = Date.now() - this.startTime;
    const pagesPerSecond = this.processedPages / (elapsed / 1000);
    const eta = this.totalPages > this.processedPages ? 
      (this.totalPages - this.processedPages) / pagesPerSecond : 0;

    console.log(`📊 Progress: ${this.processedPages}/${this.totalPages} pages ` +
                `(${((this.processedPages / this.totalPages) * 100).toFixed(1)}%) | ` +
                `Records: ${this.processedRecords.toLocaleString()} | ` +
                `Speed: ${pagesPerSecond.toFixed(1)} pages/s | ` +
                `ETA: ${this.formatDuration(eta * 1000)}`);
  }

  printSummary() {
    const elapsed = Date.now() - this.startTime;
    
    console.log('\n🎉 Synchronization Complete!');
    console.log('=====================================');
    console.log(`📊 Total Pages: ${this.processedPages.toLocaleString()}`);
    console.log(`📊 Total Records: ${this.processedRecords.toLocaleString()}`);
    console.log(`📊 New Records: ${this.newRecords.toLocaleString()}`);
    console.log(`📊 Updated Records: ${this.updatedRecords.toLocaleString()}`);
    console.log(`📊 Errors: ${this.errors.length}`);
    console.log(`⏱️ Duration: ${this.formatDuration(elapsed)}`);
    console.log(`⚡ Speed: ${(this.processedRecords / (elapsed / 1000)).toFixed(1)} records/s`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.slice(0, 5).forEach(error => {
        console.log(`  Page ${error.page}: ${error.error}`);
      });
      if (this.errors.length > 5) {
        console.log(`  ... and ${this.errors.length - 5} more errors`);
      }
    }
  }

  // Helper methods
  parseDate(dateStr) {
    // Return null for obviously invalid values
    if (!dateStr || 
        dateStr === '' || 
        dateStr === '0' || 
        dateStr === 'null' || 
        dateStr === 'undefined' ||
        dateStr === 'NaN' ||
        String(dateStr).includes('NaN') ||
        String(dateStr).includes('Invalid') ||
        String(dateStr).length > 50) {  // Reject extremely long strings
      return null;
    }
    
    try {
      // Handle different date formats
      if (typeof dateStr === 'string') {
        // Clean the date string and check for invalid patterns
        dateStr = dateStr.trim();
        
        // Reject dates that contain invalid patterns
        if (dateStr.includes('NaN') || 
            dateStr.includes('0NaN') || 
            dateStr.includes('undefined') ||
            dateStr.includes('Invalid') ||
            dateStr === '00/00/0000' ||
            dateStr === '0000-00-00') {
          return null;
        }
        
        // Handle DD/MM/YYYY format
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            
            // Ultra-strict validation of parsed values
            if (isNaN(day) || isNaN(month) || isNaN(year) || 
                day < 1 || day > 31 || 
                month < 0 || month > 11 || 
                year < 2008 || year > 2100 ||  // BDNS started around 2008
                parts[0] === '00' || parts[1] === '00' || parts[2] === '0000') {
              return null;
            }
            
            const date = new Date(year, month, day);
            // Ultra-strict validation
            if (isNaN(date.getTime()) || 
                date.getFullYear() !== year ||
                date.getMonth() !== month ||
                date.getDate() !== day ||
                date.getTime() < new Date(2008, 0, 1).getTime() ||
                date.getTime() > new Date(2100, 11, 31).getTime()) {
              return null;
            }
            
            return date.toISOString().split('T')[0];
          }
        }
        
        // Try ISO format but be ultra-strict
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateStr.split('-').map(Number);
          if (year >= 2008 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const isoDate = new Date(dateStr + 'T00:00:00.000Z');
            if (!isNaN(isoDate.getTime())) {
              return isoDate.toISOString().split('T')[0];
            }
          }
        }
      }
    } catch (error) {
      // Return null for any error
    }
    
    return null;
  }

  arrayToPostgresArray(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
      return null;
    }
    
    // For JSONB array columns, return as JSON string
    return JSON.stringify(arr);
  }

  extractImporteTotal(financiacion) {
    if (!Array.isArray(financiacion) || financiacion.length === 0) {
      return null;
    }
    
    return financiacion.reduce((total, item) => {
      const importe = parseFloat(item.importe || '0');
      return total + (isNaN(importe) ? 0 : importe);
    }, 0);
  }

  formatDateForBDNS(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Semaphore for controlling concurrent requests
class Semaphore {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.waitingQueue = [];
  }

  acquire() {
    return new Promise((resolve) => {
      if (this.count < this.max) {
        this.count++;
        resolve(() => this.release());
      } else {
        this.waitingQueue.push(resolve);
      }
    });
  }

  release() {
    this.count--;
    if (this.waitingQueue.length > 0) {
      this.count++;
      const next = this.waitingQueue.shift();
      next(() => this.release());
    }
  }
}

// Main execution
async function main() {
  const fullSync = process.argv.includes('--full');
  const completeMigration = process.argv.includes('--complete');
  const synchronizer = new BDNSDataSynchronizer();
  await synchronizer.run(fullSync, completeMigration);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️ Sync interrupted by user');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Sync terminated');
  await pool.end();
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}