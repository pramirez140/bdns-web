#!/usr/bin/env node

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bdns_user:bdns_password@localhost:5432/bdns_db',
  max: 10,
});

class JunctionTablePopulator {
  constructor() {
    this.processedRecords = 0;
    this.sectorsCreated = 0;
    this.instrumentsCreated = 0;
    this.regionsCreated = 0;
    this.sectorsLinked = 0;
    this.instrumentsLinked = 0;
    this.regionsLinked = 0;
  }

  async run() {
    console.log('🚀 Starting junction table population from legacy data...');
    
    try {
      await this.populateJunctionTables();
      this.printSummary();
    } catch (error) {
      console.error('💥 Error during population:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }

  async populateJunctionTables() {
    const client = await pool.connect();
    
    try {
      // Get all grants with their legacy classification data
      console.log('📊 Fetching grants with classification data...');
      
      const query = `
        SELECT 
          id as grant_id,
          bdns_code,
          legacy_sector,
          legacy_instrumento,
          legacy_region
        FROM convocatorias
        WHERE legacy_sector IS NOT NULL 
           OR legacy_instrumento IS NOT NULL 
           OR legacy_region IS NOT NULL
        ORDER BY id
      `;
      
      const result = await client.query(query);
      console.log(`📋 Found ${result.rows.length} grants to process`);
      
      // Process in smaller batches to avoid timeouts
      const batchSize = 500;
      for (let i = 0; i < result.rows.length; i += batchSize) {
        const batch = result.rows.slice(i, i + batchSize);
        
        for (const grant of batch) {
          try {
            await this.processGrantClassifications(grant, client);
            this.processedRecords++;
          } catch (error) {
            console.error(`❌ Error processing grant ${grant.bdns_code}:`, error.message);
          }
        }
        
        // Progress update after each batch
        console.log(`📊 Processed ${Math.min(i + batchSize, result.rows.length)}/${result.rows.length} grants...`);
        
        // Allow some breathing room for the database
        if (i % 5000 === 0 && i > 0) {
          console.log('⏸️ Taking a short break to let the database breathe...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
    } finally {
      client.release();
    }
  }

  async processGrantClassifications(grant, client) {
    const { grant_id, legacy_sector, legacy_instrumento, legacy_region } = grant;
      // Process sectors
      if (legacy_sector && Array.isArray(legacy_sector)) {
        for (const sectorData of legacy_sector) {
          if (sectorData && sectorData.descripcion) {
            const sectorId = await this.getOrCreateSector(sectorData, client);
            await this.linkGrantToSector(grant_id, sectorId, client);
            this.sectorsLinked++;
          }
        }
      }

      // Process instruments
      if (legacy_instrumento && Array.isArray(legacy_instrumento)) {
        for (const instrumentData of legacy_instrumento) {
          if (instrumentData && instrumentData.descripcion) {
            const instrumentId = await this.getOrCreateInstrument(instrumentData, client);
            await this.linkGrantToInstrument(grant_id, instrumentId, client);
            this.instrumentsLinked++;
          }
        }
      }

      // Process regions - handle both array and object formats
      if (legacy_region) {
        let regionNames = [];
        
        if (Array.isArray(legacy_region)) {
          regionNames = legacy_region;
        } else if (typeof legacy_region === 'object') {
          // Handle object format like {"ES511 - Barcelona": ""}
          regionNames = Object.keys(legacy_region);
        } else if (typeof legacy_region === 'string') {
          regionNames = [legacy_region];
        }
        
        for (const regionName of regionNames) {
          if (regionName && regionName.trim()) {
            // Extract just the region name, handling codes like "ES511 - Barcelona"
            const cleanRegionName = regionName.trim();
            const regionId = await this.getOrCreateRegion(cleanRegionName, client);
            await this.linkGrantToRegion(grant_id, regionId, client);
            this.regionsLinked++;
          }
        }
      }
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
    this.sectorsCreated++;
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
    this.instrumentsCreated++;
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

    // Create new region - extract code from region name if it exists
    let regionCode = '';
    if (regionName.match(/^ES\d+/)) {
      // Extract the ES code (e.g., "ES511" from "ES511 - Barcelona")
      regionCode = regionName.split(' - ')[0];
    } else {
      // Create a code from the name
      regionCode = regionName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
    }
    
    const insertQuery = `
      INSERT INTO regions (code, name, is_active, created_at)
      VALUES ($1, $2, true, NOW())
      RETURNING id
    `;
    
    const result = await client.query(insertQuery, [regionCode, regionName]);
    this.regionsCreated++;
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

  printSummary() {
    console.log('\n🎉 Junction Table Population Complete!');
    console.log('=========================================');
    console.log(`📊 Grants Processed: ${this.processedRecords.toLocaleString()}`);
    console.log(`🏷️  Sectors Created: ${this.sectorsCreated.toLocaleString()}`);
    console.log(`🔧 Instruments Created: ${this.instrumentsCreated.toLocaleString()}`);
    console.log(`🌍 Regions Created: ${this.regionsCreated.toLocaleString()}`);
    console.log(`🔗 Sector Links: ${this.sectorsLinked.toLocaleString()}`);
    console.log(`🔗 Instrument Links: ${this.instrumentsLinked.toLocaleString()}`);
    console.log(`🔗 Region Links: ${this.regionsLinked.toLocaleString()}`);
  }
}

async function main() {
  const populator = new JunctionTablePopulator();
  await populator.run();
}

if (require.main === module) {
  main().catch(console.error);
}