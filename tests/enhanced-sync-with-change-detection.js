#!/usr/bin/env node

// Enhanced sync script with actual change detection
// This shows how to implement hash-based change detection

const crypto = require('crypto');

class EnhancedBDNSSync {
  
  // Generate content hash for change detection
  generateContentHash(convocatoria) {
    const relevantFields = {
      titulo: convocatoria.titulo,
      desc_organo: convocatoria['desc-organo'],
      fecha_mod: convocatoria['fecha-mod'],
      inicio_solicitud: convocatoria['inicio-solicitud'],
      fin_solicitud: convocatoria['fin-solicitud'],
      abierto: convocatoria.abierto,
      financiacion: convocatoria.financiacion,
      importe_total: this.extractImporteTotal(convocatoria.financiacion)
    };
    
    const content = JSON.stringify(relevantFields, Object.keys(relevantFields).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Enhanced upsert with change detection
  async upsertConvocatoriaWithChangeDetection(convocatoria) {
    const codigoBdns = convocatoria['codigo-BDNS'];
    const newContentHash = this.generateContentHash(convocatoria);
    
    // Check if record exists and get current hash
    const existingQuery = `
      SELECT content_hash, updated_at 
      FROM convocatorias 
      WHERE codigo_bdns = $1
    `;
    
    const existingResult = await pool.query(existingQuery, [codigoBdns]);
    const existing = existingResult.rows[0];
    
    if (!existing) {
      // New record - INSERT
      await this.insertNewRecord(convocatoria, newContentHash);
      this.newRecords++;
      return { action: 'inserted', changed: true };
      
    } else if (existing.content_hash !== newContentHash) {
      // Existing record with changes - UPDATE
      await this.updateExistingRecord(convocatoria, newContentHash);
      this.updatedRecords++;
      return { action: 'updated', changed: true };
      
    } else {
      // Existing record with no changes - TOUCH (update last_synced_at only)
      await this.touchRecord(codigoBdns);
      this.touchedRecords++;
      return { action: 'touched', changed: false };
    }
  }

  async insertNewRecord(convocatoria, contentHash) {
    const query = `
      INSERT INTO convocatorias (
        codigo_bdns, titulo, titulo_cooficial, desc_organo, dir3_organo,
        fecha_registro, fecha_mod, inicio_solicitud, fin_solicitud,
        abierto, region, financiacion, importe_total,
        finalidad, instrumento, sector, tipo_beneficiario,
        descripcion_br, url_esp_br, fondo_ue,
        permalink_convocatoria, permalink_concesiones,
        content_hash, created_at, updated_at, last_synced_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
        $23, NOW(), NOW(), NOW()
      )
    `;
    // ... values array with contentHash
  }

  async updateExistingRecord(convocatoria, contentHash) {
    const query = `
      UPDATE convocatorias SET
        titulo = $2,
        titulo_cooficial = $3,
        desc_organo = $4,
        dir3_organo = $5,
        fecha_mod = $6,
        inicio_solicitud = $7,
        fin_solicitud = $8,
        abierto = $9,
        region = $10,
        financiacion = $11,
        importe_total = $12,
        finalidad = $13,
        instrumento = $14,
        sector = $15,
        tipo_beneficiario = $16,
        descripcion_br = $17,
        url_esp_br = $18,
        fondo_ue = $19,
        permalink_convocatoria = $20,
        permalink_concesiones = $21,
        content_hash = $22,
        updated_at = NOW(),
        last_synced_at = NOW()
      WHERE codigo_bdns = $1
    `;
    // ... values array
  }

  async touchRecord(codigoBdns) {
    const query = `
      UPDATE convocatorias 
      SET last_synced_at = NOW()
      WHERE codigo_bdns = $1
    `;
    await pool.query(query, [codigoBdns]);
  }
}

// Usage in sync logic:
// const result = await this.upsertConvocatoriaWithChangeDetection(convocatoria);
// console.log(`Record ${convocatoria['codigo-BDNS']}: ${result.action} (changed: ${result.changed})`);