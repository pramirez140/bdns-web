'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSearchPersistence } from '@/hooks/useSearchPersistence';

interface Grant {
  identificador: string;
  titulo: string;
  organoConvocante: string;
  fechaPublicacion: string;
  fechaApertura: string;
  fechaCierre: string;
  importeTotal: number;
  objetivos: string;
  beneficiarios: string;
  enlaceOficial: string;
  enlaceBOE?: string;
}

export default function ConvocatoriaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { searchState, restoreScrollPosition, saveResultItemPosition } = useSearchPersistence();

  // Enhanced back navigation with scroll restoration
  const handleBackToSearch = () => {
    const searchQuery = searchParams.toString();
    let returnUrl = '/';
    
    if (searchQuery) {
      // Use URL parameters if available
      returnUrl = `/?${searchQuery}`;
    } else if (searchState.filters || searchState.params) {
      // Fall back to cached search state if no URL parameters
      const params = new URLSearchParams();
      
      if (searchState.filters.query) params.append('q', searchState.filters.query);
      if (searchState.filters.organoConvocante) params.append('organo', searchState.filters.organoConvocante);
      if (searchState.filters.importeMinimo) params.append('importe_min', searchState.filters.importeMinimo.toString());
      if (searchState.filters.importeMaximo) params.append('importe_max', searchState.filters.importeMaximo.toString());
      if (searchState.filters.fechaDesde) params.append('fecha_desde', searchState.filters.fechaDesde);
      if (searchState.filters.fechaHasta) params.append('fecha_hasta', searchState.filters.fechaHasta);
      if (searchState.filters.estadoConvocatoria) params.append('estado', searchState.filters.estadoConvocatoria);
      
      if (searchState.params.page) params.append('page', searchState.params.page.toString());
      if (searchState.params.pageSize) params.append('pageSize', searchState.params.pageSize.toString());
      if (searchState.params.sortBy) params.append('sortBy', searchState.params.sortBy);
      if (searchState.params.sortOrder) params.append('sortOrder', searchState.params.sortOrder);
      
      const queryString = params.toString();
      if (queryString) {
        returnUrl = `/?${queryString}`;
      }
    }
    
    console.log('🔄 Back navigation:', { searchQuery, cachedState: searchState, returnUrl });
    
    // Save the current item position for future reference
    saveResultItemPosition(params.id, window.pageYOffset);
    
    // Navigate back
    router.push(returnUrl);
    
    // Restore scroll position after navigation
    setTimeout(() => {
      restoreScrollPosition();
    }, 100);
  };

  // Build return URL with preserved search state
  const getReturnUrl = () => {
    const searchQuery = searchParams.toString();
    return searchQuery ? `/?${searchQuery}` : '/';
  };

  useEffect(() => {
    const fetchGrant = async () => {
      try {
        const response = await fetch(`/api/convocatoria/${params.id}`);
        const data = await response.json();
        
        if (data.success) {
          setGrant(data.data);
        } else {
          setError('Grant not found');
        }
      } catch (err) {
        setError('Error loading grant');
      } finally {
        setLoading(false);
      }
    };

    fetchGrant();
  }, [params.id]);

  const formatCurrency = (amount: number) => {
    if (amount === 0) return 'See official page';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES');
  };

  const getStatus = () => {
    if (!grant) return { label: 'Unknown', color: 'gray' };
    
    const now = new Date();
    const start = new Date(grant.fechaApertura);
    const end = new Date(grant.fechaCierre);
    
    if (now < start) return { label: 'Opening Soon', color: 'yellow' };
    if (now >= start && now <= end) return { label: 'Open', color: 'green' };
    return { label: 'Closed', color: 'red' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading grant details...</p>
        </div>
      </div>
    );
  }

  if (error || !grant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Grant Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || `Grant with ID ${params.id} could not be found.`}
          </p>
          <button 
            onClick={handleBackToSearch}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Search Results
          </button>
        </div>
      </div>
    );
  }

  const status = getStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation */}
        <button 
          onClick={handleBackToSearch}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 bg-transparent border-0 cursor-pointer"
        >
          ← Back to Search Results
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {grant.titulo}
              </h1>
              <div className="flex items-center space-x-4 text-gray-600">
                <span>🏢 {grant.organoConvocante}</span>
                <span>🆔 {grant.identificador}</span>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium
              ${status.color === 'green' ? 'bg-green-100 text-green-800' :
                status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'}`}>
              {status.label}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <a
              href={grant.enlaceOficial}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              🔗 Official BDNS Portal
            </a>
            {grant.enlaceBOE && (
              <a
                href={grant.enlaceBOE}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                📄 Regulatory Bases
              </a>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Financial Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">💰 Financial Information</h2>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">Total Amount</div>
                <div className="text-3xl font-bold text-blue-900">
                  {formatCurrency(grant.importeTotal)}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📅 Important Dates</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Published</span>
                  <span className="text-gray-600">{formatDate(grant.fechaPublicacion)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Applications Open</span>
                  <span className="text-gray-600">{formatDate(grant.fechaApertura)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Applications Close</span>
                  <span className="text-gray-600">{formatDate(grant.fechaCierre)}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 Description & Objectives</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {grant.objetivos}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Target Beneficiaries */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">👥 Target Beneficiaries</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  {grant.beneficiarios}
                </p>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <span className="text-amber-600 text-lg">ℹ️</span>
                <div>
                  <h3 className="text-sm font-medium text-amber-900 mb-2">
                    Important Information
                  </h3>
                  <p className="text-xs text-amber-800">
                    This information comes from the National Database of Subsidies (BDNS). 
                    Always consult the official portal for the most up-to-date and complete information.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Quick Actions</h3>
              <div className="space-y-3">
                <a
                  href={grant.enlaceOficial}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  View Official Page
                </a>
                <button
                  onClick={handleBackToSearch}
                  className="block w-full text-center border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Back to Search Results
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}