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
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCompleteMigrating, setIsCompleteMigrating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [latestSync, setLatestSync] = useState<LatestSync | null>(null);

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
        
        // Start polling for logs if complete migration
        if (type === 'complete') {
          startLogPolling(data.sync_id?.toString());
        }
        
        // Refresh status after a delay
        setTimeout(() => {
          fetchSyncStatus();
          if (type !== 'complete') {
            setIsSyncing(false);
          }
        }, 3000);
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

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch latest sync info
  const fetchLatestSync = async () => {
    try {
      const response = await fetch('/api/sync/logs');
      if (response.ok) {
        const data = await response.json();
        setLatestSync(data.data.latest_sync);
      }
    } catch (error) {
      console.error('Error fetching latest sync:', error);
    }
  };

  useEffect(() => {
    fetchLatestSync();
  }, [syncStatus]);

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
                {syncStatus.last_sync ? formatDate(syncStatus.last_sync) : 'Nunca'}
              </div>
              <div className="text-sm text-muted-foreground">Última Sincronización</div>
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
              <span className="text-xs text-muted-foreground">Descargar datos recientes (2023+)</span>
            </Button>

            <Button
              onClick={() => startSync('complete')}
              disabled={isLoading || isSyncing || isCompleteMigrating}
              variant="destructive"
              className="h-16 flex flex-col gap-1"
            >
              <Database className={`h-4 w-4 ${isCompleteMigrating ? 'animate-spin' : ''}`} />
              <span>Migración Completa</span>
              <span className="text-xs text-muted-foreground">TODAS las 300k+ convocatorias</span>
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

          {/* Latest sync information */}
          {latestSync && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-md font-semibold mb-2">📊 Última Sincronización</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Tipo:</span> {latestSync.sync_type}
                </div>
                <div>
                  <span className="font-medium">Estado:</span> 
                  <Badge variant={latestSync.status === 'completed' ? 'default' : 'secondary'} className="ml-1">
                    {latestSync.status}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Páginas:</span> {latestSync.processed_pages?.toLocaleString() || 0}
                </div>
                <div>
                  <span className="font-medium">Registros:</span> {latestSync.processed_records?.toLocaleString() || 0}
                </div>
                <div>
                  <span className="font-medium">Nuevos:</span> {latestSync.new_records?.toLocaleString() || 0}
                </div>
                <div>
                  <span className="font-medium">Actualizados:</span> {latestSync.updated_records?.toLocaleString() || 0}
                </div>
              </div>
              {latestSync.error_message && (
                <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-800">
                  <span className="font-medium">Error:</span> {latestSync.error_message}
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