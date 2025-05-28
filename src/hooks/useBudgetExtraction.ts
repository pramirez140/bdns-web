import { useState, useCallback } from 'react';
import { BudgetInfo } from '@/lib/budget-extractor';

interface BudgetExtractionState {
  loading: boolean;
  extracting: Set<string>;
  budgets: Map<string, BudgetInfo>;
  error: string | null;
}

export const useBudgetExtraction = () => {
  const [state, setState] = useState<BudgetExtractionState>({
    loading: false,
    extracting: new Set(),
    budgets: new Map(),
    error: null
  });

  const extractBudget = useCallback(async (convocatoriaId: string) => {
    setState(prev => {
      const newExtracting = new Set(prev.extracting);
      newExtracting.add(convocatoriaId);
      return {
        ...prev,
        extracting: newExtracting,
        error: null
      };
    });

    try {
      const response = await fetch('/api/extract-budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ convocatoriaIds: [convocatoriaId] })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al extraer presupuesto');
      }

      const budgetInfo = data.data[0];
      
      setState(prev => {
        const newExtracting = new Set(prev.extracting);
        newExtracting.delete(convocatoriaId);
        
        const newBudgets = new Map(prev.budgets);
        newBudgets.set(convocatoriaId, budgetInfo);
        
        return {
          ...prev,
          extracting: newExtracting,
          budgets: newBudgets
        };
      });

      return budgetInfo;

    } catch (error: any) {
      setState(prev => {
        const newExtracting = new Set(prev.extracting);
        newExtracting.delete(convocatoriaId);
        
        return {
          ...prev,
          extracting: newExtracting,
          error: error.message
        };
      });
      
      throw error;
    }
  }, []);

  const extractMultipleBudgets = useCallback(async (convocatoriaIds: string[]) => {
    setState(prev => {
      const newExtracting = new Set(prev.extracting);
      convocatoriaIds.forEach(id => newExtracting.add(id));
      return {
        ...prev,
        loading: true,
        extracting: newExtracting,
        error: null
      };
    });

    try {
      const response = await fetch('/api/extract-budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ convocatoriaIds })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al extraer presupuestos');
      }

      setState(prev => {
        const newExtracting = new Set(prev.extracting);
        convocatoriaIds.forEach(id => newExtracting.delete(id));
        
        const newBudgets = new Map(prev.budgets);
        data.data.forEach((budget: BudgetInfo) => {
          newBudgets.set(budget.identificador, budget);
        });
        
        return {
          ...prev,
          loading: false,
          extracting: newExtracting,
          budgets: newBudgets
        };
      });

      return data.data;

    } catch (error: any) {
      setState(prev => {
        const newExtracting = new Set(prev.extracting);
        convocatoriaIds.forEach(id => newExtracting.delete(id));
        
        return {
          ...prev,
          loading: false,
          extracting: newExtracting,
          error: error.message
        };
      });
      
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const getBudget = useCallback((convocatoriaId: string) => {
    return state.budgets.get(convocatoriaId);
  }, [state.budgets]);

  const isExtracting = useCallback((convocatoriaId: string) => {
    return state.extracting.has(convocatoriaId);
  }, [state.extracting]);

  return {
    loading: state.loading,
    error: state.error,
    extractBudget,
    extractMultipleBudgets,
    getBudget,
    isExtracting,
    clearError,
    hasAnyBudgets: state.budgets.size > 0
  };
};