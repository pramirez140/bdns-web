'use client';

import { Expediente, EstadoExpediente } from '@/types/bdns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  DocumentIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ExpedienteListProps {
  expedientes: Expediente[];
  onUpdate: (id: string, updates: Partial<Expediente>) => void;
  onDelete: (id: string) => void;
  onSelect: (expediente: Expediente) => void;
}

export default function ExpedienteList({ 
  expedientes, 
  onUpdate, 
  onDelete, 
  onSelect 
}: ExpedienteListProps) {
  
  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy', { locale: es });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'No especificado';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getEstadoBadge = (estado: EstadoExpediente) => {
    const badges = {
      'BORRADOR': 'badge-gray',
      'EN_PREPARACION': 'badge-yellow',
      'PRESENTADO': 'badge-blue',
      'APROBADO': 'badge-green',
      'RECHAZADO': 'badge-red',
      'DESISTIDO': 'badge-gray'
    };

    const labels = {
      'BORRADOR': 'Borrador',
      'EN_PREPARACION': 'En Preparación',
      'PRESENTADO': 'Presentado',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado',
      'DESISTIDO': 'Desistido'
    };

    return (
      <span className={badges[estado]}>
        {labels[estado]}
      </span>
    );
  };

  const getDaysUntilDeadline = (deadline: Date) => {
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineStatus = (deadline: Date) => {
    const days = getDaysUntilDeadline(deadline);
    if (days < 0) return { color: 'text-red-600', text: `Vencido hace ${Math.abs(days)} días` };
    if (days === 0) return { color: 'text-red-600', text: 'Vence hoy' };
    if (days <= 7) return { color: 'text-yellow-600', text: `${days} días restantes` };
    return { color: 'text-green-600', text: `${days} días restantes` };
  };

  const getDocumentProgress = (expediente: Expediente) => {
    const total = expediente.documentosRequeridos.length;
    const completed = expediente.documentosRequeridos.filter(
      doc => doc.estado === 'VALIDADO' || doc.estado === 'SUBIDO'
    ).length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const handleEstadoChange = (expediente: Expediente, newEstado: EstadoExpediente) => {
    onUpdate(expediente.id, { estado: newEstado });
  };

  const handleDelete = (expediente: Expediente) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el expediente "${expediente.titulo}"?`)) {
      onDelete(expediente.id);
    }
  };

  return (
    <div className="space-y-4">
      {expedientes.map((expediente) => {
        const deadlineStatus = getDeadlineStatus(expediente.fechaLimite);
        const docProgress = getDocumentProgress(expediente);

        return (
          <div key={expediente.id} className="card p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {expediente.titulo}
                    </h3>
                    <p className="text-sm text-gray-600">{expediente.organismo}</p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {getEstadoBadge(expediente.estado)}
                  </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Fechas */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span>Creado: {formatDate(expediente.fechaCreacion)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <span className={deadlineStatus.color}>
                        Límite: {formatDate(expediente.fechaLimite)} ({deadlineStatus.text})
                      </span>
                    </div>
                  </div>

                  {/* Importe */}
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <CurrencyEuroIcon className="h-4 w-4 mr-2" />
                      <span>Importe solicitado:</span>
                    </div>
                    <div className="text-lg font-medium text-gray-900">
                      {formatCurrency(expediente.importeSolicitado)}
                    </div>
                    {expediente.importeConcedido && (
                      <div className="text-sm text-green-600">
                        Concedido: {formatCurrency(expediente.importeConcedido)}
                      </div>
                    )}
                  </div>

                  {/* Documentos */}
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <DocumentIcon className="h-4 w-4 mr-2" />
                      <span>Documentos ({docProgress.completed}/{docProgress.total})</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${docProgress.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {docProgress.percentage.toFixed(0)}% completado
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                {expediente.observaciones && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                      {expediente.observaciones}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    {/* Estado Selector */}
                    <select
                      value={expediente.estado}
                      onChange={(e) => handleEstadoChange(expediente, e.target.value as EstadoExpediente)}
                      className="text-sm border-gray-300 rounded-md focus:ring-bdns-blue focus:border-bdns-blue"
                    >
                      <option value="BORRADOR">Borrador</option>
                      <option value="EN_PREPARACION">En Preparación</option>
                      <option value="PRESENTADO">Presentado</option>
                      <option value="APROBADO">Aprobado</option>
                      <option value="RECHAZADO">Rechazado</option>
                      <option value="DESISTIDO">Desistido</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onSelect(expediente)}
                      className="p-2 text-gray-600 hover:text-bdns-blue hover:bg-gray-100 rounded-md transition-colors"
                      title="Ver detalles"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {/* TODO: Implement edit */}}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Editar"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(expediente)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Eliminar"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}