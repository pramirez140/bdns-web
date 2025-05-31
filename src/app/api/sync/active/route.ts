import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { BDNSLocalClient } from '@/lib/bdns-local';

export async function GET(request: NextRequest) {
  try {
    // Check for running sync processes
    const activeSyncs = await getActiveSyncProcesses();
    
    return NextResponse.json({
      success: true,
      data: {
        active_syncs: activeSyncs,
        has_active_syncs: activeSyncs.length > 0
      }
    });
  } catch (error: any) {
    console.error('Error checking active syncs:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function getActiveSyncProcesses(): Promise<any[]> {
  return new Promise((resolve) => {
    // Check for sync processes using ps
    const ps = spawn('ps', ['aux']);
    let output = '';

    ps.stdout.on('data', (data) => {
      output += data.toString();
    });

    ps.on('close', async () => {
      const lines = output.split('\n');
      const syncProcesses = lines.filter(line => 
        line.includes('sync-bdns-data.js') && !line.includes('grep')
      );

      const activeSyncs = await Promise.all(syncProcesses.map(async (line, index) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[1];
        const command = line.substring(line.indexOf('node'));
        
        // Extract sync type from command
        let syncType = 'incremental';
        if (command.includes('--full')) {
          syncType = 'full';
        } else if (command.includes('--complete')) {
          syncType = 'complete';
        }

        // Get latest sync info from database
        let syncInfo = {
          processed_pages: 0,
          processed_records: 0,
          new_records: 0,
          updated_records: 0,
          started_at: new Date().toISOString()
        };

        try {
          const bdnsLocal = new BDNSLocalClient();
          const latestSync = await bdnsLocal.getLatestSyncInfo();
          if (latestSync && latestSync.status === 'running') {
            syncInfo = {
              processed_pages: latestSync.processed_pages || 0,
              processed_records: latestSync.processed_records || 0,
              new_records: latestSync.new_records || 0,
              updated_records: latestSync.updated_records || 0,
              started_at: latestSync.started_at || new Date().toISOString()
            };
          }
        } catch (error) {
          console.error('Error fetching sync info from database:', error);
        }

        return {
          id: parseInt(pid),
          pid: pid,
          sync_type: syncType,
          status: 'running',
          command: command,
          ...syncInfo
        };
      }));

      resolve(activeSyncs);
    });

    ps.on('error', () => {
      resolve([]);
    });
  });
}