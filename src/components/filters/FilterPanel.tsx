'use client';

import { useState, useEffect, useRef } from 'react';
import { SearchFilters, DateRange } from '@/types/bdns';
import { 
  FunnelIcon, 
  XMarkIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface FilterPanelProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  loading?: boolean;
}

export default function FilterPanel({ filters, onFilterChange, loading = false }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [organismos, setOrganismos] = useState<Array<{nombre: string, totalConvocatorias: number}>>([]);
  const [loadingOrganismos, setLoadingOrganismos] = useState(false);
  
  // Estados para el selector múltiple de organismos
  const [organismosSearch, setOrganismosSearch] = useState('');
  const [showOrganismosDropdown, setShowOrganismosDropdown] = useState(false);
  const organismosDropdownRef = useRef<HTMLDivElement>(null);

  const handleFilterUpdate = (key: keyof SearchFilters, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    onFilterChange(updatedFilters);
  };

  const clearFilters = () => {
    // Clear organism search state
    setOrganismosSearch('');
    setShowOrganismosDropdown(false);
    
    // Clear all filters
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof SearchFilters];
    if (value === undefined || value === null || value === '') return false;
    
    // Handle arrays (like organoConvocante)
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    // Handle objects (like fechaConvocatoria)
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== undefined && v !== null && v !== '');
    }
    
    return true;
  });

  // Load organismos from API
  useEffect(() => {
    async function fetchOrganismos() {
      setLoadingOrganismos(true);
      try {
        const response = await fetch('/api/organismos');
        const data = await response.json();
        if (data.success) {
          setOrganismos(data.data);
        } else {
          console.error('Failed to fetch organismos:', data.error);
        }
      } catch (error) {
        console.error('Error fetching organismos:', error);
      } finally {
        setLoadingOrganismos(false);
      }
    }
    
    fetchOrganismos();
  }, []);

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (organismosDropdownRef.current && !organismosDropdownRef.current.contains(event.target as Node)) {
        setShowOrganismosDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handlers para selector múltiple de organismos
  const selectedOrganismos = filters.organoConvocante || [];
  
  const filteredOrganismos = organismos.filter(org =>
    org.nombre.toLowerCase().includes(organismosSearch.toLowerCase())
  );

  const handleOrganismoToggle = (organismo: string) => {
    const currentSelected = filters.organoConvocante || [];
    const newSelected = currentSelected.includes(organismo)
      ? currentSelected.filter(o => o !== organismo)
      : [...currentSelected, organismo];
    
    handleFilterUpdate('organoConvocante', newSelected.length > 0 ? newSelected : undefined);
  };

  const removeOrganismo = (organismo: string) => {
    const newSelected = (filters.organoConvocante || []).filter(o => o !== organismo);
    handleFilterUpdate('organoConvocante', newSelected.length > 0 ? newSelected : undefined);
  };

  const tiposEntidad = [
    'ESTATAL',
    'AUTONOMICA', 
    'LOCAL'
  ];

  const materias = [
    'I+D+i',
    'Empleo y Formación',
    'Medio Ambiente',
    'Agricultura y Ganadería',
    'Turismo',
    'Cultura',
    'Deportes',
    'Educación',
    'Sanidad',
    'Servicios Sociales',
    'Industria',
    'Comercio',
    'Energía',
    'Transporte'
  ];

  const comunidadesAutonomas = [
    'Andalucía',
    'Aragón',
    'Asturias',
    'Baleares',
    'Canarias',
    'Cantabria',
    'Castilla-La Mancha',
    'Castilla y León',
    'Cataluña',
    'Ceuta',
    'Extremadura',
    'Galicia',
    'La Rioja',
    'Madrid',
    'Melilla',
    'Murcia',
    'Navarra',
    'País Vasco',
    'Valencia'
  ];

  const importeRanges = [
    { min: 0, max: 10000, label: 'Hasta 10.000 €' },
    { min: 10000, max: 50000, label: '10.000 - 50.000 €' },
    { min: 50000, max: 100000, label: '50.000 - 100.000 €' },
    { min: 100000, max: 500000, label: '100.000 - 500.000 €' },
    { min: 500000, max: 1000000, label: '500.000 - 1.000.000 €' },
    { min: 1000000, max: Infinity, label: 'Más de 1.000.000 €' }
  ];

  return (
    <div className="card">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-bdns-blue text-white">
                Activos
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <XMarkIcon className="h-5 w-5" />
            ) : (
              <FunnelIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Filters Content */}
      <div className={`${isExpanded ? 'block' : 'hidden'} lg:block`}>
        <div className="p-4 space-y-6">
          {/* Organismo Convocante - Selector Múltiple */}
          <div>
            <label className="form-label flex items-center">
              <BuildingOfficeIcon className="h-4 w-4 mr-1" />
              Organismo Convocante
              {selectedOrganismos.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-bdns-blue text-white text-xs rounded-full">
                  {selectedOrganismos.length}
                </span>
              )}
            </label>
            
            {/* Organismos seleccionados */}
            {selectedOrganismos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedOrganismos.map((organismo) => (
                  <span
                    key={organismo}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {organismo.length > 50 ? `${organismo.substring(0, 50)}...` : organismo}
                    <button
                      onClick={() => removeOrganismo(organismo)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Buscador con dropdown */}
            <div className="relative" ref={organismosDropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  placeholder={loadingOrganismos ? 'Cargando organismos...' : 'Buscar organismos...'}
                  value={organismosSearch}
                  onChange={(e) => setOrganismosSearch(e.target.value)}
                  onFocus={() => setShowOrganismosDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-bdns-blue focus:border-transparent"
                  disabled={loading || loadingOrganismos}
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <button
                  onClick={() => setShowOrganismosDropdown(!showOrganismosDropdown)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Dropdown con resultados */}
              {showOrganismosDropdown && !loadingOrganismos && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredOrganismos.length > 0 ? (
                    filteredOrganismos.slice(0, 20).map((organismo) => (
                      <div
                        key={organismo.nombre}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                          selectedOrganismos.includes(organismo.nombre) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleOrganismoToggle(organismo.nombre)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {organismo.nombre}
                            </div>
                            <div className="text-xs text-gray-500">
                              {organismo.totalConvocatorias} convocatorias
                            </div>
                          </div>
                          {selectedOrganismos.includes(organismo.nombre) && (
                            <div className="ml-2 w-4 h-4 bg-bdns-blue text-white rounded-full flex items-center justify-center text-xs">
                              ✓
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {organismosSearch ? 'No se encontraron organismos' : 'Escribe para buscar organismos'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tipo de Entidad */}
          <div>
            <label className="form-label">Tipo de Entidad</label>
            <select
              value={filters.tipoEntidad || ''}
              onChange={(e) => handleFilterUpdate('tipoEntidad', e.target.value || undefined)}
              className="form-select"
              disabled={loading}
            >
              <option value="">Todos los tipos</option>
              {tiposEntidad.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo === 'ESTATAL' ? 'Estatal' : 
                   tipo === 'AUTONOMICA' ? 'Autonómica' : 'Local'}
                </option>
              ))}
            </select>
          </div>

          {/* Materia */}
          <div>
            <label className="form-label">Materia</label>
            <select
              value={filters.materiaSubvencion || ''}
              onChange={(e) => handleFilterUpdate('materiaSubvencion', e.target.value || undefined)}
              className="form-select"
              disabled={loading}
            >
              <option value="">Todas las materias</option>
              {materias.map((materia) => (
                <option key={materia} value={materia}>
                  {materia}
                </option>
              ))}
            </select>
          </div>

          {/* Ubicación Geográfica */}
          <div>
            <label className="form-label flex items-center">
              <MapPinIcon className="h-4 w-4 mr-1" />
              Comunidad Autónoma
            </label>
            <select
              value={filters.ubicacionGeografica || ''}
              onChange={(e) => handleFilterUpdate('ubicacionGeografica', e.target.value || undefined)}
              className="form-select"
              disabled={loading}
            >
              <option value="">Todas las comunidades</option>
              {comunidadesAutonomas.map((ca) => (
                <option key={ca} value={ca}>
                  {ca}
                </option>
              ))}
            </select>
          </div>

          {/* Rango de Importes */}
          <div>
            <label className="form-label flex items-center">
              <CurrencyEuroIcon className="h-4 w-4 mr-1" />
              Rango de Importe
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Desde (€)"
                value={filters.importeMinimo || ''}
                onChange={(e) => handleFilterUpdate('importeMinimo', e.target.value ? Number(e.target.value) : undefined)}
                className="form-input"
                disabled={loading}
              />
              <input
                type="number"
                placeholder="Hasta (€)"
                value={filters.importeMaximo || ''}
                onChange={(e) => handleFilterUpdate('importeMaximo', e.target.value ? Number(e.target.value) : undefined)}
                className="form-input"
                disabled={loading}
              />
            </div>
            <div className="mt-2 space-y-1">
              {importeRanges.map((range, index) => (
                <button
                  key={index}
                  onClick={() => {
                    handleFilterUpdate('importeMinimo', range.min);
                    handleFilterUpdate('importeMaximo', range.max === Infinity ? undefined : range.max);
                  }}
                  className="block w-full text-left text-xs text-gray-600 hover:text-bdns-blue p-1 rounded hover:bg-gray-50"
                  disabled={loading}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rango de Fechas */}
          <div>
            <label className="form-label flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Fechas de Convocatoria
            </label>
            <div className="space-y-3">
              {/* Date Range Presets */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const startOfWeek = new Date(now);
                    const day = now.getDay();
                    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                    startOfWeek.setDate(diff);
                    startOfWeek.setHours(0, 0, 0, 0);
                    handleFilterUpdate('fechaConvocatoria', {
                      desde: startOfWeek,
                      hasta: now
                    });
                  }}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  disabled={loading}
                >
                  Esta semana
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    handleFilterUpdate('fechaConvocatoria', {
                      desde: startOfMonth,
                      hasta: now
                    });
                  }}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  disabled={loading}
                >
                  Este mes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    handleFilterUpdate('fechaConvocatoria', {
                      desde: startOfYear,
                      hasta: now
                    });
                  }}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  disabled={loading}
                >
                  Este año
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                    handleFilterUpdate('fechaConvocatoria', {
                      desde: lastMonth,
                      hasta: endOfLastMonth
                    });
                  }}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  disabled={loading}
                >
                  Mes pasado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const lastYear = new Date(now.getFullYear() - 1, 0, 1);
                    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
                    handleFilterUpdate('fechaConvocatoria', {
                      desde: lastYear,
                      hasta: endOfLastYear
                    });
                  }}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  disabled={loading}
                >
                  Año pasado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleFilterUpdate('fechaConvocatoria', undefined);
                  }}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  disabled={loading}
                >
                  Limpiar
                </button>
              </div>
              
              {/* Month/Year Selectors */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Desde</label>
                  <div className="grid grid-cols-2 gap-1">
                    <select
                      value={filters.fechaConvocatoria?.desde?.getMonth() ?? ''}
                      onChange={(e) => {
                        const fechaConvocatoria = filters.fechaConvocatoria || {};
                        const currentYear = fechaConvocatoria.desde?.getFullYear() ?? new Date().getFullYear();
                        const newDate = e.target.value !== '' ? new Date(currentYear, parseInt(e.target.value), 1) : undefined;
                        handleFilterUpdate('fechaConvocatoria', {
                          ...fechaConvocatoria,
                          desde: newDate
                        });
                      }}
                      className="text-xs form-input py-1"
                      disabled={loading}
                    >
                      <option value="">Mes</option>
                      <option value="0">Ene</option>
                      <option value="1">Feb</option>
                      <option value="2">Mar</option>
                      <option value="3">Abr</option>
                      <option value="4">May</option>
                      <option value="5">Jun</option>
                      <option value="6">Jul</option>
                      <option value="7">Ago</option>
                      <option value="8">Sep</option>
                      <option value="9">Oct</option>
                      <option value="10">Nov</option>
                      <option value="11">Dic</option>
                    </select>
                    <select
                      value={filters.fechaConvocatoria?.desde?.getFullYear() ?? ''}
                      onChange={(e) => {
                        const fechaConvocatoria = filters.fechaConvocatoria || {};
                        const currentMonth = fechaConvocatoria.desde?.getMonth() ?? 0;
                        const newDate = e.target.value !== '' ? new Date(parseInt(e.target.value), currentMonth, 1) : undefined;
                        handleFilterUpdate('fechaConvocatoria', {
                          ...fechaConvocatoria,
                          desde: newDate
                        });
                      }}
                      className="text-xs form-input py-1"
                      disabled={loading}
                    >
                      <option value="">Año</option>
                      {Array.from({ length: 18 }, (_, i) => 2025 - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Hasta</label>
                  <div className="grid grid-cols-2 gap-1">
                    <select
                      value={filters.fechaConvocatoria?.hasta?.getMonth() ?? ''}
                      onChange={(e) => {
                        const fechaConvocatoria = filters.fechaConvocatoria || {};
                        const currentYear = fechaConvocatoria.hasta?.getFullYear() ?? new Date().getFullYear();
                        const month = parseInt(e.target.value);
                        const newDate = e.target.value !== '' ? new Date(currentYear, month + 1, 0) : undefined; // Last day of month
                        handleFilterUpdate('fechaConvocatoria', {
                          ...fechaConvocatoria,
                          hasta: newDate
                        });
                      }}
                      className="text-xs form-input py-1"
                      disabled={loading}
                    >
                      <option value="">Mes</option>
                      <option value="0">Ene</option>
                      <option value="1">Feb</option>
                      <option value="2">Mar</option>
                      <option value="3">Abr</option>
                      <option value="4">May</option>
                      <option value="5">Jun</option>
                      <option value="6">Jul</option>
                      <option value="7">Ago</option>
                      <option value="8">Sep</option>
                      <option value="9">Oct</option>
                      <option value="10">Nov</option>
                      <option value="11">Dic</option>
                    </select>
                    <select
                      value={filters.fechaConvocatoria?.hasta?.getFullYear() ?? ''}
                      onChange={(e) => {
                        const fechaConvocatoria = filters.fechaConvocatoria || {};
                        const currentMonth = fechaConvocatoria.hasta?.getMonth() ?? 0;
                        const newDate = e.target.value !== '' ? new Date(parseInt(e.target.value), currentMonth + 1, 0) : undefined; // Last day of month
                        handleFilterUpdate('fechaConvocatoria', {
                          ...fechaConvocatoria,
                          hasta: newDate
                        });
                      }}
                      className="text-xs form-input py-1"
                      disabled={loading}
                    >
                      <option value="">Año</option>
                      {Array.from({ length: 18 }, (_, i) => 2025 - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Display selected range */}
              {(filters.fechaConvocatoria?.desde || filters.fechaConvocatoria?.hasta) && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  Rango seleccionado: {' '}
                  {filters.fechaConvocatoria?.desde ? 
                    filters.fechaConvocatoria.desde.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : 
                    'Sin inicio'} 
                  {' → '}
                  {filters.fechaConvocatoria?.hasta ? 
                    filters.fechaConvocatoria.hasta.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : 
                    'Sin fin'}
                </div>
              )}
            </div>
          </div>

          {/* Estado de Convocatoria */}
          <div>
            <label className="form-label">Estado</label>
            <select
              value={filters.estadoConvocatoria || ''}
              onChange={(e) => handleFilterUpdate('estadoConvocatoria', e.target.value || undefined)}
              className="form-select"
              disabled={loading}
            >
              <option value="">Todos los estados</option>
              <option value="Abierta">Abierta</option>
              <option value="Cerrada">Cerrada</option>
              <option value="Resuelta">Resuelta</option>
              <option value="Anulada">Anulada</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={clearFilters}
                disabled={loading}
                className="btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpiar Filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}