'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import SearchForm from '@/components/search/SearchForm';
import SearchResults from '@/components/search/SearchResults';
import FilterPanel from '@/components/filters/FilterPanel';
import { SyncManager } from '@/components/sync/SyncManager';
import { SearchFilters, SearchParams, SearchResult, ConvocatoriaData } from '@/types/bdns';
import { useTabState, useSearchState } from '@/hooks/useUrlState';
import { useEnhancedSearchState } from '@/hooks/useSearchPersistence';

// Helper function to call our API endpoint
const callSearchAPI = async (filters: SearchFilters, params: SearchParams): Promise<SearchResult<ConvocatoriaData>> => {
  const searchParams = new URLSearchParams();
  
  // Add search parameters
  if (params.query) searchParams.append('query', params.query);
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
  if (params.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
  
  // Add filters
  if (filters.query) searchParams.append('query', filters.query);
  if (filters.organoConvocante) {
    if (Array.isArray(filters.organoConvocante)) {
      searchParams.append('organoConvocante', filters.organoConvocante.join(','));
    } else {
      searchParams.append('organoConvocante', filters.organoConvocante);
    }
  }
  if (filters.importeMinimo) searchParams.append('importeMinimo', filters.importeMinimo.toString());
  if (filters.importeMaximo) searchParams.append('importeMaximo', filters.importeMaximo.toString());
  
  const response = await fetch(`/api/search?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'API call failed');
  }
  
  return data.data;
};

function HomePage() {
  // URL state management
  const { activeTab, setActiveTab } = useTabState();
  const { 
    currentFilters, 
    currentParams, 
    updateSearch, 
    updateSearchWithReset, 
    clearSearch 
  } = useSearchState();
  
  // Enhanced search persistence
  const { 
    searchState, 
    restoreScrollPosition, 
    saveScrollPosition,
    saveSearchState,
    hasValidCache 
  } = useEnhancedSearchState();
  
  // Component state
  const [searchResults, setSearchResults] = useState<SearchResult<ConvocatoriaData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // Perform search with current URL state
  const performSearch = useCallback(async (filters?: SearchFilters, params?: SearchParams) => {
    const searchFilters = filters || currentFilters;
    const searchParams = params || currentParams;
    
    // Only search if there are actual search criteria
    if (!searchFilters.query && !searchFilters.organoConvocante && !searchFilters.importeMinimo && 
        !searchFilters.importeMaximo && !searchFilters.fechaConvocatoria && !searchFilters.estadoConvocatoria) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Frontend calling API with:', { searchFilters, searchParams });
      const results = await callSearchAPI(searchFilters, searchParams);
      console.log('✅ Frontend received results:', { total: results.total, count: results.data.length });
      
      setSearchResults(results);
      
      // Save search state to persistence for back navigation
      saveSearchState({
        filters: searchFilters,
        params: searchParams,
        results: results,
      });
      
    } catch (err: any) {
      console.error('Search error details:', err);
      setError(`Error: ${err.message || 'Error desconocido'}. Ver consola para más detalles.`);
    } finally {
      setLoading(false);
    }
  }, [currentFilters, currentParams, saveSearchState]);

  // Load initial state from URL on mount with cached results
  useEffect(() => {
    if (!hasInitialLoad) {
      setHasInitialLoad(true);
      
      // Priority 1: Check if this is a back navigation (has 'from' parameter)
      const urlParams = new URLSearchParams(window.location.search);
      const fromItem = urlParams.get('from');
      
      if (fromItem && hasValidCache() && searchState.results) {
        console.log('🔄 Back navigation detected, restoring cached results instantly');
        setSearchResults(searchState.results);
        setLoading(false);
        setError(null);
        
        // Scroll to the specific item immediately
        setTimeout(() => {
          const element = document.querySelector(`[data-grant-id="${fromItem}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            restoreScrollPosition();
          }
        }, 100);
        return;
      }
      
      // Priority 2: Check if we have valid cached results that match current URL state
      if (hasValidCache() && searchState.results) {
        const cachedFilters = searchState.filters;
        const cachedParams = searchState.params;
        
        // Check if cached state matches current URL state (allow some flexibility)
        const filtersMatch = JSON.stringify(cachedFilters) === JSON.stringify(currentFilters);
        const paramsMatch = cachedParams.page === currentParams.page && 
                           cachedParams.sortBy === currentParams.sortBy &&
                           cachedParams.sortOrder === currentParams.sortOrder;
        
        if (filtersMatch && (paramsMatch || !currentParams.page)) {
          console.log('🚀 Instantly restoring cached results and scroll position');
          
          // Set results immediately without loading
          setSearchResults(searchState.results);
          setLoading(false);
          setError(null);
          
          // Restore scroll position immediately after DOM update
          setTimeout(() => {
            restoreScrollPosition();
          }, 50);
          
          // Also try to scroll to specific item if available
          setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const fromItem = urlParams.get('from');
            if (fromItem) {
              const element = document.querySelector(`[data-grant-id="${fromItem}"]`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }, 200);
          
          return; // Don't perform new search
        }
      }
      
      // If URL has search parameters, perform search (either no cache or cache doesn't match)
      if (currentFilters.query || currentFilters.organoConvocante || 
          currentFilters.importeMinimo || currentFilters.importeMaximo ||
          currentFilters.fechaConvocatoria || currentFilters.estadoConvocatoria) {
        performSearch();
      }
    }
  }, [hasInitialLoad, currentFilters, currentParams, performSearch, hasValidCache, searchState, restoreScrollPosition]);

  // Save scroll position periodically
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    const handleScroll = () => {
      // Debounce scroll position saving
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        saveScrollPosition();
      }, 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [saveScrollPosition]);

  // Handle new search from form
  const handleSearch = async (query?: string, filters?: SearchFilters) => {
    const newFilters = { ...currentFilters, ...filters };
    if (query !== undefined) {
      newFilters.query = query;
    }
    
    const newParams = { ...currentParams, page: 1 }; // Reset to first page
    
    // Update URL state
    updateSearchWithReset(newFilters, newParams);
    
    // Perform search
    await performSearch(newFilters, newParams);
  };

  // Handle filter changes
  const handleFilterChange = (filters: SearchFilters) => {
    // If filters is empty object (clear filters), use it directly
    const newFilters = Object.keys(filters).length === 0 ? {} : { ...currentFilters, ...filters };
    const newParams = { ...currentParams, page: 1 }; // Reset to first page
    
    // Update URL state
    updateSearchWithReset(newFilters, newParams);
    
    // Perform search
    performSearch(newFilters, newParams);
  };

  // Handle page changes
  const handlePageChange = async (page: number) => {
    const newParams = { ...currentParams, page };
    
    // Update URL state
    updateSearch({}, newParams);
    
    // Perform search
    await performSearch(currentFilters, newParams);
  };

  // Handle sort changes
  const handleSortChange = async (sortBy: string, sortOrder: 'asc' | 'desc') => {
    const newParams = { ...currentParams, sortBy, sortOrder, page: 1 }; // Reset to first page
    
    // Update URL state
    updateSearch({}, newParams);
    
    // Perform search
    await performSearch(currentFilters, newParams);
  };

  // Handle tab change
  const handleTabChange = (tab: 'search' | 'sync') => {
    setActiveTab(tab);
  };

  // Handle clear search
  const handleClearSearch = () => {
    clearSearch();
    setSearchResults(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Buscador de Subvenciones BDNS
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            🔗 Base de Datos Local con Sincronización BDNS - Búsquedas ultra-rápidas sin depender de la API externa
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => handleTabChange('search')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🔍 Buscar Subvenciones
          </button>
          <button
            onClick={() => handleTabChange('sync')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sync'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🔄 Gestión de Datos
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'search' && (
          <div>
            <SearchForm 
              onSearch={handleSearch}
              loading={loading}
              initialQuery={currentParams.query}
            />
            
            {/* Clear Search Button */}
            {(currentFilters.query || searchResults) && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleClearSearch}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="flex justify-center">
            <SyncManager />
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-bdns-blue">562.536+</div>
          <div className="text-sm text-gray-600">Convocatorias BDNS</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-bdns-green">27.700.000+</div>
          <div className="text-sm text-gray-600">Concesiones</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-bdns-red">🔗 REAL API</div>
          <div className="text-sm text-gray-600">Conexión Directa</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-600">€882B+</div>
          <div className="text-sm text-gray-600">Valor Total</div>
        </div>
      </div>

      {/* Results Section */}
      {activeTab === 'search' && (searchResults || loading || error) && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <FilterPanel
              filters={currentFilters}
              onFilterChange={handleFilterChange}
              loading={loading}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {error && (
              <div className="card p-6">
                <div className="text-center text-red-600">
                  <p className="text-lg font-medium">Error en la búsqueda</p>
                  <p className="text-sm mt-2">{error}</p>
                  <button 
                    onClick={() => setError(null)}
                    className="btn-primary mt-4"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="card p-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bdns-blue mx-auto"></div>
                  <p className="mt-4 text-gray-600">Buscando...</p>
                </div>
              </div>
            )}

            {searchResults && !loading && !error && (
              <SearchResults
                results={searchResults}
                onPageChange={handlePageChange}
                onSortChange={handleSortChange}
                currentSort={{
                  sortBy: currentParams.sortBy || 'fechaPublicacion',
                  sortOrder: currentParams.sortOrder || 'desc'
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      {activeTab === 'search' && !searchResults && !loading && !error && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ¿Cómo usar el buscador?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Búsqueda por texto</h3>
              <p className="text-sm text-gray-600 mb-4">
                Introduce palabras clave relacionadas con la subvención que buscas.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Nombre del organismo convocante</li>
                <li>• Materia o sector de la subvención</li>
                <li>• Palabras clave del título</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Filtros avanzados</h3>
              <p className="text-sm text-gray-600 mb-4">
                Utiliza los filtros para refinar tu búsqueda.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Por organismo convocante</li>
                <li>• Por rango de fechas</li>
                <li>• Por importe de la subvención</li>
                <li>• Por ubicación geográfica</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <HomePage />
    </Suspense>
  );
}