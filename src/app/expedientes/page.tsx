'use client';

import { useState, useEffect } from 'react';
import { Expediente, EstadoExpediente } from '@/types/bdns';
import ExpedienteList from '@/components/expedientes/ExpedienteList';
import ExpedienteForm from '@/components/expedientes/ExpedienteForm';
import { 
  PlusIcon,
  FolderIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function ExpedientesPage() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedExpediente, setSelectedExpediente] = useState<Expediente | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data - in a real app, this would come from an API
  useEffect(() => {
    const mockExpedientes: Expediente[] = [
      {
        id: '1',
        convocatoriaId: 'conv-001',
        titulo: 'Ayudas para I+D+i en empresas tecnológicas',
        organismo: 'Ministerio de Ciencia e Innovación',
        estado: 'EN_PREPARACION',
        fechaCreacion: new Date('2024-01-15'),
        fechaLimite: new Date('2024-03-30'),
        importeSolicitado: 150000,
        documentosRequeridos: [
          {
            id: 'doc-1',
            nombre: 'Proyecto técnico',
            obligatorio: true,
            descripcion: 'Descripción detallada del proyecto de I+D+i',
            formatosAceptados: ['pdf', 'doc', 'docx'],
            estado: 'PENDIENTE'
          },
          {
            id: 'doc-2',
            nombre: 'Presupuesto detallado',
            obligatorio: true,
            descripcion: 'Desglose económico del proyecto',
            formatosAceptados: ['pdf', 'xls', 'xlsx'],
            estado: 'SUBIDO',
            fechaSubida: new Date('2024-01-20')
          }
        ],
        observaciones: 'Proyecto innovador en el área de inteligencia artificial aplicada a la medicina'
      },
      {
        id: '2',
        convocatoriaId: 'conv-002',
        titulo: 'Subvenciones para fomento del empleo juvenil',
        organismo: 'Ministerio de Trabajo y Economía Social',
        estado: 'PRESENTADO',
        fechaCreacion: new Date('2024-01-10'),
        fechaLimite: new Date('2024-02-28'),
        importeSolicitado: 50000,
        documentosRequeridos: [
          {
            id: 'doc-3',
            nombre: 'Plan de contratación',
            obligatorio: true,
            descripcion: 'Planificación de contrataciones de jóvenes',
            formatosAceptados: ['pdf', 'doc'],
            estado: 'VALIDADO',
            fechaSubida: new Date('2024-01-25')
          }
        ],
        observaciones: 'Solicitud para contratar 10 jóvenes menores de 30 años'
      }
    ];

    // Simulate API call
    setTimeout(() => {
      setExpedientes(mockExpedientes);
      setLoading(false);
    }, 1000);
  }, []);

  const handleCreateExpediente = (expedienteData: Partial<Expediente>) => {
    const newExpediente: Expediente = {
      id: Date.now().toString(),
      convocatoriaId: expedienteData.convocatoriaId || '',
      titulo: expedienteData.titulo || '',
      organismo: expedienteData.organismo || '',
      estado: 'BORRADOR',
      fechaCreacion: new Date(),
      fechaLimite: expedienteData.fechaLimite || new Date(),
      importeSolicitado: expedienteData.importeSolicitado,
      documentosRequeridos: expedienteData.documentosRequeridos || [],
      observaciones: expedienteData.observaciones || ''
    };

    setExpedientes([...expedientes, newExpediente]);
    setShowForm(false);
  };

  const handleUpdateExpediente = (id: string, updates: Partial<Expediente>) => {
    setExpedientes(expedientes.map(exp => 
      exp.id === id ? { ...exp, ...updates } : exp
    ));
  };

  const handleDeleteExpediente = (id: string) => {
    setExpedientes(expedientes.filter(exp => exp.id !== id));
  };

  const getEstadisticas = () => {
    const total = expedientes.length;
    const borradores = expedientes.filter(e => e.estado === 'BORRADOR').length;
    const enPreparacion = expedientes.filter(e => e.estado === 'EN_PREPARACION').length;
    const presentados = expedientes.filter(e => e.estado === 'PRESENTADO').length;
    const aprobados = expedientes.filter(e => e.estado === 'APROBADO').length;

    return { total, borradores, enPreparacion, presentados, aprobados };
  };

  const stats = getEstadisticas();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bdns-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando expedientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Expedientes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra tus solicitudes de subvenciones y ayudas
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nuevo Expediente
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FolderIcon className="h-8 w-8 text-gray-500" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-gray-400" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-600">{stats.borradores}</div>
              <div className="text-sm text-gray-600">Borradores</div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.enPreparacion}</div>
              <div className="text-sm text-gray-600">En Preparación</div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-600">{stats.presentados}</div>
              <div className="text-sm text-gray-600">Presentados</div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-600">{stats.aprobados}</div>
              <div className="text-sm text-gray-600">Aprobados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Expedientes List */}
      {expedientes.length > 0 ? (
        <ExpedienteList
          expedientes={expedientes}
          onUpdate={handleUpdateExpediente}
          onDelete={handleDeleteExpediente}
          onSelect={setSelectedExpediente}
        />
      ) : (
        <div className="card p-8">
          <div className="text-center">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No hay expedientes
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza creando tu primer expediente de solicitud.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Crear Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ExpedienteForm
          onSubmit={handleCreateExpediente}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}