'use client';

import { ConvocatoriaData, SearchResult } from '@/types/bdns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  BuildingOfficeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSearchPersistence } from '@/hooks/useSearchPersistence';
import { FavoriteButton } from '@/components/ui/favorite-button';
import { useExport } from '@/hooks/useExport';
import { useState } from 'react';

interface SearchResultsProps {
  results: SearchResult<ConvocatoriaData>;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  currentSort: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  searchParams?: {
    query?: string;
    organismos?: string[];
    region?: string[];
    organizationId?: string;
  };
}

export default function SearchResults({ 
  results, 
  onPageChange, 
  onSortChange,
  currentSort,
  searchParams
}: SearchResultsProps) {
  const { data, total, page, pageSize, totalPages, hasMore, hasPrevious } = results;
  const { saveScrollPosition, saveResultItemPosition } = useSearchPersistence();
  const { exportData, isExporting, error, clearError } = useExport();
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportLimit, setExportLimit] = useState(100);

  // Save scroll position when clicking on a grant
  const handleGrantClick = (grantId: string) => {
    // Save current scroll position
    saveScrollPosition();
    
    // Save the position of this specific item for precise restoration
    const element = document.querySelector(`[data-grant-id="${grantId}"]`);
    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const elementPosition = scrollTop + rect.top;
      saveResultItemPosition(grantId, elementPosition);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) {
      return 'Ver convocatoria oficial';
    }
    
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM/yyyy', { locale: es });
  };

  const getSortIcon = (field: string) => {
    if (currentSort.sortBy !== field) {
      return <ChevronUpIcon className="h-4 w-4 text-gray-400" />;
    }
    return currentSort.sortOrder === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4 text-gray-600" />
      : <ChevronDownIcon className="h-4 w-4 text-gray-600" />;
  };

  const handleSort = (field: string) => {
    const newOrder = currentSort.sortBy === field && currentSort.sortOrder === 'asc' 
      ? 'desc' 
      : 'asc';
    onSortChange(field, newOrder);
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    try {
      clearError();
      await exportData({
        query: searchParams?.query,
        organismos: searchParams?.organismos,
        region: searchParams?.region,
        organizationId: searchParams?.organizationId,
        limit: exportLimit,
        format
      });
      setShowExportOptions(false);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Close export options when clicking outside
  const handleClickOutside = () => {
    if (showExportOptions) {
      setShowExportOptions(false);
    }
  };

  const renderPagination = () => {
    // PERFORMANCE FIX: Simplified pagination without total count
    const showPrevious = hasPrevious !== undefined ? hasPrevious : page > 1;
    const showNext = hasMore !== undefined ? hasMore : true; // Default to showing next if not specified

    return (
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!showPrevious}
            className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!showNext}
            className="btn-outline ml-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando{' '}
              <span className="font-medium">{data.length}</span>
              {' '}resultados - Página{' '}
              <span className="font-medium">{page}</span>
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={!showPrevious}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              {/* Show current page number */}
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-bdns-blue text-white text-sm font-medium">
                Página {page}
              </span>
              
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={!showNext}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className="card p-8">
        <div className="text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No se encontraron resultados
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros de búsqueda o usar términos diferentes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-medium text-gray-900">
              {total.toLocaleString('es-ES')} convocatorias encontradas
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              * La fecha mostrada es el registro en BDNS. Para fechas de cierre, consulta el portal oficial de cada convocatoria.
            </p>
          </div>
          
          {/* Export Options */}
          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              disabled={isExporting}
              className="btn-outline flex items-center gap-2 text-sm"
            >
              <ArrowDownTrayIcon className={`h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
              {isExporting ? 'Exportando...' : 'Exportar'}
            </button>
            
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de resultados
                    </label>
                    <select
                      value={exportLimit}
                      onChange={(e) => setExportLimit(parseInt(e.target.value))}
                      className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                    >
                      <option value={50}>50 resultados</option>
                      <option value={100}>100 resultados</option>
                      <option value={250}>250 resultados</option>
                      <option value={500}>500 resultados</option>
                      <option value={1000}>1000 resultados</option>
                    </select>
                  </div>
                  
                  <div className="w-full">
                    <button
                      onClick={() => handleExport('csv')}
                      disabled={isExporting}
                      className="w-full bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Exportar a CSV
                    </button>
                  </div>
                  
                  {error && (
                    <div className="text-red-600 text-xs">
                      Error: {error}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Sorting Controls */}
      <div className="card p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">Ordenar por:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => handleSort('fechaPublicacion')}
              className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900"
            >
              <span>Fecha</span>
              {getSortIcon('fechaPublicacion')}
            </button>
            <button
              onClick={() => handleSort('importeTotal')}
              className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900"
            >
              <span>Importe</span>
              {getSortIcon('importeTotal')}
            </button>
            <button
              onClick={() => handleSort('titulo')}
              className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900"
            >
              <span>Título</span>
              {getSortIcon('titulo')}
            </button>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {data.map((convocatoria) => (
          <div 
            key={convocatoria.identificador} 
            data-grant-id={convocatoria.identificador}
            className="card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <Link 
                    href={`/convocatorias/${convocatoria.identificador}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:text-bdns-blue flex-1"
                    onClick={() => handleGrantClick(convocatoria.identificador)}
                  >
                    <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                      {convocatoria.titulo}
                    </h3>
                  </Link>
                  <FavoriteButton 
                    grantId={convocatoria.id || 0} 
                    className="ml-2 flex-shrink-0"
                    size="sm"
                  />
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                    <button
                      onClick={() => {
                        if (convocatoria.organizationId) {
                          window.open(`/organizaciones/${convocatoria.organizationId}`, '_blank');
                        }
                      }}
                      className="text-left hover:text-bdns-blue hover:underline transition-colors"
                      title="Ver todas las convocatorias de esta organización"
                    >
                      {convocatoria.organoConvocante}
                    </button>
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    <span>
                      {(() => {
                        const pubDate = new Date(convocatoria.fechaPublicacion);
                        const closeDate = convocatoria.fechaCierre ? new Date(convocatoria.fechaCierre) : null;
                        const openDate = convocatoria.fechaApertura ? new Date(convocatoria.fechaApertura) : null;
                        
                        // Detect artificial close dates (more than 1 year after publication for old grants)
                        const isArtificialCloseDate = closeDate && 
                          (closeDate.getFullYear() - pubDate.getFullYear() > 1) &&
                          pubDate.getFullYear() < 2020;
                        
                        if (openDate && closeDate && !isArtificialCloseDate && 
                            openDate.getTime() !== pubDate.getTime()) {
                          return <>Apertura: {formatDate(openDate)} • Cierre: {formatDate(closeDate)}</>;
                        } else if (closeDate && !isArtificialCloseDate) {
                          return <>Publicado: {formatDate(pubDate)} • Cierre: {formatDate(closeDate)}</>;
                        } else {
                          return <>Publicado: {formatDate(pubDate)}</>;
                        }
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <CurrencyEuroIcon className="h-4 w-4 mr-1" />
                    <span>{formatCurrency(convocatoria.importeTotal)}</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                  {convocatoria.objetivos}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    {(() => {
                      const beneficiarios = convocatoria.beneficiarios;
                      const excludedTypes = [
                        'PERSONAS FÍSICAS QUE NO DESARROLLAN ACTIVIDAD ECONÓMICA',
                        'PERSONAS JURÍDICAS QUE NO DESARROLLAN ACTIVIDAD ECONÓMICA', 
                        'PYME Y PERSONAS FÍSICAS QUE DESARROLLAN ACTIVIDAD ECONÓMICA'
                      ];
                      
                      // Only show beneficiarios badge if it's not in the excluded list and is meaningful
                      if (beneficiarios && !excludedTypes.includes(beneficiarios.trim())) {
                        return (
                          <span className="badge-blue">
                            {beneficiarios}
                          </span>
                        );
                      }
                      return null;
                    })()}
                    {(() => {
                      const now = new Date();
                      const hasApertura = convocatoria.fechaApertura && convocatoria.fechaApertura !== convocatoria.fechaPublicacion;
                      const hasCierre = convocatoria.fechaCierre;
                      
                      if (hasApertura && hasCierre) {
                        const apertura = new Date(convocatoria.fechaApertura!);
                        const cierre = new Date(convocatoria.fechaCierre!);
                        
                        if (now < apertura) {
                          return <span className="badge-yellow">Próximamente</span>;
                        } else if (now >= apertura && now <= cierre) {
                          return <span className="badge-green">Abierta</span>;
                        } else {
                          return <span className="badge-gray">Cerrada</span>;
                        }
                      } else if (hasCierre) {
                        const cierre = new Date(convocatoria.fechaCierre!);
                        if (now <= cierre) {
                          return <span className="badge-green">Abierta</span>;
                        } else {
                          return <span className="badge-gray">Cerrada</span>;
                        }
                      } else {
                        return <span className="badge-green">Publicada</span>;
                      }
                    })()}
                  </div>
                  
                  <div className="flex space-x-2">
                    {convocatoria.enlaceBOE && (
                      <a
                        href={convocatoria.enlaceBOE}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-bdns-blue hover:underline"
                      >
                        Ver BOE
                      </a>
                    )}
                    <a
                      href={convocatoria.enlaceOficial}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-bdns-blue hover:underline"
                    >
                      Portal oficial
                    </a>
                    <Link
                      href={`/convocatorias/${convocatoria.identificador}`}
                      className="text-sm text-bdns-blue hover:underline"
                      onClick={() => handleGrantClick(convocatoria.identificador)}
                    >
                      Ver detalles
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="card">
          {renderPagination()}
        </div>
      )}
    </div>
  );
}