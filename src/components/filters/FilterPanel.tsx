'use client';

import { useState, useEffect } from 'react';
import { SearchFilters, DateRange } from '@/types/bdns';
import { 
  FunnelIcon, 
  XMarkIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  BuildingOfficeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface FilterPanelProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  loading?: boolean;
}

export default function FilterPanel({ filters, onFilterChange, loading = false }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterUpdate = (key: keyof SearchFilters, value: any) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
  };

  const clearFilters = () => {
    const emptyFilters: SearchFilters = {};
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.keys(localFilters).some(key => 
    localFilters[key as keyof SearchFilters] !== undefined && 
    localFilters[key as keyof SearchFilters] !== ''
  );

  // Predefined options (in a real app, these would come from the API)
  const organismos = [
    'Ministerio de Ciencia e Innovación',
    'Ministerio de Trabajo y Economía Social',
    'Ministerio de Industria, Comercio y Turismo',
    'Ministerio de Agricultura, Pesca y Alimentación',
    'Ministerio de Cultura y Deporte',
    'Ministerio de Educación y Formación Profesional',
    'Junta de Andalucía',
    'Generalitat de Catalunya',
    'Comunidad de Madrid',
    'Generalitat Valenciana'
  ];

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
          {/* Organismo Convocante */}
          <div>
            <label className="form-label flex items-center">
              <BuildingOfficeIcon className="h-4 w-4 mr-1" />
              Organismo Convocante
            </label>
            <select
              value={localFilters.organoConvocante || ''}
              onChange={(e) => handleFilterUpdate('organoConvocante', e.target.value || undefined)}
              className="form-select"
              disabled={loading}
            >
              <option value="">Todos los organismos</option>
              {organismos.map((organismo) => (
                <option key={organismo} value={organismo}>
                  {organismo}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Entidad */}
          <div>
            <label className="form-label">Tipo de Entidad</label>
            <select
              value={localFilters.tipoEntidad || ''}
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
              value={localFilters.materiaSubvencion || ''}
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
              value={localFilters.ubicacionGeografica || ''}
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
                value={localFilters.importeMinimo || ''}
                onChange={(e) => handleFilterUpdate('importeMinimo', e.target.value ? Number(e.target.value) : undefined)}
                className="form-input"
                disabled={loading}
              />
              <input
                type="number"
                placeholder="Hasta (€)"
                value={localFilters.importeMaximo || ''}
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
            <div className="space-y-2">
              <input
                type="date"
                placeholder="Fecha desde"
                value={localFilters.fechaConvocatoria?.desde ? 
                  localFilters.fechaConvocatoria.desde.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const fechaConvocatoria = localFilters.fechaConvocatoria || {};
                  handleFilterUpdate('fechaConvocatoria', {
                    ...fechaConvocatoria,
                    desde: e.target.value ? new Date(e.target.value) : undefined
                  });
                }}
                className="form-input"
                disabled={loading}
              />
              <input
                type="date"
                placeholder="Fecha hasta"
                value={localFilters.fechaConvocatoria?.hasta ? 
                  localFilters.fechaConvocatoria.hasta.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const fechaConvocatoria = localFilters.fechaConvocatoria || {};
                  handleFilterUpdate('fechaConvocatoria', {
                    ...fechaConvocatoria,
                    hasta: e.target.value ? new Date(e.target.value) : undefined
                  });
                }}
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          {/* Estado de Convocatoria */}
          <div>
            <label className="form-label">Estado</label>
            <select
              value={localFilters.estadoConvocatoria || ''}
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

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4 border-t border-gray-200">
            <button
              onClick={applyFilters}
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Aplicando...' : 'Aplicar Filtros'}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                disabled={loading}
                className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}