// Simple change detection using existing fecha_mod field
// This can be implemented immediately without database changes

class SimpleBDNSChangeDetection {
  
  async upsertWithDateBasedChangeDetection(convocatoria) {
    const codigoBdns = convocatoria['codigo-BDNS'];
    const newFechaMod = this.parseDate(convocatoria['fecha-mod']);
    
    // Check existing record's fecha_mod
    const existingQuery = `
      SELECT fecha_mod, last_synced_at
      FROM convocatorias 
      WHERE codigo_bdns = $1
    `;
    
    const existing = await pool.query(existingQuery, [codigoBdns]);
    
    if (existing.rows.length === 0) {
      // New record
      await this.insertRecord(convocatoria);
      this.newRecords++;
      return { action: 'inserted', hasChanges: true, reason: 'new_record' };
      
    } else {
      const existingFechaMod = existing.rows[0].fecha_mod;
      
      if (!newFechaMod || !existingFechaMod) {
        // Can't compare dates - assume change
        await this.updateRecord(convocatoria);
        this.updatedRecords++;
        return { action: 'updated', hasChanges: true, reason: 'missing_date' };
        
      } else if (newFechaMod > existingFechaMod) {
        // API has newer modification date - real change
        await this.updateRecord(convocatoria);
        this.actualChanges++;
        return { action: 'updated', hasChanges: true, reason: 'newer_modification' };
        
      } else {
        // No change detected - just touch last_synced_at
        await this.touchRecord(codigoBdns);
        this.touchedRecords++;
        return { action: 'touched', hasChanges: false, reason: 'no_change' };
      }
    }
  }

  async touchRecord(codigoBdns) {
    const query = `
      UPDATE convocatorias 
      SET last_synced_at = NOW()
      WHERE codigo_bdns = $1
    `;
    await pool.query(query, [codigoBdns]);
  }

  // Enhanced logging for change detection
  logChangeDetectionStats() {
    console.log('📊 Change Detection Summary:');
    console.log(`   🆕 New records: ${this.newRecords}`);
    console.log(`   🔄 Actually changed: ${this.actualChanges}`);
    console.log(`   👆 Just touched: ${this.touchedRecords}`);
    console.log(`   📈 Change rate: ${((this.actualChanges / (this.processedRecords || 1)) * 100).toFixed(2)}%`);
  }
}

// Add these counters to the main sync class
this.actualChanges = 0;      // Records with real changes
this.touchedRecords = 0;     // Records with no changes (just touched)
this.newRecords = 0;         // New records
this.updatedRecords = 0;     // Records updated (includes false positives)