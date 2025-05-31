'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, RefreshCw, Database, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface ActiveSync {
  id: number;
  sync_type: string;
  status: string;
  started_at: string;
  processed_pages: number;
  processed_records: number;
  new_records: number;
  updated_records: number;
  total_pages?: number;
  progress_percentage?: number;
}

interface SyncBannerData {
  active_syncs: ActiveSync[];
  has_active_syncs: boolean;
}

export function SyncBanner() {
  const [syncData, setSyncData] = useState<SyncBannerData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Fetch active sync status
  const fetchActiveSyncs = async () => {
    try {
      const response = await fetch('/api/sync');
      if (response.ok) {
        const data = await response.json();
        
        // Check if there's an active sync based on recent activity
        const latestSync = data.data.latest_sync;
        const activeSyncs: ActiveSync[] = [];
        
        if (latestSync && latestSync.status === 'running') {
          activeSyncs.push({
            id: latestSync.id,
            sync_type: latestSync.sync_type || 'incremental',
            status: 'running',
            started_at: latestSync.started_at,
            processed_pages: latestSync.processed_pages || 0,
            processed_records: latestSync.processed_records || 0,
            new_records: latestSync.new_records || 0,
            updated_records: latestSync.updated_records || 0,
            progress_percentage: latestSync.processed_pages && latestSync.total_pages
              ? Math.round((latestSync.processed_pages / latestSync.total_pages) * 100)
              : undefined
          });
        }
        
        setSyncData({
          active_syncs: activeSyncs,
          has_active_syncs: activeSyncs.length > 0
        });
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
      setSyncData({
        active_syncs: [],
        has_active_syncs: false
      });
    }
  };

  // Poll for updates every 5 seconds
  useEffect(() => {
    fetchActiveSyncs();
    const interval = setInterval(fetchActiveSyncs, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Don't render if no active syncs or banner is hidden
  if (!syncData?.has_active_syncs || !isVisible) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('es-ES', {
      timeStyle: 'medium',
      dateStyle: 'short'
    }).format(new Date(dateStr));
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES').format(num);
  };

  const getSyncTypeLabel = (type: string) => {
    switch (type) {
      case 'incremental': return 'Incremental';
      case 'full': return 'Completa';
      case 'complete': return 'Migración Completa';
      default: return type;
    }
  };

  const getSyncIcon = (type: string) => {
    switch (type) {
      case 'incremental': return RefreshCw;
      case 'full': return Database;
      case 'complete': return Database;
      default: return RefreshCw;
    }
  };

  return (
    <div className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="font-medium">
                  {syncData.active_syncs.length === 1 
                    ? 'Sincronización en progreso' 
                    : `${syncData.active_syncs.length} sincronizaciones en progreso`
                  }
                </span>
              </div>
              
              {/* Summary info for multiple syncs */}
              {syncData.active_syncs.length > 0 && (
                <div className="hidden sm:flex items-center space-x-4 text-sm">
                  {syncData.active_syncs.map((sync, index) => {
                    const SyncIcon = getSyncIcon(sync.sync_type);
                    return (
                      <div key={sync.id} className="flex items-center space-x-1">
                        <SyncIcon className="h-3 w-3" />
                        <span>{getSyncTypeLabel(sync.sync_type)}</span>
                        {sync.progress_percentage && (
                          <span className="ml-1">({sync.progress_percentage}%)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {syncData.active_syncs.length > 0 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center space-x-1 text-sm hover:text-blue-200 transition-colors"
                >
                  <span>Detalles</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              )}
              
              <button
                onClick={() => setIsVisible(false)}
                className="text-blue-200 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-4 space-y-3">
              {syncData.active_syncs.map((sync) => {
                const SyncIcon = getSyncIcon(sync.sync_type);
                return (
                  <div key={sync.id} className="bg-blue-500 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <SyncIcon className="h-4 w-4" />
                        <span className="font-medium">{getSyncTypeLabel(sync.sync_type)}</span>
                        <Badge variant="secondary" className="bg-blue-400 text-white">
                          {sync.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        <Clock className="h-3 w-3" />
                        <span>Iniciado: {formatDate(sync.started_at)}</span>
                      </div>
                    </div>

                    {/* Progress bar if available */}
                    {sync.progress_percentage && (
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progreso</span>
                          <span>{sync.progress_percentage}%</span>
                        </div>
                        <Progress value={sync.progress_percentage} className="h-2" />
                      </div>
                    )}

                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-blue-200">Páginas procesadas</div>
                        <div className="font-medium">{formatNumber(sync.processed_pages)}</div>
                      </div>
                      <div>
                        <div className="text-blue-200">Registros procesados</div>
                        <div className="font-medium">{formatNumber(sync.processed_records)}</div>
                      </div>
                      <div>
                        <div className="text-blue-200">Nuevos registros</div>
                        <div className="font-medium">{formatNumber(sync.new_records)}</div>
                      </div>
                      <div>
                        <div className="text-blue-200">Actualizados</div>
                        <div className="font-medium">{formatNumber(sync.updated_records)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}