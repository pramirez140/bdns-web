#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');

// Configuration
const BDNS_API_BASE = 'https://www.infosubvenciones.es/bdnstrans';
const BATCH_SIZE = 100; // Records per API call
const MAX_CONCURRENT_REQUESTS = 2; // Limit concurrent API calls
const DELAY_BETWEEN_REQUESTS = 500; // ms delay between requests
const MAX_RETRIES = 3; // Maximum retry attempts per request
const RETRY_DELAY = 2000; // ms delay between retries

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
    this.actualChanges = 0;      // Records with real changes (newer fecha_mod)
    this.touchedRecords = 0;     // Records with no changes (just touched)
    this.errors = [];
    this.startTime = Date.now();
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 10; // Circuit breaker threshold
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
      const syncType = completeMigration ? 'complete' : (fullSync ? 'full' : 'incremental');
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

  async initializeSync(syncType) {
    const query = `
      INSERT INTO sync_status (sync_type, started_at, sync_parameters)
      VALUES ($1, NOW(), $2)
      RETURNING id
    `;
    const params = {
      batch_size: BATCH_SIZE,
      max_concurrent: MAX_CONCURRENT_REQUESTS,
      sync_type: syncType
    };
    
    const result = await pool.query(query, [syncType, JSON.stringify(params)]);
    this.syncId = result.rows[0].id;
    console.log(`📝 Sync initialized with ID: ${this.syncId} (type: ${syncType})`);
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
      // Regular full sync: focus on current year data (optimized for relevance)
      const currentYear = new Date().getFullYear();
      return {
        desde: `01/01/${currentYear}`,  // Only current year
        hasta: `31/12/${currentYear}`
      };
    } else {
      // Incremental sync: get recent data (last 7 days)
      // Skip complex date logic and just get last week to ensure we have data
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      console.log(`[SYNC] 📅 Incremental sync: ${this.formatDateForBDNS(sevenDaysAgo)} to ${this.formatDateForBDNS(yesterday)}`);
      
      return {
        desde: this.formatDateForBDNS(sevenDaysAgo),
        hasta: this.formatDateForBDNS(yesterday)
      };
    }
  }

  async getTotalPages(dateRange) {
    try {
      // Use same page-size as actual sync to get accurate page count
      const response = await this.makeAPIRequest(0, BATCH_SIZE, dateRange);
      
      if (Array.isArray(response) && response.length > 0) {
        this.totalPages = response[0]['total-pages'] || 1;
        this.totalRecords = this.totalPages * BATCH_SIZE; // Approximate
        console.log(`📊 API reports ${this.totalPages} total pages to process (${BATCH_SIZE} records per page)`);
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
          
          // Reset consecutive failures on success
          this.consecutiveFailures = 0;
          
          // Update progress
          this.processedPages++;
          if (this.processedPages % 10 === 0 || this.processedPages === this.totalPages) {
            await this.updateProgress();
            this.printProgress();
          }
          
        } catch (error) {
          console.error(`❌ Error syncing page ${page}:`, error.message);
          this.errors.push({ page, error: error.message });
          this.consecutiveFailures++;
          
          // Circuit breaker: if too many consecutive failures, wait longer
          if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            console.log(`⚠️ Circuit breaker activated after ${this.consecutiveFailures} consecutive failures. Waiting 30 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 30000));
            this.consecutiveFailures = 0; // Reset after wait
          }
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

    return await this.makeAPIRequestWithRetry(url, params, MAX_RETRIES);
  }

  async makeAPIRequestWithRetry(url, params, maxRetries) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SYNC] 🔄 API request attempt ${attempt}/${maxRetries} for page ${params.page}`);
        
        const response = await axios.get(url, {
          params,
          timeout: 30000, // Increased timeout to 30 seconds
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'BDNS-Sync-Service/1.0'
          }
        });

        // Success - return data
        if (attempt > 1) {
          console.log(`[SYNC] ✅ Success on attempt ${attempt} for page ${params.page}`);
        }
        return response.data;

      } catch (error) {
        lastError = error;
        const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
        const isNetworkError = error.code === 'ECONNRESET' || error.code === 'ENOTFOUND';
        
        console.log(`[SYNC ERROR] ❌ Failed to sync page ${params.page}: ${error.message}`);
        
        if (attempt < maxRetries && (isTimeout || isNetworkError || error.response?.status >= 500)) {
          console.log(`[SYNC] 🔄 Retrying in ${RETRY_DELAY}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
        
        // If we've exhausted retries or got a non-retryable error, break
        break;
      }
    }
    
    // All retries failed
    throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  async upsertConvocatoria(convocatoria) {
    const codigoBdns = convocatoria['codigo-BDNS'];
    const newFechaMod = this.parseDate(convocatoria['fecha-mod']);
    
    // First, check if record exists and get current modification_date
    const existingQuery = `
      SELECT modification_date, last_synced_at
      FROM convocatorias 
      WHERE bdns_code = $1
    `;
    
    try {
      const existingResult = await pool.query(existingQuery, [codigoBdns]);
      
      if (existingResult.rows.length === 0) {
        // New record - INSERT
        await this.insertNewRecord(convocatoria);
        this.newRecords++;
        return { action: 'inserted', hasChanges: true, reason: 'new_record' };
        
      } else {
        const existing = existingResult.rows[0];
        const existingFechaMod = existing.modification_date;
        
        // Compare modification dates
        if (!newFechaMod || !existingFechaMod) {
          // Can't compare dates - assume change and update
          await this.updateExistingRecord(convocatoria);
          this.updatedRecords++;
          this.actualChanges++;
          return { action: 'updated', hasChanges: true, reason: 'missing_date' };
          
        } else if (newFechaMod > existingFechaMod) {
          // API has newer modification date - real change detected
          await this.updateExistingRecord(convocatoria);
          this.updatedRecords++;
          this.actualChanges++;
          return { action: 'updated', hasChanges: true, reason: 'newer_modification' };
          
        } else {
          // No change detected - just touch last_synced_at
          await this.touchRecord(codigoBdns);
          this.touchedRecords++;
          return { action: 'touched', hasChanges: false, reason: 'no_change' };
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async insertNewRecord(convocatoria) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Get or create organization
      const organizationId = await this.getOrCreateOrganization(
        convocatoria['desc-organo'] || '',
        convocatoria['dir3-organo'] || null,
        client
      );

      // 2. Insert main grant record
      const grantQuery = `
        INSERT INTO convocatorias (
          bdns_code, title, title_co_official, organization_id,
          registration_date, modification_date, application_start_date, application_end_date,
          is_open, total_amount, max_beneficiary_amount,
          description_br, url_esp_br, eu_fund,
          permalink_grant, permalink_awards, search_vector,
          legacy_financiacion, legacy_finalidad, legacy_instrumento, 
          legacy_sector, legacy_tipo_beneficiario, legacy_region,
          created_at, updated_at, last_synced_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
          NOW(), NOW(), NOW()
        ) RETURNING id
      `;

      const grantValues = [
        convocatoria['codigo-BDNS'],
        convocatoria.titulo || '',
        convocatoria['titulo-cooficial'] || null,
        organizationId,
        this.parseDate(convocatoria['fecha-registro']),
        this.parseDate(convocatoria['fecha-mod']),
        this.parseDate(convocatoria['inicio-solicitud']),
        this.parseDate(convocatoria['fin-solicitud']),
        convocatoria.abierto || false,
        this.extractImporteTotal(convocatoria.financiacion),
        null, // max_beneficiary_amount - not provided by API
        convocatoria.descripcionBR || null,
        convocatoria.URLespBR || null,
        convocatoria.fondoUE || null,
        convocatoria['permalink-convocatoria'] || null,
        convocatoria['permalink-concesiones'] || null,
        null, // search_vector - will be updated later
        JSON.stringify(convocatoria.financiacion || []),
        JSON.stringify(convocatoria.finalidad || {}),
        JSON.stringify(convocatoria.instrumento || []),
        JSON.stringify(convocatoria.sector || []),
        JSON.stringify(convocatoria['tipo-beneficiario'] || []),
        this.arrayToPostgresArray(convocatoria.region)
      ];

      const grantResult = await client.query(grantQuery, grantValues);
      const grantId = grantResult.rows[0].id;

      // 3. Update search vector
      await client.query(`
        UPDATE convocatorias 
        SET search_vector = to_tsvector('spanish', 
          COALESCE(title, '') || ' ' || 
          COALESCE(description_br, '')
        )
        WHERE id = $1
      `, [grantId]);

      // 4. Handle classification data in junction tables
      await this.insertClassificationData(grantId, convocatoria, client);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateExistingRecord(convocatoria) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Get or create organization (in case organization info changed)
      const organizationId = await this.getOrCreateOrganization(
        convocatoria['desc-organo'] || '',
        convocatoria['dir3-organo'] || null,
        client
      );

      // 2. Update main grant record
      const updateQuery = `
        UPDATE convocatorias SET
          title = $2,
          title_co_official = $3,
          organization_id = $4,
          modification_date = $5,
          application_start_date = $6,
          application_end_date = $7,
          is_open = $8,
          total_amount = $9,
          description_br = $10,
          url_esp_br = $11,
          eu_fund = $12,
          permalink_grant = $13,
          permalink_awards = $14,
          legacy_financiacion = $15,
          legacy_finalidad = $16,
          legacy_instrumento = $17,
          legacy_sector = $18,
          legacy_tipo_beneficiario = $19,
          legacy_region = $20,
          search_vector = to_tsvector('spanish', 
            COALESCE($2, '') || ' ' || 
            COALESCE($10, '')
          ),
          updated_at = NOW(),
          last_synced_at = NOW()
        WHERE bdns_code = $1
        RETURNING id
      `;

      const values = [
        convocatoria['codigo-BDNS'],
        convocatoria.titulo || '',
        convocatoria['titulo-cooficial'] || null,
        organizationId,
        this.parseDate(convocatoria['fecha-mod']),
        this.parseDate(convocatoria['inicio-solicitud']),
        this.parseDate(convocatoria['fin-solicitud']),
        convocatoria.abierto || false,
        this.extractImporteTotal(convocatoria.financiacion),
        convocatoria.descripcionBR || null,
        convocatoria.URLespBR || null,
        convocatoria.fondoUE || null,
        convocatoria['permalink-convocatoria'] || null,
        convocatoria['permalink-concesiones'] || null,
        JSON.stringify(convocatoria.financiacion || []),
        JSON.stringify(convocatoria.finalidad || {}),
        JSON.stringify(convocatoria.instrumento || []),
        JSON.stringify(convocatoria.sector || []),
        JSON.stringify(convocatoria['tipo-beneficiario'] || []),
        this.arrayToPostgresArray(convocatoria.region)
      ];

      const result = await client.query(updateQuery, values);
      const grantId = result.rows[0].id;

      // 3. Update classification data in junction tables
      await this.updateClassificationData(grantId, convocatoria, client);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async touchRecord(codigoBdns) {
    const query = `
      UPDATE convocatorias 
      SET last_synced_at = NOW()
      WHERE bdns_code = $1
    `;
    await pool.query(query, [codigoBdns]);
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
        "UPDATE search_config SET config_value = (NOW() AT TIME ZONE 'Europe/Madrid')::timestamp::text WHERE config_key = 'last_full_sync'"
      );
    }
  }

  printProgress() {
    const elapsed = Date.now() - this.startTime;
    const pagesPerSecond = this.processedPages / (elapsed / 1000);
    const eta = this.totalPages > this.processedPages ? 
      (this.totalPages - this.processedPages) / pagesPerSecond : 0;
    
    const changeRate = this.processedRecords > 0 ? 
      ((this.actualChanges / this.processedRecords) * 100).toFixed(1) : '0.0';

    console.log(`📊 Progress: ${this.processedPages}/${this.totalPages} pages ` +
                `(${((this.processedPages / this.totalPages) * 100).toFixed(1)}%) | ` +
                `Records: ${this.processedRecords.toLocaleString()} | ` +
                `🆕 New: ${this.newRecords.toLocaleString()} | ` +
                `🔄 Changed: ${this.actualChanges.toLocaleString()} (${changeRate}%) | ` +
                `👆 Touched: ${this.touchedRecords.toLocaleString()} | ` +
                `Speed: ${pagesPerSecond.toFixed(1)} pages/s | ` +
                `ETA: ${this.formatDuration(eta * 1000)}`);
  }

  printSummary() {
    const elapsed = Date.now() - this.startTime;
    const changeRate = this.processedRecords > 0 ? 
      ((this.actualChanges / this.processedRecords) * 100).toFixed(1) : '0.0';
    const efficiencyGain = this.processedRecords > 0 ? 
      ((this.touchedRecords / this.processedRecords) * 100).toFixed(1) : '0.0';
    
    console.log('\n🎉 Synchronization Complete!');
    console.log('=====================================');
    console.log(`📊 Total Pages: ${this.processedPages.toLocaleString()}`);
    console.log(`📊 Total Records: ${this.processedRecords.toLocaleString()}`);
    console.log(`🆕 New Records: ${this.newRecords.toLocaleString()}`);
    console.log(`📝 Updated Records: ${this.updatedRecords.toLocaleString()}`);
    console.log(`🔄 Actual Changes: ${this.actualChanges.toLocaleString()} (${changeRate}% of processed)`);
    console.log(`👆 Touched (No Changes): ${this.touchedRecords.toLocaleString()} (${efficiencyGain}% efficiency gain)`);
    console.log(`📊 Errors: ${this.errors.length}`);
    console.log(`⏱️ Duration: ${this.formatDuration(elapsed)}`);
    console.log(`⚡ Speed: ${(this.processedRecords / (elapsed / 1000)).toFixed(1)} records/s`);
    
    // Change detection insights
    console.log('\n📈 Change Detection Analysis:');
    if (this.actualChanges > 0) {
      console.log(`✅ Real changes detected: ${this.actualChanges.toLocaleString()} records had newer modification dates`);
    }
    if (this.touchedRecords > 0) {
      console.log(`⚡ Efficiency gained: Skipped ${this.touchedRecords.toLocaleString()} unnecessary updates (${efficiencyGain}% reduction)`);
    }
    
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

  // Organization management methods
  async getOrCreateOrganization(orgName, dir3Code, client) {
    if (!orgName || orgName.trim() === '') {
      throw new Error('Organization name is required');
    }

    const normalizedName = orgName.trim();
    
    // First, try to find existing organization by name or normalized name
    const existingQuery = `
      SELECT id FROM organizations 
      WHERE name = $1 OR normalized_name = $1
      LIMIT 1
    `;
    
    const existingResult = await client.query(existingQuery, [normalizedName]);
    
    if (existingResult.rows.length > 0) {
      return existingResult.rows[0].id;
    }

    // Create new organization with hierarchy detection
    const hierarchy = this.parseOrganizationHierarchy(normalizedName);
    
    let parentId = null;
    let levelId = 1; // Default to top level

    // If this is a hierarchical organization, try to find/create parent
    if (hierarchy.length > 1) {
      const parentName = hierarchy.slice(0, -1).join(' - ');
      levelId = hierarchy.length;
      
      // Try to find parent organization
      const parentQuery = `
        SELECT id FROM organizations 
        WHERE name = $1 OR normalized_name = $1
        LIMIT 1
      `;
      const parentResult = await client.query(parentQuery, [parentName]);
      
      if (parentResult.rows.length > 0) {
        parentId = parentResult.rows[0].id;
      } else {
        // Create parent organization recursively (only one level up)
        parentId = await this.createSimpleOrganization(parentName, null, hierarchy.length - 1, client);
      }
    }

    // Create the organization
    return await this.createSimpleOrganization(normalizedName, parentId, levelId, client, dir3Code);
  }

  async createSimpleOrganization(name, parentId, level, client, dir3Code = null) {
    const insertQuery = `
      INSERT INTO organizations (
        name, full_name, level_id, parent_id, dir3_code, 
        normalized_name, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      RETURNING id
    `;
    
    const values = [
      name,
      name, // full_name same as name for now
      level,
      parentId,
      dir3Code,
      name // normalized_name same as name for now
    ];
    
    const result = await client.query(insertQuery, values);
    return result.rows[0].id;
  }

  parseOrganizationHierarchy(orgName) {
    // Split by " - " to detect hierarchy
    return orgName.split(' - ').map(part => part.trim()).filter(part => part.length > 0);
  }

  // Classification data management
  async insertClassificationData(grantId, convocatoria, client) {
    // Insert sectors
    if (convocatoria.sector && Array.isArray(convocatoria.sector)) {
      for (const sectorData of convocatoria.sector) {
        if (sectorData && sectorData.descripcion) {
          const sectorId = await this.getOrCreateSector(sectorData, client);
          await this.linkGrantToSector(grantId, sectorId, client);
        }
      }
    }

    // Insert instruments
    if (convocatoria.instrumento && Array.isArray(convocatoria.instrumento)) {
      for (const instrumentData of convocatoria.instrumento) {
        if (instrumentData && instrumentData.descripcion) {
          const instrumentId = await this.getOrCreateInstrument(instrumentData, client);
          await this.linkGrantToInstrument(grantId, instrumentId, client);
        }
      }
    }

    // Insert regions
    if (convocatoria.region && Array.isArray(convocatoria.region)) {
      for (const regionName of convocatoria.region) {
        if (regionName && regionName.trim()) {
          const regionId = await this.getOrCreateRegion(regionName.trim(), client);
          await this.linkGrantToRegion(grantId, regionId, client);
        }
      }
    }
  }

  async updateClassificationData(grantId, convocatoria, client) {
    // For updates, we'll delete existing links and recreate them
    // This ensures data consistency
    
    await client.query('DELETE FROM grant_sectors WHERE grant_id = $1', [grantId]);
    await client.query('DELETE FROM grant_instruments WHERE grant_id = $1', [grantId]);
    await client.query('DELETE FROM grant_regions WHERE grant_id = $1', [grantId]);
    
    // Now insert the new data
    await this.insertClassificationData(grantId, convocatoria, client);
  }

  async getOrCreateSector(sectorData, client) {
    const description = sectorData.descripcion || '';
    const code = sectorData.codigo || '';
    
    // Try to find existing sector
    const existingQuery = `
      SELECT id FROM sectors 
      WHERE (code = $1 AND code != '') OR name = $2
      LIMIT 1
    `;
    
    const existingResult = await client.query(existingQuery, [code, description]);
    
    if (existingResult.rows.length > 0) {
      return existingResult.rows[0].id;
    }

    // Create new sector
    const insertQuery = `
      INSERT INTO sectors (code, name, description, is_active, created_at)
      VALUES ($1, $2, $3, true, NOW())
      RETURNING id
    `;
    
    const result = await client.query(insertQuery, [code || '', description, description]);
    return result.rows[0].id;
  }

  async getOrCreateInstrument(instrumentData, client) {
    const description = instrumentData.descripcion || '';
    const code = instrumentData.codigo || '';
    
    // Try to find existing instrument
    const existingQuery = `
      SELECT id FROM instruments 
      WHERE (code = $1 AND code != '') OR name = $2
      LIMIT 1
    `;
    
    const existingResult = await client.query(existingQuery, [code, description]);
    
    if (existingResult.rows.length > 0) {
      return existingResult.rows[0].id;
    }

    // Create new instrument
    const insertQuery = `
      INSERT INTO instruments (code, name, description, is_active, created_at)
      VALUES ($1, $2, $3, true, NOW())
      RETURNING id
    `;
    
    const result = await client.query(insertQuery, [code || '', description, description]);
    return result.rows[0].id;
  }

  async getOrCreateRegion(regionName, client) {
    // Try to find existing region
    const existingQuery = `
      SELECT id FROM regions 
      WHERE name = $1
      LIMIT 1
    `;
    
    const existingResult = await client.query(existingQuery, [regionName]);
    
    if (existingResult.rows.length > 0) {
      return existingResult.rows[0].id;
    }

    // Create new region
    const insertQuery = `
      INSERT INTO regions (code, name, is_active, created_at)
      VALUES ($1, $2, true, NOW())
      RETURNING id
    `;
    
    const result = await client.query(insertQuery, [regionName.toLowerCase().replace(/\s+/g, '_'), regionName]);
    return result.rows[0].id;
  }

  async linkGrantToSector(grantId, sectorId, client) {
    const query = `
      INSERT INTO grant_sectors (grant_id, sector_id)
      VALUES ($1, $2)
      ON CONFLICT (grant_id, sector_id) DO NOTHING
    `;
    await client.query(query, [grantId, sectorId]);
  }

  async linkGrantToInstrument(grantId, instrumentId, client) {
    const query = `
      INSERT INTO grant_instruments (grant_id, instrument_id)
      VALUES ($1, $2)
      ON CONFLICT (grant_id, instrument_id) DO NOTHING
    `;
    await client.query(query, [grantId, instrumentId]);
  }

  async linkGrantToRegion(grantId, regionId, client) {
    const query = `
      INSERT INTO grant_regions (grant_id, region_id)
      VALUES ($1, $2)
      ON CONFLICT (grant_id, region_id) DO NOTHING
    `;
    await client.query(query, [grantId, regionId]);
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
    
    // Format as PostgreSQL array literal: {value1,value2,value3}
    // Escape quotes and backslashes in values
    const escapedValues = arr.map(value => {
      if (value === null || value === undefined) {
        return 'NULL';
      }
      // Convert to string and escape quotes and backslashes
      const str = String(value);
      const escaped = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    
    return `{${escapedValues.join(',')}}`;
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