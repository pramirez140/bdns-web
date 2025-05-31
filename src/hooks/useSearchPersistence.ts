'use client';

import { useState, useEffect, useCallback } from 'react';
// Simple cookie utilities
const setCookie = (name: string, value: string, days: number = 7) => {
  if (typeof window === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;samesite=lax`;
};

const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  if (typeof window === 'undefined') return;
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};
import { SearchFilters, SearchParams, SearchResult, ConvocatoriaData } from '@/types/bdns';

interface SearchState {
  filters: SearchFilters;
  params: SearchParams;
  results: SearchResult<ConvocatoriaData> | null;
  scrollPosition: number;
  resultItemsScrollPositions: Record<string, number>;
  lastSearchTimestamp: number;
}

interface UseSearchPersistenceReturn {
  searchState: SearchState;
  saveSearchState: (state: Partial<SearchState>) => void;
  restoreScrollPosition: () => void;
  saveScrollPosition: () => void;
  saveResultItemPosition: (itemId: string, position: number) => void;
  getResultItemPosition: (itemId: string) => number;
  clearSearchState: () => void;
  hasValidCache: () => boolean;
}

const SEARCH_STATE_KEY = 'bdns_search_state';
const SEARCH_RESULTS_KEY = 'bdns_search_results';
const SCROLL_POSITION_KEY = 'bdns_scroll_position';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const defaultSearchState: SearchState = {
  filters: {},
  params: { page: 1, limit: 20, sortBy: 'fechaPublicacion', sortOrder: 'desc' },
  results: null,
  scrollPosition: 0,
  resultItemsScrollPositions: {},
  lastSearchTimestamp: 0,
};

export function useSearchPersistence(): UseSearchPersistenceReturn {
  const [searchState, setSearchState] = useState<SearchState>(defaultSearchState);

  // Load state from cookies and sessionStorage on mount
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        // Load basic state from cookies (survives browser restart)
        const cookieState = getCookie(SEARCH_STATE_KEY);
        const sessionResults = sessionStorage.getItem(SEARCH_RESULTS_KEY);
        const sessionScroll = sessionStorage.getItem(SCROLL_POSITION_KEY);

        let restoredState = { ...defaultSearchState };

        if (cookieState) {
          const parsedCookieState = JSON.parse(cookieState);
          restoredState = {
            ...restoredState,
            filters: parsedCookieState.filters || {},
            params: { ...restoredState.params, ...parsedCookieState.params },
            lastSearchTimestamp: parsedCookieState.lastSearchTimestamp || 0,
            resultItemsScrollPositions: parsedCookieState.resultItemsScrollPositions || {},
          };
        }

        // Load search results from sessionStorage (faster access, larger storage)
        if (sessionResults) {
          const parsedResults = JSON.parse(sessionResults);
          // Check if results are still valid (within cache duration)
          if (Date.now() - restoredState.lastSearchTimestamp < CACHE_DURATION) {
            restoredState.results = parsedResults;
          }
        }

        // Load scroll position from sessionStorage
        if (sessionScroll) {
          restoredState.scrollPosition = parseInt(sessionScroll, 10) || 0;
        }

        setSearchState(restoredState);
      } catch (error) {
        console.warn('Failed to load persisted search state:', error);
        setSearchState(defaultSearchState);
      }
    };

    loadPersistedState();
  }, []);

  // Save search state to cookies and sessionStorage
  const saveSearchState = useCallback((newState: Partial<SearchState>) => {
    setSearchState((prevState) => {
      const updatedState = {
        ...prevState,
        ...newState,
        lastSearchTimestamp: Date.now(),
      };

      try {
        // Save lightweight data to cookies (filters, params, timestamps)
        const cookieData = {
          filters: updatedState.filters,
          params: updatedState.params,
          lastSearchTimestamp: updatedState.lastSearchTimestamp,
          resultItemsScrollPositions: updatedState.resultItemsScrollPositions,
        };
        
        setCookie(SEARCH_STATE_KEY, JSON.stringify(cookieData), 7);

        // Save heavy data (search results) to sessionStorage
        if (updatedState.results) {
          sessionStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify(updatedState.results));
        }

        // Save scroll position to sessionStorage
        sessionStorage.setItem(SCROLL_POSITION_KEY, updatedState.scrollPosition.toString());

      } catch (error) {
        console.warn('Failed to save search state:', error);
      }

      return updatedState;
    });
  }, []);

  // Restore scroll position to the saved position
  const restoreScrollPosition = useCallback(() => {
    const savedPosition = searchState.scrollPosition;
    if (savedPosition > 0) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        window.scrollTo({
          top: savedPosition,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [searchState.scrollPosition]);

  // Save current scroll position
  const saveScrollPosition = useCallback(() => {
    const currentPosition = window.pageYOffset || document.documentElement.scrollTop;
    saveSearchState({ scrollPosition: currentPosition });
  }, [saveSearchState]);

  // Save scroll position for specific result item
  const saveResultItemPosition = useCallback((itemId: string, position: number) => {
    const newPositions = {
      ...searchState.resultItemsScrollPositions,
      [itemId]: position
    };
    saveSearchState({ resultItemsScrollPositions: newPositions });
  }, [searchState.resultItemsScrollPositions, saveSearchState]);

  // Get scroll position for specific result item
  const getResultItemPosition = useCallback((itemId: string): number => {
    return searchState.resultItemsScrollPositions[itemId] || 0;
  }, [searchState.resultItemsScrollPositions]);

  // Clear all persisted state
  const clearSearchState = useCallback(() => {
    deleteCookie(SEARCH_STATE_KEY);
    sessionStorage.removeItem(SEARCH_RESULTS_KEY);
    sessionStorage.removeItem(SCROLL_POSITION_KEY);
    setSearchState(defaultSearchState);
  }, []);

  // Check if cached results are still valid
  const hasValidCache = useCallback((): boolean => {
    return Boolean(
      searchState.results && 
      searchState.lastSearchTimestamp &&
      (Date.now() - searchState.lastSearchTimestamp) < CACHE_DURATION &&
      searchState.results.data && 
      searchState.results.data.length > 0
    );
  }, [searchState.results, searchState.lastSearchTimestamp]);

  return {
    searchState,
    saveSearchState,
    restoreScrollPosition,
    saveScrollPosition,
    saveResultItemPosition,
    getResultItemPosition,
    clearSearchState,
    hasValidCache,
  };
}

// Hook for managing search state with URL integration
export function useEnhancedSearchState() {
  const persistence = useSearchPersistence();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Perform search with caching
  const performSearch = useCallback(async (
    filters: SearchFilters, 
    params: SearchParams,
    forceRefresh: boolean = false
  ) => {
    // Check if we can use cached results
    if (!forceRefresh && persistence.hasValidCache()) {
      const cachedFilters = persistence.searchState.filters;
      const cachedParams = persistence.searchState.params;
      
      // Compare current search with cached search
      if (JSON.stringify(filters) === JSON.stringify(cachedFilters) &&
          JSON.stringify(params) === JSON.stringify(cachedParams)) {
        console.log('🚀 Using cached search results');
        return persistence.searchState.results;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Perform API search
      const searchParams = new URLSearchParams();
      
      if (filters.query) searchParams.append('q', filters.query);
      if (filters.organoConvocante) searchParams.append('organo', filters.organoConvocante);
      if (filters.importeMinimo) searchParams.append('importe_min', filters.importeMinimo.toString());
      if (filters.importeMaximo) searchParams.append('importe_max', filters.importeMaximo.toString());
      if (filters.fechaDesde) searchParams.append('fecha_desde', filters.fechaDesde);
      if (filters.fechaHasta) searchParams.append('fecha_hasta', filters.fechaHasta);
      if (filters.estadoConvocatoria) searchParams.append('estado', filters.estadoConvocatoria);
      
      searchParams.append('page', params.page?.toString() || '1');
      searchParams.append('limit', params.limit?.toString() || '20');
      if (params.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

      const response = await fetch(`/api/search?${searchParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        // Save search state and results
        persistence.saveSearchState({
          filters,
          params,
          results: data.data,
        });
        
        return data.data;
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (err: any) {
      const errorMessage = `Error: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [persistence]);

  return {
    ...persistence,
    performSearch,
    isLoading,
    error,
    setError,
  };
}