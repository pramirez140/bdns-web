import puppeteer from 'puppeteer';

export interface BudgetInfo {
  identificador: string;
  presupuestoTotal: number | null;
  presupuestoTexto: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  error?: string;
}

export class BudgetExtractor {
  private browser: any = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async extractBudgetInfo(convocatoriaId: string): Promise<BudgetInfo> {
    const result: BudgetInfo = {
      identificador: convocatoriaId,
      presupuestoTotal: null,
      presupuestoTexto: null,
      fechaInicio: null,
      fechaFin: null
    };

    try {
      await this.initialize();
      const page = await this.browser.newPage();
      
      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
      
      const url = `https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias/${convocatoriaId}`;
      console.log(`🔍 Extracting budget from: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait for the page to load completely
      await page.waitForTimeout(3000);

      // Extract budget information
      const budgetInfo = await page.evaluate(() => {
        const result: any = {};

        // Look for "Presupuesto total de la convocatoria"
        const budgetPatterns = [
          /Presupuesto\s+total\s+de\s+la\s+convocatoria[\s\S]*?(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/i,
          /Presupuesto\s+total[\s\S]*?(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/i,
          /Dotaci[oó]n\s+econ[oó]mica[\s\S]*?(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/i
        ];

        const pageText = document.body.innerText;
        
        for (const pattern of budgetPatterns) {
          const match = pageText.match(pattern);
          if (match && match[1]) {
            result.presupuestoTexto = match[1] + ' €';
            // Convert Spanish number format to number
            const numberStr = match[1].replace(/\./g, '').replace(',', '.');
            result.presupuestoTotal = parseFloat(numberStr);
            break;
          }
        }

        // Look for application dates
        const datePatterns = [
          /Fecha\s+de\s+inicio\s+del\s+periodo\s+de\s+solicitud[\s\S]*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
          /Fecha\s+de\s+finalizaci[oó]n\s+del\s+periodo\s+de\s+solicitud[\s\S]*?(\d{1,2}\/\d{1,2}\/\d{4})/i
        ];

        const startMatch = pageText.match(datePatterns[0]);
        if (startMatch && startMatch[1]) {
          result.fechaInicio = startMatch[1];
        }

        const endMatch = pageText.match(datePatterns[1]);
        if (endMatch && endMatch[1]) {
          result.fechaFin = endMatch[1];
        }

        return result;
      });

      result.presupuestoTotal = budgetInfo.presupuestoTotal;
      result.presupuestoTexto = budgetInfo.presupuestoTexto;
      result.fechaInicio = budgetInfo.fechaInicio;
      result.fechaFin = budgetInfo.fechaFin;

      await page.close();
      
      console.log(`✅ Extracted budget for ${convocatoriaId}:`, result);
      return result;

    } catch (error: any) {
      console.error(`❌ Failed to extract budget for ${convocatoriaId}:`, error.message);
      result.error = error.message;
      return result;
    }
  }

  async extractMultipleBudgets(convocatoriaIds: string[]): Promise<BudgetInfo[]> {
    const results: BudgetInfo[] = [];
    
    console.log(`🔄 Extracting budgets for ${convocatoriaIds.length} convocatorias...`);
    
    for (const id of convocatoriaIds) {
      const result = await this.extractBudgetInfo(id);
      results.push(result);
      
      // Small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await this.close();
    return results;
  }
}

// Singleton instance
export const budgetExtractor = new BudgetExtractor();