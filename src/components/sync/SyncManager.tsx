'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Database, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface SyncStats {
  total_convocatorias: number;
  ultima_sincronizacion: string | null;
  convocatorias_abiertas: number;
}

interface SyncStatus {
  database_stats: SyncStats;
  last_sync: string | null;
  is_healthy: boolean;
}

interface SyncLogEntry {
  syncId: string;
  logs: string[];
  logCount: number;
}

interface LatestSync {
  id: number;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  processed_pages: number;
  processed_records: number;
  new_records: number;
  updated_records: number;
  error_message: string | null;
}

export function SyncManager() {
  const [mounted, setMounted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCompleteMigrating, setIsCompleteMigrating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [latestSync, setLatestSync] = useState<LatestSync | null>(null);
  const [syncJustStarted, setSyncJustStarted] = useState(false);
  const [isUpdatingLatestSync, setIsUpdatingLatestSync] = useState(false);
  const [lastSyncUpdate, setLastSyncUpdate] = useState<Date>(new Date());

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sync');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data.data);
        setLastUpdate(new Date());
      } else {
        console.error('Failed to fetch sync status');
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Start sync
  const startSync = async (type: 'full' | 'incremental' | 'complete') => {
    try {
      if (type === 'complete') {
        setIsCompleteMigrating(true);
        setShowLogs(true);
      } else {
        setIsSyncing(true);
      }
      
      // Mark that we just started a sync
      setSyncJustStarted(true);
      
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`${type} sync started:`, data);
        setCurrentSyncId(data.sync_id?.toString() || null);
        
        // Clear previous sync data and show "in progress" immediately
        setLatestSync({
          id: data.sync_id,
          sync_type: type,
          status: 'running',
          started_at: new Date().toISOString(),
          completed_at: null,
          processed_pages: 0,
          processed_records: 0,
          new_records: 0,
          updated_records: 0,
          error_message: null
        });
        
        // Start polling for logs if complete migration
        if (type === 'complete') {
          startLogPolling(data.sync_id?.toString());
        } else {
          // Start polling for progress on incremental/full sync
          startProgressPolling();
        }
        
        // Refresh status after a delay
        setTimeout(() => {
          fetchSyncStatus();
        }, 1000);
      } else {
        console.error('Failed to start sync');
        setIsSyncing(false);
        setIsCompleteMigrating(false);
      }
    } catch (error) {
      console.error('Error starting sync:', error);
      setIsSyncing(false);
      setIsCompleteMigrating(false);
    }
  };

  // Poll for progress during incremental/full sync
  const startProgressPolling = () => {
    let pollCount = 0;
    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        await fetchLatestSync();
        await fetchSyncStatus();
        
        console.log(`[SYNC PANEL] Poll #${pollCount}, Latest sync:`, latestSync?.status, latestSync?.processed_pages);
        
        // Clear the "just started" flag after first poll
        if (pollCount === 1) {
          setSyncJustStarted(false);
        }
        
        // After 3 polls (9 seconds), start checking if sync is done
        if (pollCount > 3) {
          // Check if no progress is being made (sync likely finished)
          if (latestSync && (latestSync.status === 'completed' || latestSync.status === 'failed')) {
            clearInterval(pollInterval);
            console.log('[SYNC PANEL] Sync finished, clearing temporary banner');
            
            // Update sync status to refresh última sincronización
            await fetchSyncStatus();
            
            // Clear temporary banner immediately
            setIsSyncing(false);
            setIsCompleteMigrating(false);
            setSyncJustStarted(false);
            console.log('[SYNC PANEL] Temporary banner hidden');
            return;
          }
        }
        
        // Auto-hide after 60 seconds regardless
        if (pollCount >= 20) {
          clearInterval(pollInterval);
          setIsSyncing(false);
          setIsCompleteMigrating(false);
          console.log('[SYNC PANEL] Auto-hiding after 60 seconds');
        }
        
      } catch (error) {
        console.error('Error polling progress:', error);
      }
    }, 3000); // Poll every 3 seconds
  };

  // Poll for logs during complete migration
  const startLogPolling = (syncId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/sync/logs?syncId=${syncId}`);
        if (response.ok) {
          const data = await response.json();
          setSyncLogs(data.data.logs || []);
          
          // Check if sync is complete
          const statusResponse = await fetch('/api/sync');
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const latestSyncInfo = statusData.data.latest_sync;
            if (latestSyncInfo && latestSyncInfo.status === 'completed') {
              clearInterval(pollInterval);
              setIsCompleteMigrating(false);
              fetchSyncStatus(); // Final status update
            }
          }
        }
      } catch (error) {
        console.error('Error polling logs:', error);
      }
    }, 2000); // Poll every 2 seconds
    
    // Stop polling after 1 hour
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsCompleteMigrating(false);
    }, 3600000);
  };

  // Auto-refresh status every 60 seconds (reduced frequency)
  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch latest sync info
  const fetchLatestSync = async () => {
    try {
      setIsUpdatingLatestSync(true);
      const response = await fetch('/api/sync');
      if (response.ok) {
        const data = await response.json();
        const latest = data.data.latest_sync;
        console.log('[SYNC PANEL] Fetched latest sync:', latest);
        setLatestSync(latest);
        setLastSyncUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching latest sync:', error);
    } finally {
      setIsUpdatingLatestSync(false);
    }
  };

  useEffect(() => {
    fetchLatestSync();
  }, [syncStatus]);

  // Enhanced polling for active syncs - update latest sync info more frequently
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    // If there's an active sync, poll more frequently
    if (latestSync?.status === 'running') {
      console.log('[SYNC PANEL] Starting enhanced polling for active sync');
      pollInterval = setInterval(() => {
        fetchLatestSync();
      }, 3000); // Poll every 3 seconds for active syncs
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        console.log('[SYNC PANEL] Stopped enhanced polling');
      }
    };
  }, [latestSync?.status]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES').format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr));
  };

  const getHealthStatus = () => {
    if (!syncStatus) return { icon: AlertCircle, label: 'Desconocido', variant: 'secondary' as const };
    
    if (syncStatus.is_healthy) {
      return { icon: CheckCircle, label: 'Saludable', variant: 'default' as const };
    } else {
      return { icon: AlertCircle, label: 'Error', variant: 'destructive' as const };
    }
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  if (!mounted) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Cargando...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sincronización de Datos BDNS
            </CardTitle>
            <CardDescription>
              Gestión de la sincronización con la base de datos local
            </CardDescription>
          </div>
          <Badge variant={healthStatus.variant} className="flex items-center gap-1">
            <HealthIcon className="h-3 w-3" />
            {healthStatus.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statistics */}
        {syncStatus && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(syncStatus.database_stats.total_convocatorias)}
                </div>
                <div className="text-sm text-muted-foreground">Total Convocatorias</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(syncStatus.database_stats.convocatorias_abiertas)}
                </div>
                <div className="text-sm text-muted-foreground">Abiertas</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {syncStatus.database_stats.ultima_sincronizacion ? formatDate(syncStatus.database_stats.ultima_sincronizacion) : 'Nunca'}
                </div>
                <div className="text-sm text-muted-foreground">Última Sincronización</div>
              </div>
            </div>
            
          </div>
        )}

        <Separator />

        {/* Sync Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Acciones de Sincronización</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => startSync('incremental')}
              disabled={isLoading || isSyncing || isCompleteMigrating}
              variant="outline"
              className="h-16 flex flex-col gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronización Incremental</span>
              <span className="text-xs text-muted-foreground">Actualizar cambios recientes</span>
            </Button>

            <Button
              onClick={() => startSync('full')}
              disabled={isLoading || isSyncing || isCompleteMigrating}
              variant="default"
              className="h-16 flex flex-col gap-1"
            >
              <Database className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronización Completa</span>
              <span className="text-xs text-muted-foreground">Datos de 2025 (optimizado)</span>
            </Button>

            <Button
              onClick={() => startSync('complete')}
              disabled={isLoading || isSyncing || isCompleteMigrating}
              variant="destructive"
              className="h-16 flex flex-col gap-1"
            >
              <Database className={`h-4 w-4 ${isCompleteMigrating ? 'animate-spin' : ''}`} />
              <span>Migración Completa</span>
              <span className="text-xs text-muted-foreground">Histórico completo (solo si es necesario)</span>
            </Button>
          </div>

          {(isSyncing || isCompleteMigrating) && (
            <div className={`p-4 border rounded-lg ${
              isCompleteMigrating 
                ? 'bg-red-50 border-red-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 animate-spin ${
                  isCompleteMigrating ? 'text-red-600' : 'text-blue-600'
                }`} />
                <span className={isCompleteMigrating ? 'text-red-800' : 'text-blue-800'}>
                  {isCompleteMigrating 
                    ? 'Migración completa en progreso... (esto puede tomar varias horas)' 
                    : 'Sincronización en progreso...'}
                </span>
              </div>
              {isCompleteMigrating && (
                <div className="mt-2">
                  <Button
                    onClick={() => setShowLogs(!showLogs)}
                    variant="ghost"
                    size="sm"
                  >
                    {showLogs ? 'Ocultar Logs' : 'Ver Logs en Tiempo Real'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Real-time logs for complete migration */}
          {showLogs && isCompleteMigrating && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-md font-semibold mb-2">📋 Logs de Migración en Tiempo Real</h4>
              <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-60 overflow-y-auto">
                {syncLogs.length > 0 ? (
                  syncLogs.slice(-20).map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                ) : (
                  <div>Esperando logs...</div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Mostrando últimas 20 entradas • Total: {syncLogs.length} logs
              </div>
            </div>
          )}

          {/* Latest sync details panel - always visible */}
          {latestSync && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-semibold text-blue-800">
                  📊 Última Sincronización
                </h4>
                <div className="text-xs text-blue-600 flex items-center">
                  {latestSync.status === 'running' && (
                    <>
                      <div className="animate-spin mr-1">🔄</div>
                      En progreso...
                    </>
                  )}
                  {(latestSync.status === 'completed' || latestSync.status === 'idle') && (
                    <>
                      Completado
                    </>
                  )}
                  {latestSync.status === 'failed' && (
                    <>
                      <div className="mr-1">❌</div>
                      Falló
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {latestSync.sync_type === 'complete' ? 'Completa' : 
                     latestSync.sync_type === 'full' ? 'Completa' : 
                     'Incremental'}
                  </div>
                  <div className="text-xs text-gray-600">Tipo</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {latestSync?.processed_pages?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-gray-600">Páginas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {latestSync?.new_records?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-gray-600">Nuevas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">
                    {latestSync?.updated_records?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-gray-600">Actualizadas</div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <div className="text-sm text-gray-600">
                  Total procesados: <span className="font-medium">{latestSync?.processed_records?.toLocaleString() || '0'}</span>
                </div>
                {latestSync.started_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    Iniciada: {new Date(latestSync.started_at).toLocaleString('es-ES')}
                  </div>
                )}
                {latestSync.completed_at && (
                  <div className="text-xs text-gray-500">
                    Finalizada: {new Date(latestSync.completed_at).toLocaleString('es-ES')}
                  </div>
                )}
                {latestSync.status === 'running' && (
                  <div className="text-xs text-gray-400 mt-1">
                    Última actualización: {lastSyncUpdate.toLocaleTimeString('es-ES')}
                  </div>
                )}
              </div>
              {latestSync?.status === 'completed' && (
                <div className="mt-2 text-center text-xs text-green-700 bg-green-100 p-2 rounded">
                  Sincronización finalizada con éxito
                </div>
              )}
              {latestSync?.status === 'failed' && latestSync.error_message && (
                <div className="mt-2 text-center text-xs text-red-700 bg-red-100 p-2 rounded">
                  ❌ Error: {latestSync.error_message}
                </div>
              )}
            </div>
          )}

        </div>

        <Separator />

        {/* Status Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Actualizado: {lastUpdate.toLocaleTimeString('es-ES')}
          </div>
          
          <Button
            onClick={fetchSyncStatus}
            disabled={isLoading}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}