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
  CurrencyDollarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useBudgetExtraction } from '@/hooks/useBudgetExtraction';
import { useState } from 'react';

interface SearchResultsProps {
  results: SearchResult<ConvocatoriaData>;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  currentSort: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

export default function SearchResults({ 
  results, 
  onPageChange, 
  onSortChange,
  currentSort 
}: SearchResultsProps) {
  const { data, total, page, pageSize, totalPages } = results;
  const { 
    loading, 
    error, 
    extractBudget, 
    extractMultipleBudgets, 
    getBudget, 
    isExtracting, 
    clearError 
  } = useBudgetExtraction();
  const [showBudgetButtons, setShowBudgetButtons] = useState(false);

  const formatCurrency = (amount: number, convocatoriaId: string) => {
    const budgetInfo = getBudget(convocatoriaId);
    
    if (budgetInfo?.presupuestoTexto) {
      return budgetInfo.presupuestoTexto;
    }
    
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

  const handleExtractBudget = async (convocatoriaId: string) => {
    try {
      await extractBudget(convocatoriaId);
    } catch (error) {
      console.error('Error extracting budget:', error);
    }
  };

  const handleExtractAllBudgets = async () => {
    try {
      const convocatoriaIds = data.map(conv => conv.identificador);
      await extractMultipleBudgets(convocatoriaIds);
    } catch (error) {
      console.error('Error extracting budgets:', error);
    }
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

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="btn-outline ml-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando{' '}
              <span className="font-medium">{(page - 1) * pageSize + 1}</span>
              {' '}a{' '}
              <span className="font-medium">
                {Math.min(page * pageSize, total)}
              </span>
              {' '}de{' '}
              <span className="font-medium">{total.toLocaleString('es-ES')}</span>
              {' '}resultados
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              {pages.map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    pageNum === page
                      ? 'z-10 bg-bdns-blue border-bdns-blue text-white'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
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
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              {total.toLocaleString('es-ES')} convocatorias encontradas
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              * La fecha mostrada es el registro en BDNS. Para fechas de cierre, consulta el portal oficial de cada convocatoria.
            </p>
          </div>
          
          {/* Budget Extraction Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowBudgetButtons(!showBudgetButtons)}
                className="btn-sm btn-outline flex items-center gap-2"
              >
                <CurrencyDollarIcon className="h-4 w-4" />
                {showBudgetButtons ? 'Ocultar presupuestos' : 'Mostrar presupuestos'}
              </button>
              
              {showBudgetButtons && (
                <button
                  onClick={handleExtractAllBudgets}
                  disabled={loading}
                  className="btn-sm btn-primary flex items-center gap-2"
                  title={`Extraer presupuestos de ${data.length} convocatorias (puede tardar varios minutos)`}
                >
                  {loading ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <CurrencyDollarIcon className="h-4 w-4" />
                  )}
                  {loading ? `Extrayendo...` : `Extraer todos (${data.length})`}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex justify-between items-center">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Budget Extraction Info */}
      {showBudgetButtons && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <CurrencyDollarIcon className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">Extracción de presupuestos</h3>
              <p className="text-xs text-blue-700 mt-1">
                Esta función extrae el presupuesto real ("Presupuesto total de la convocatoria") 
                directamente de las páginas oficiales de BDNS. El proceso puede tardar unos segundos por convocatoria.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                💡 Usa "Extraer todos" para obtener presupuestos de todas las convocatorias visibles, 
                o haz clic en "Presupuesto" en cada convocatoria individual.
              </p>
            </div>
          </div>
        </div>
      )}
      
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
          <div key={convocatoria.identificador} className="card p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <Link 
                  href={`/convocatorias/${convocatoria.identificador}`}
                  className="block hover:text-bdns-blue"
                >
                  <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2">
                    {convocatoria.titulo}
                  </h3>
                </Link>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                    <span>{convocatoria.organoConvocante}</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    <span>
                      {convocatoria.fechaApertura && convocatoria.fechaCierre && 
                       new Date(convocatoria.fechaApertura).getTime() !== new Date(convocatoria.fechaPublicacion).getTime() ? (
                        <>Apertura: {formatDate(convocatoria.fechaApertura)} • Cierre: {formatDate(convocatoria.fechaCierre)}</>
                      ) : (
                        <>Registro BDNS: {formatDate(convocatoria.fechaPublicacion)}</>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CurrencyEuroIcon className="h-4 w-4 mr-1" />
                      <span>{formatCurrency(convocatoria.importeTotal, convocatoria.identificador)}</span>
                    </div>
                    {showBudgetButtons && (
                      <button
                        onClick={() => handleExtractBudget(convocatoria.identificador)}
                        disabled={isExtracting(convocatoria.identificador)}
                        className="btn-sm btn-outline text-xs flex items-center gap-1"
                        title="Extraer presupuesto real de la página oficial"
                      >
                        {isExtracting(convocatoria.identificador) ? (
                          <ArrowPathIcon className="h-3 w-3 animate-spin" />
                        ) : (
                          <CurrencyDollarIcon className="h-3 w-3" />
                        )}
                        {isExtracting(convocatoria.identificador) ? 'Extrayendo...' : 'Presupuesto'}
                      </button>
                    )}
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
                        const apertura = new Date(convocatoria.fechaApertura);
                        const cierre = new Date(convocatoria.fechaCierre);
                        
                        if (now < apertura) {
                          return <span className="badge-yellow">Próximamente</span>;
                        } else if (now >= apertura && now <= cierre) {
                          return <span className="badge-green">Abierta</span>;
                        } else {
                          return <span className="badge-gray">Cerrada</span>;
                        }
                      } else if (hasCierre) {
                        const cierre = new Date(convocatoria.fechaCierre);
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