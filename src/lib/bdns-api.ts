import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ConvocatoriaData, 
  ConcesionData, 
  SearchFilters, 
  SearchResult, 
  SearchParams,
  APIResponse,
  SubvencionBDNS
} from '@/types/bdns';

export class BDNSApiClient {
  private api: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = process.env.BDNS_API_BASE_URL || 'https://www.pap.hacienda.gob.es/bdnstrans/api') {
    this.baseUrl = baseUrl;
    this.api = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`BDNS API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('BDNS API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async buscarConvocatorias(filtros: SearchFilters = {}, params: SearchParams = {}): Promise<SearchResult<ConvocatoriaData>> {
    try {
      const searchParams = this.buildSearchParams(filtros, params);
      
      // Try real API first
      try {
        const response: AxiosResponse<APIResponse<ConvocatoriaData[]>> = await this.api.get('/api/convocatorias', {
          params: searchParams,
          timeout: 5000
        });
        return this.processSearchResult(response.data);
      } catch (apiError: any) {
        console.warn('Real API not available, using mock data:', apiError?.message || 'Unknown error');
        
        // Fallback to mock data
        const { mockConvocatorias, createMockSearchResult } = await import('./mock-data');
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return createMockSearchResult(
          mockConvocatorias,
          params.page || 1,
          params.pageSize || 20,
          { ...filtros, ...params }
        );
      }
    } catch (error) {
      console.error('Error searching convocatorias:', error);
      throw new Error('Failed to search convocatorias');
    }
  }

  async obtenerDetalleConvocatoria(id: string): Promise<ConvocatoriaData> {
    try {
      // Try real API first
      try {
        const response: AxiosResponse<APIResponse<ConvocatoriaData>> = await this.api.get(`/api/convocatorias/${id}`, {
          timeout: 5000
        });
        
        if (!response.data.success || !response.data.data) {
          throw new Error('Convocatoria not found');
        }

        return response.data.data;
      } catch (apiError: any) {
        console.warn('Real API not available, using mock data:', apiError?.message || 'Unknown error');
        
        // Fallback to mock data
        const { mockConvocatorias } = await import('./mock-data');
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const convocatoria = mockConvocatorias.find(c => c.identificador === id);
        if (!convocatoria) {
          throw new Error('Convocatoria not found in mock data');
        }
        
        return convocatoria;
      }
    } catch (error) {
      console.error('Error fetching convocatoria detail:', error);
      throw new Error('Failed to fetch convocatoria detail');
    }
  }

  async buscarConcesiones(filtros: SearchFilters = {}, params: SearchParams = {}): Promise<SearchResult<ConcesionData>> {
    try {
      const searchParams = this.buildSearchParams(filtros, params);
      const response: AxiosResponse<APIResponse<ConcesionData[]>> = await this.api.get('/api/concesiones', {
        params: searchParams
      });

      return this.processSearchResult(response.data);
    } catch (error) {
      console.error('Error searching concesiones:', error);
      throw new Error('Failed to search concesiones');
    }
  }

  async buscarAyudasEstado(filtros: SearchFilters = {}, params: SearchParams = {}): Promise<SearchResult<SubvencionBDNS>> {
    try {
      const searchParams = this.buildSearchParams(filtros, params);
      const response: AxiosResponse<APIResponse<SubvencionBDNS[]>> = await this.api.get('/api/ayudas-estado', {
        params: searchParams
      });

      return this.processSearchResult(response.data);
    } catch (error) {
      console.error('Error searching ayudas de estado:', error);
      throw new Error('Failed to search ayudas de estado');
    }
  }

  async buscarAyudasMinimis(filtros: SearchFilters = {}, params: SearchParams = {}): Promise<SearchResult<SubvencionBDNS>> {
    try {
      const searchParams = this.buildSearchParams(filtros, params);
      const response: AxiosResponse<APIResponse<SubvencionBDNS[]>> = await this.api.get('/api/ayudas-minimis', {
        params: searchParams
      });

      return this.processSearchResult(response.data);
    } catch (error) {
      console.error('Error searching ayudas de minimis:', error);
      throw new Error('Failed to search ayudas de minimis');
    }
  }

  async buscarPlanesEstrategicos(filtros: SearchFilters = {}, params: SearchParams = {}): Promise<SearchResult<any>> {
    try {
      const searchParams = this.buildSearchParams(filtros, params);
      const response: AxiosResponse<APIResponse<any[]>> = await this.api.get('/api/planes-estrategicos', {
        params: searchParams
      });

      return this.processSearchResult(response.data);
    } catch (error) {
      console.error('Error searching planes estratégicos:', error);
      throw new Error('Failed to search planes estratégicos');
    }
  }

  // Helper method to build search parameters
  private buildSearchParams(filtros: SearchFilters, params: SearchParams): Record<string, any> {
    const searchParams: Record<string, any> = {};

    // Add filters
    if (filtros.organoConvocante) {
      searchParams.organoConvocante = filtros.organoConvocante;
    }
    if (filtros.tipoEntidad) {
      searchParams.tipoEntidad = filtros.tipoEntidad;
    }
    if (filtros.materiaSubvencion) {
      searchParams.materiaSubvencion = filtros.materiaSubvencion;
    }
    if (filtros.beneficiario) {
      searchParams.beneficiario = filtros.beneficiario;
    }
    if (filtros.importeMinimo) {
      searchParams.importeMinimo = filtros.importeMinimo;
    }
    if (filtros.importeMaximo) {
      searchParams.importeMaximo = filtros.importeMaximo;
    }
    if (filtros.fechaConvocatoria?.desde) {
      searchParams.fechaDesde = filtros.fechaConvocatoria.desde.toISOString();
    }
    if (filtros.fechaConvocatoria?.hasta) {
      searchParams.fechaHasta = filtros.fechaConvocatoria.hasta.toISOString();
    }
    if (filtros.estadoConvocatoria) {
      searchParams.estado = filtros.estadoConvocatoria;
    }
    if (filtros.ubicacionGeografica) {
      searchParams.ubicacion = filtros.ubicacionGeografica;
    }

    // Add pagination
    if (params.page) {
      searchParams.page = params.page;
    }
    if (params.pageSize) {
      searchParams.pageSize = params.pageSize;
    }
    if (params.offset) {
      searchParams.offset = params.offset;
    }
    if (params.limit) {
      searchParams.limit = params.limit;
    }

    // Add sorting
    if (params.sortBy) {
      searchParams.sortBy = params.sortBy;
    }
    if (params.sortOrder) {
      searchParams.sortOrder = params.sortOrder;
    }

    // Add text search
    if (params.query) {
      searchParams.q = params.query;
    }

    return searchParams;
  }

  // Helper method to process search results
  private processSearchResult<T>(apiResponse: APIResponse<T[]>): SearchResult<T> {
    if (!apiResponse.success || !apiResponse.data) {
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0
      };
    }

    const total = apiResponse.total || apiResponse.data.length;
    const page = apiResponse.page || 1;
    const pageSize = apiResponse.pageSize || 10;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: apiResponse.data,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  // Method for full text search across all types
  async busquedaGeneral(query: string, params: SearchParams = {}): Promise<SearchResult<any>> {
    try {
      const searchParams = {
        ...params,
        q: query
      };

      const response: AxiosResponse<APIResponse<any[]>> = await this.api.get('/api/search', {
        params: searchParams
      });

      return this.processSearchResult(response.data);
    } catch (error) {
      console.error('Error in general search:', error);
      throw new Error('Failed to perform general search');
    }
  }

  // Method to get available filter options
  async obtenerOpcionesFiltros(): Promise<any> {
    try {
      const response: AxiosResponse<APIResponse<any>> = await this.api.get('/api/filter-options');
      
      if (!response.data.success) {
        throw new Error('Failed to get filter options');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching filter options:', error);
      throw new Error('Failed to fetch filter options');
    }
  }

  // Export methods
  async exportarCSV(filtros: SearchFilters = {}, tipo: string = 'convocatorias'): Promise<string> {
    try {
      const searchParams = this.buildSearchParams(filtros, {});
      searchParams.format = 'csv';
      
      const response = await this.api.get(`/api/export/${tipo}`, {
        params: searchParams,
        headers: {
          'Accept': 'text/csv'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw new Error('Failed to export CSV');
    }
  }

  async exportarExcel(filtros: SearchFilters = {}, tipo: string = 'convocatorias'): Promise<Blob> {
    try {
      const searchParams = this.buildSearchParams(filtros, {});
      searchParams.format = 'excel';
      
      const response = await this.api.get(`/api/export/${tipo}`, {
        params: searchParams,
        responseType: 'blob',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error exporting Excel:', error);
      throw new Error('Failed to export Excel');
    }
  }
}

// Create singleton instance
export const bdnsApi = new BDNSApiClient();

// Export specific search interfaces
export interface BasicSearchEngine {
  searchTypes: {
    convocatorias: typeof bdnsApi.buscarConvocatorias;
    concesiones: typeof bdnsApi.buscarConcesiones;
    ayudasEstado: typeof bdnsApi.buscarAyudasEstado;
    ayudasMinimis: typeof bdnsApi.buscarAyudasMinimis;
    planesEstrategicos: typeof bdnsApi.buscarPlanesEstrategicos;
  };
  
  fullTextSearch: typeof bdnsApi.busquedaGeneral;
  fieldSearch: typeof bdnsApi.buscarConvocatorias;
}