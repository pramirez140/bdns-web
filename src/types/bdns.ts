// BDNS Data Models based on official documentation

export interface SubvencionBDNS {
  // Identificación
  identificador: string;
  codigoBDNS: string;
  
  // Organismos
  organoConvocante: string;
  entidadConvocante: string;
  nivelAdministracion: 'ESTATAL' | 'AUTONOMICA' | 'LOCAL';
  
  // Información básica
  tituloConvocatoria: string;
  objetoSubvencion: string;
  finalidadSubvencion: string;
  
  // Datos económicos
  importeTotal: number;
  importeMaximoBeneficiario: number;
  tipoFinanciacion: string;
  
  // Fechas importantes
  fechaPublicacion: Date;
  fechaAperturaPresentacion: Date;
  fechaCierrePresentacion: Date;
  
  // Beneficiarios y requisitos
  tipoBeneficiarios: string;
  requisitos: string;
  documentacion: string[];
  
  // Enlaces y referencias
  enlaceConvocatoria: string;
  enlaceBOE: string;
  basesReguladoras: string;
  
  // Ubicación
  ambitoGeografico: string;
  comunidadAutonoma?: string;
  provincia?: string;
}

export interface ConvocatoriaData {
  // Campos básicos según BDNS
  id?: number; // Internal database ID for favorites
  identificador: string;
  titulo: string;
  organoConvocante: string;
  organoConvocanteCorto?: string; // Short organization name
  organizationId?: number; // Organization ID for linking
  fechaPublicacion: Date;
  fechaApertura: Date;
  fechaCierre: Date | null;
  importeTotal: number;
  importeMaximoBeneficiario: number;
  objetivos: string;
  beneficiarios: string;
  requisitos: string[];
  documentacionRequerida: string[];
  criteriosSeleccion: string[];
  enlaceOficial: string;
  boe: string; // Enlace al BOE
  enlaceBOE?: string; // Enlace al BOE (opcional para compatibilidad)
}

export interface ConcesionData {
  id: string;
  convocatoriaId: string;
  beneficiario: string;
  importeConcedido: number;
  fechaConcesion: Date;
  estado: 'CONCEDIDA' | 'JUSTIFICADA' | 'REINTEGRADA';
  observaciones?: string;
}

export interface SearchFilters {
  // Campos principales según documentación BDNS
  query?: string;                   // Búsqueda de texto libre
  organoConvocante?: string[];      // Ministerio, CCAA, etc. (array para selección múltiple)
  tipoEntidad?: string;             // Estatal, Autonómica, Local
  materiaSubvencion?: string;       // I+D+i, Empleo, etc.
  beneficiario?: string;            // Nombre del beneficiario
  importeMinimo?: number;           // Rango de importes
  importeMaximo?: number;
  fechaConvocatoria?: DateRange;    // Rango de fechas
  estadoConvocatoria?: string;      // Abierta, Cerrada, etc.
  ubicacionGeografica?: string;     // CCAA, Provincia
  
  // Campos adicionales para compatibilidad con BDNS API
  codigoSIA?: string;               // Código SIA
  instrumentos?: string[];          // Instrumentos de financiación
  sectores?: string[];              // Sectores económicos
}

export interface DateRange {
  desde?: Date;
  hasta?: Date;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore?: boolean; // Indicates if there are more results available
  hasPrevious?: boolean; // Indicates if there's a previous page
}

export interface BasicFilterSystem {
  // Filtros organizacionales
  porOrganismo: {
    administracionEstatal: string[];
    comunidadesAutonomas: string[];
    entidadesLocales: string[];
  };
  
  // Filtros temporales
  porFecha: {
    fechaPublicacion: DateFilter;
    fechaApertura: DateFilter;
    fechaCierre: DateFilter;
    ejercicioProcedimiento: YearFilter;
  };
  
  // Filtros económicos
  porImporte: {
    rangos: ImporteRange[];
    tipoFinanciacion: string[]; // Subvención, Préstamo, etc.
  };
  
  // Filtros por tipo
  porCategoria: {
    tipoConvocatoria: string[];
    instrumentoAyuda: string[];
    sectorActividad: string[];
  };
}

export interface DateFilter {
  min?: Date;
  max?: Date;
}

export interface YearFilter {
  years: number[];
}

export interface ImporteRange {
  min: number;
  max: number;
  label: string;
}

// ERP Basic Models
export interface Expediente {
  id: string;
  convocatoriaId: string;
  titulo: string;
  organismo: string;
  estado: EstadoExpediente;
  fechaCreacion: Date;
  fechaLimite: Date;
  importeSolicitado?: number;
  importeConcedido?: number;
  documentosRequeridos: DocumentoRequerido[];
  observaciones: string;
}

export type EstadoExpediente = 
  | 'BORRADOR'
  | 'EN_PREPARACION'
  | 'PRESENTADO'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'DESISTIDO';

export interface DocumentoRequerido {
  id: string;
  nombre: string;
  obligatorio: boolean;
  descripcion?: string;
  formatosAceptados: string[];
  fechaSubida?: Date;
  estado: 'PENDIENTE' | 'SUBIDO' | 'VALIDADO' | 'RECHAZADO';
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Search Parameters for API
export interface SearchParams extends PaginationParams, SortParams {
  query?: string;
  filters?: SearchFilters;
}