import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { SearchFilters, SearchParams } from '@/types/bdns';

interface UrlState {
  // Search parameters
  query?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  
  // Filters
  organoConvocante?: string[];
  importeMinimo?: number;
  importeMaximo?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  estadoConvocatoria?: string;
  
  // UI state
  tab?: 'search' | 'sync';
}

export function useUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Parse URL parameters into state
  const parseUrlState = useCallback((): UrlState => {
    const params = new URLSearchParams(searchParams.toString());
    
    return {
      // Search parameters
      query: params.get('q') || params.get('query') || undefined,
      page: params.get('page') ? parseInt(params.get('page')!) : undefined,
      pageSize: params.get('pageSize') ? parseInt(params.get('pageSize')!) : undefined,
      sortBy: params.get('sortBy') || undefined,
      sortOrder: (params.get('sortOrder') as 'asc' | 'desc') || undefined,
      
      // Filters
      organoConvocante: params.get('organo') ? 
        params.get('organo')!.split(',').filter(Boolean) : 
        (params.get('organoConvocante') ? params.get('organoConvocante')!.split(',').filter(Boolean) : undefined),
      importeMinimo: params.get('minAmount') ? parseFloat(params.get('minAmount')!) : undefined,
      importeMaximo: params.get('maxAmount') ? parseFloat(params.get('maxAmount')!) : undefined,
      fechaDesde: params.get('from') || params.get('fechaDesde') || undefined,
      fechaHasta: params.get('to') || params.get('fechaHasta') || undefined,
      estadoConvocatoria: params.get('status') || params.get('estado') || undefined,
      
      // UI state
      tab: (params.get('tab') as 'search' | 'sync') || undefined,
    };
  }, [searchParams]);

  // Update URL with new state
  const updateUrlState = useCallback((newState: Partial<UrlState>, replace = false) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    
    // Helper to set or delete parameter
    const setParam = (key: string, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        currentParams.set(key, value.toString());
      } else {
        currentParams.delete(key);
      }
    };

    // Update search parameters
    if ('query' in newState) setParam('q', newState.query);
    if ('page' in newState) setParam('page', newState.page);
    if ('pageSize' in newState) setParam('pageSize', newState.pageSize);
    if ('sortBy' in newState) setParam('sortBy', newState.sortBy);
    if ('sortOrder' in newState) setParam('sortOrder', newState.sortOrder);
    
    // Update filters
    if ('organoConvocante' in newState) {
      const organos = newState.organoConvocante;
      if (organos && organos.length > 0) {
        setParam('organo', organos.join(','));
      } else {
        currentParams.delete('organo');
      }
    }
    if ('importeMinimo' in newState) setParam('minAmount', newState.importeMinimo);
    if ('importeMaximo' in newState) setParam('maxAmount', newState.importeMaximo);
    if ('fechaDesde' in newState) setParam('from', newState.fechaDesde);
    if ('fechaHasta' in newState) setParam('to', newState.fechaHasta);
    if ('estadoConvocatoria' in newState) setParam('status', newState.estadoConvocatoria);
    
    // Update UI state
    if ('tab' in newState) setParam('tab', newState.tab);

    // Build new URL
    const newUrl = currentParams.toString() 
      ? `${pathname}?${currentParams.toString()}`
      : pathname;

    // Navigate to new URL
    if (replace) {
      router.replace(newUrl);
    } else {
      router.push(newUrl);
    }
  }, [router, searchParams, pathname]);

  // Clear all URL parameters
  const clearUrlState = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  // Get current state from URL
  const urlState = parseUrlState();

  // Convert URL state to SearchFilters
  const getFiltersFromUrl = useCallback((): SearchFilters => {
    return {
      query: urlState.query,
      organoConvocante: urlState.organoConvocante,
      importeMinimo: urlState.importeMinimo,
      importeMaximo: urlState.importeMaximo,
      fechaConvocatoria: (urlState.fechaDesde || urlState.fechaHasta) ? {
        desde: urlState.fechaDesde ? (() => {
          const date = new Date(urlState.fechaDesde);
          return !isNaN(date.getTime()) ? date : undefined;
        })() : undefined,
        hasta: urlState.fechaHasta ? (() => {
          const date = new Date(urlState.fechaHasta);
          return !isNaN(date.getTime()) ? date : undefined;
        })() : undefined,
      } : undefined,
      estadoConvocatoria: urlState.estadoConvocatoria,
    };
  }, [urlState]);

  // Convert URL state to SearchParams
  const getSearchParamsFromUrl = useCallback((): SearchParams => {
    return {
      query: urlState.query,
      page: urlState.page || 1,
      pageSize: urlState.pageSize || 20,
      sortBy: urlState.sortBy || 'fechaPublicacion',
      sortOrder: urlState.sortOrder || 'desc',
    };
  }, [urlState]);

  return {
    urlState,
    updateUrlState,
    clearUrlState,
    getFiltersFromUrl,
    getSearchParamsFromUrl,
  };
}

// Hook specifically for tab state management
export function useTabState() {
  const { urlState, updateUrlState } = useUrlState();
  
  const activeTab = urlState.tab || 'search';
  
  const setActiveTab = useCallback((tab: 'search' | 'sync') => {
    updateUrlState({ tab }, true); // Use replace for tab changes
  }, [updateUrlState]);

  return { activeTab, setActiveTab };
}

// Hook for search state management
export function useSearchState() {
  const { 
    urlState, 
    updateUrlState, 
    clearUrlState, 
    getFiltersFromUrl, 
    getSearchParamsFromUrl 
  } = useUrlState();
  
  const updateSearch = useCallback((
    newFilters: Partial<SearchFilters> = {}, 
    newParams: Partial<SearchParams> = {}
  ) => {
    const urlUpdate: Partial<UrlState> = {};
    
    // If newFilters is empty (clear all filters), explicitly clear all filter fields
    const isClearingFilters = Object.keys(newFilters).length === 0;
    
    // Handle search query
    if ('query' in newFilters || 'query' in newParams) {
      urlUpdate.query = newFilters.query || newParams.query;
    } else if (isClearingFilters) {
      urlUpdate.query = undefined;
    }
    
    // Handle pagination
    if ('page' in newParams) urlUpdate.page = newParams.page;
    if ('pageSize' in newParams) urlUpdate.pageSize = newParams.pageSize;
    
    // Handle sorting
    if ('sortBy' in newParams) urlUpdate.sortBy = newParams.sortBy;
    if ('sortOrder' in newParams) urlUpdate.sortOrder = newParams.sortOrder;
    
    // Handle filters
    if ('organoConvocante' in newFilters) {
      urlUpdate.organoConvocante = newFilters.organoConvocante;
    } else if (isClearingFilters) {
      urlUpdate.organoConvocante = undefined;
    }
    
    if ('importeMinimo' in newFilters) {
      urlUpdate.importeMinimo = newFilters.importeMinimo;
    } else if (isClearingFilters) {
      urlUpdate.importeMinimo = undefined;
    }
    
    if ('importeMaximo' in newFilters) {
      urlUpdate.importeMaximo = newFilters.importeMaximo;
    } else if (isClearingFilters) {
      urlUpdate.importeMaximo = undefined;
    }
    
    if ('estadoConvocatoria' in newFilters) {
      urlUpdate.estadoConvocatoria = newFilters.estadoConvocatoria;
    } else if (isClearingFilters) {
      urlUpdate.estadoConvocatoria = undefined;
    }
    
    // Handle date filters
    if (newFilters.fechaConvocatoria) {
      if (newFilters.fechaConvocatoria.desde) {
        const desdeDate = newFilters.fechaConvocatoria.desde;
        if (desdeDate instanceof Date && !isNaN(desdeDate.getTime())) {
          urlUpdate.fechaDesde = desdeDate.toISOString().split('T')[0];
        } else if (typeof desdeDate === 'string' && desdeDate) {
          urlUpdate.fechaDesde = desdeDate;
        }
      }
      if (newFilters.fechaConvocatoria.hasta) {
        const hastaDate = newFilters.fechaConvocatoria.hasta;
        if (hastaDate instanceof Date && !isNaN(hastaDate.getTime())) {
          urlUpdate.fechaHasta = hastaDate.toISOString().split('T')[0];
        } else if (typeof hastaDate === 'string' && hastaDate) {
          urlUpdate.fechaHasta = hastaDate;
        }
      }
    } else if (isClearingFilters) {
      urlUpdate.fechaDesde = undefined;
      urlUpdate.fechaHasta = undefined;
    }
    
    updateUrlState(urlUpdate);
  }, [updateUrlState]);

  // Reset to page 1 for new searches
  const updateSearchWithReset = useCallback((
    newFilters: Partial<SearchFilters> = {}, 
    newParams: Partial<SearchParams> = {}
  ) => {
    updateSearch(newFilters, { ...newParams, page: 1 });
  }, [updateSearch]);

  return {
    currentFilters: getFiltersFromUrl(),
    currentParams: getSearchParamsFromUrl(),
    updateSearch,
    updateSearchWithReset,
    clearSearch: clearUrlState,
  };
}