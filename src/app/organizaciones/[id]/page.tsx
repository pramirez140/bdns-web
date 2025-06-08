'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ConvocatoriaData, SearchResult } from '@/types/bdns';
import SearchResults from '@/components/search/SearchResults';
import { BuildingOfficeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface OrganizationData {
  id: number;
  name: string;
  full_name: string;
  level_id: number;
  parent_id?: number;
}

export default function OrganizationGrantsPage() {
  const params = useParams();
  const organizationId = params.id as string;
  
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [grants, setGrants] = useState<SearchResult<ConvocatoriaData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSort, setCurrentSort] = useState<{
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }>({
    sortBy: 'fechaPublicacion',
    sortOrder: 'desc'
  });

  const fetchOrganizationDetails = async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}`);
      if (!response.ok) throw new Error('Failed to fetch organization details');
      const data = await response.json();
      setOrganization(data.data);
    } catch (err: any) {
      console.error('Error fetching organization:', err);
      setError(err.message);
    }
  };

  const fetchGrants = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        sortBy: currentSort.sortBy,
        sortOrder: currentSort.sortOrder
      });

      const response = await fetch(`/api/organizations/${organizationId}/grants?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch grants');
      
      const data = await response.json();
      setGrants(data.data);
    } catch (err: any) {
      console.error('Error fetching grants:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationDetails();
      fetchGrants(1);
    }
  }, [organizationId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchGrants(page);
  };

  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setCurrentSort({ sortBy, sortOrder });
    setCurrentPage(1);
    setTimeout(() => fetchGrants(1), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información de la organización...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Organización no encontrada</h2>
          <p className="text-gray-600 mb-6">
            {error || `La organización con ID ${organizationId} no pudo ser encontrada.`}
          </p>
          <Link 
            href="/"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 inline-block"
          >
            Volver a la búsqueda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link 
            href="/"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Volver a la búsqueda
          </Link>
        </div>
        
        <div className="card p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <BuildingOfficeIcon className="h-12 w-12 text-bdns-blue" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {organization?.full_name || organization?.name || 'Organización'}
              </h1>
              {organization?.full_name && organization?.name !== organization?.full_name && (
                <p className="text-gray-600 mb-2">
                  Nombre corto: {organization.name}
                </p>
              )}
              {grants && (
                <p className="text-sm text-gray-500 mt-2">
                  {grants.total.toLocaleString('es-ES')} convocatorias encontradas
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {grants && (
        <SearchResults
          results={grants}
          onPageChange={handlePageChange}
          onSortChange={handleSortChange}
          currentSort={currentSort}
          searchParams={{
            organizationId: organizationId
          }}
        />
      )}
      
      {grants && grants.data.length === 0 && (
        <div className="card p-8 text-center">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay convocatorias
          </h3>
          <p className="text-gray-600">
            Esta organización no tiene convocatorias registradas en la base de datos.
          </p>
        </div>
      )}
    </div>
  );
}