'use client';

import { useState } from 'react';
import { Expediente, DocumentoRequerido } from '@/types/bdns';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ExpedienteFormProps {
  expediente?: Expediente;
  onSubmit: (expediente: Partial<Expediente>) => void;
  onCancel: () => void;
}

export default function ExpedienteForm({ expediente, onSubmit, onCancel }: ExpedienteFormProps) {
  const [formData, setFormData] = useState({
    titulo: expediente?.titulo || '',
    organismo: expediente?.organismo || '',
    convocatoriaId: expediente?.convocatoriaId || '',
    fechaLimite: expediente?.fechaLimite ? 
      expediente.fechaLimite.toISOString().split('T')[0] : '',
    importeSolicitado: expediente?.importeSolicitado?.toString() || '',
    observaciones: expediente?.observaciones || '',
  });

  const [documentos, setDocumentos] = useState<DocumentoRequerido[]>(
    expediente?.documentosRequeridos || []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addDocumento = () => {
    const newDoc: DocumentoRequerido = {
      id: Date.now().toString(),
      nombre: '',
      obligatorio: true,
      descripcion: '',
      formatosAceptados: ['pdf'],
      estado: 'PENDIENTE'
    };
    setDocumentos([...documentos, newDoc]);
  };

  const updateDocumento = (id: string, field: keyof DocumentoRequerido, value: any) => {
    setDocumentos(documentos.map(doc =>
      doc.id === id ? { ...doc, [field]: value } : doc
    ));
  };

  const removeDocumento = (id: string) => {
    setDocumentos(documentos.filter(doc => doc.id !== id));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El título es obligatorio';
    }

    if (!formData.organismo.trim()) {
      newErrors.organismo = 'El organismo es obligatorio';
    }

    if (!formData.fechaLimite) {
      newErrors.fechaLimite = 'La fecha límite es obligatoria';
    } else {
      const selectedDate = new Date(formData.fechaLimite);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.fechaLimite = 'La fecha límite no puede ser anterior a hoy';
      }
    }

    if (formData.importeSolicitado && isNaN(Number(formData.importeSolicitado))) {
      newErrors.importeSolicitado = 'El importe debe ser un número válido';
    }

    // Validate documentos
    documentos.forEach((doc, index) => {
      if (!doc.nombre.trim()) {
        newErrors[`documento_${index}_nombre`] = 'El nombre del documento es obligatorio';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const expedienteData: Partial<Expediente> = {
      titulo: formData.titulo.trim(),
      organismo: formData.organismo.trim(),
      convocatoriaId: formData.convocatoriaId.trim() || `conv-${Date.now()}`,
      fechaLimite: new Date(formData.fechaLimite),
      importeSolicitado: formData.importeSolicitado ? Number(formData.importeSolicitado) : undefined,
      observaciones: formData.observaciones.trim(),
      documentosRequeridos: documentos.filter(doc => doc.nombre.trim())
    };

    onSubmit(expedienteData);
  };

  const formatosDisponibles = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png'
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {expediente ? 'Editar Expediente' : 'Nuevo Expediente'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">
                Título del Expediente *
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => handleInputChange('titulo', e.target.value)}
                className={`form-input ${errors.titulo ? 'border-red-300' : ''}`}
                placeholder="Ej: Solicitud ayuda I+D+i 2024"
              />
              {errors.titulo && (
                <p className="mt-1 text-sm text-red-600">{errors.titulo}</p>
              )}
            </div>

            <div>
              <label className="form-label">
                Organismo Convocante *
              </label>
              <input
                type="text"
                value={formData.organismo}
                onChange={(e) => handleInputChange('organismo', e.target.value)}
                className={`form-input ${errors.organismo ? 'border-red-300' : ''}`}
                placeholder="Ej: Ministerio de Ciencia e Innovación"
              />
              {errors.organismo && (
                <p className="mt-1 text-sm text-red-600">{errors.organismo}</p>
              )}
            </div>

            <div>
              <label className="form-label">
                ID de Convocatoria
              </label>
              <input
                type="text"
                value={formData.convocatoriaId}
                onChange={(e) => handleInputChange('convocatoriaId', e.target.value)}
                className="form-input"
                placeholder="Se generará automáticamente si se deja vacío"
              />
            </div>

            <div>
              <label className="form-label">
                Fecha Límite *
              </label>
              <input
                type="date"
                value={formData.fechaLimite}
                onChange={(e) => handleInputChange('fechaLimite', e.target.value)}
                className={`form-input ${errors.fechaLimite ? 'border-red-300' : ''}`}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.fechaLimite && (
                <p className="mt-1 text-sm text-red-600">{errors.fechaLimite}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="form-label">
                Importe Solicitado (€)
              </label>
              <input
                type="number"
                value={formData.importeSolicitado}
                onChange={(e) => handleInputChange('importeSolicitado', e.target.value)}
                className={`form-input ${errors.importeSolicitado ? 'border-red-300' : ''}`}
                placeholder="0"
                min="0"
                step="0.01"
              />
              {errors.importeSolicitado && (
                <p className="mt-1 text-sm text-red-600">{errors.importeSolicitado}</p>
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="form-label">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => handleInputChange('observaciones', e.target.value)}
              rows={3}
              className="form-input"
              placeholder="Notas adicionales sobre el expediente..."
            />
          </div>

          {/* Documentos Requeridos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">
                Documentos Requeridos
              </h4>
              <button
                type="button"
                onClick={addDocumento}
                className="btn-outline flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Agregar Documento
              </button>
            </div>

            {documentos.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-md">
                <p className="text-gray-500">No hay documentos agregados</p>
                <button
                  type="button"
                  onClick={addDocumento}
                  className="mt-2 text-bdns-blue hover:underline"
                >
                  Agregar el primer documento
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {documentos.map((doc, index) => (
                  <div key={doc.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h5 className="font-medium text-gray-900">
                        Documento {index + 1}
                      </h5>
                      <button
                        type="button"
                        onClick={() => removeDocumento(doc.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">
                          Nombre del Documento *
                        </label>
                        <input
                          type="text"
                          value={doc.nombre}
                          onChange={(e) => updateDocumento(doc.id, 'nombre', e.target.value)}
                          className={`form-input ${errors[`documento_${index}_nombre`] ? 'border-red-300' : ''}`}
                          placeholder="Ej: Proyecto técnico"
                        />
                        {errors[`documento_${index}_nombre`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`documento_${index}_nombre`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="form-label">
                          ¿Es obligatorio?
                        </label>
                        <select
                          value={doc.obligatorio ? 'true' : 'false'}
                          onChange={(e) => updateDocumento(doc.id, 'obligatorio', e.target.value === 'true')}
                          className="form-select"
                        >
                          <option value="true">Sí, es obligatorio</option>
                          <option value="false">No, es opcional</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="form-label">
                          Descripción
                        </label>
                        <textarea
                          value={doc.descripcion || ''}
                          onChange={(e) => updateDocumento(doc.id, 'descripcion', e.target.value)}
                          rows={2}
                          className="form-input"
                          placeholder="Descripción del documento requerido..."
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="form-label">
                          Formatos Aceptados
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formatosDisponibles.map(formato => (
                            <label key={formato} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={doc.formatosAceptados.includes(formato)}
                                onChange={(e) => {
                                  const newFormatos = e.target.checked
                                    ? [...doc.formatosAceptados, formato]
                                    : doc.formatosAceptados.filter(f => f !== formato);
                                  updateDocumento(doc.id, 'formatosAceptados', newFormatos);
                                }}
                                className="rounded border-gray-300 text-bdns-blue focus:ring-bdns-blue"
                              />
                              <span className="ml-2 text-sm text-gray-700 uppercase">
                                {formato}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="btn-outline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {expediente ? 'Actualizar' : 'Crear'} Expediente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}