import { NextRequest, NextResponse } from 'next/server';
import { bdnsLocalClient } from '@/lib/bdns-local';
import { spawn } from 'child_process';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Getting sync statistics...');

    // Get sync statistics from database
    const stats = await bdnsLocalClient.getSyncStatistics();

    console.log('✅ Sync statistics retrieved:', stats);

    return NextResponse.json({
      success: true,
      data: {
        database_stats: stats,
        last_sync: stats.ultima_sincronizacion,
        is_healthy: await bdnsLocalClient.isHealthy()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('💥 Failed to get sync statistics:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'incremental' } = body;

    console.log(`🔄 Starting ${type} sync...`);

    // Validate sync type
    if (!['full', 'incremental', 'complete'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid sync type. Must be "full", "incremental", or "complete".',
      }, { status: 400 });
    }

    // Start sync process in background
    const syncProcess = await startSyncProcess(type);

    return NextResponse.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} sync started successfully`,
      sync_id: syncProcess.pid,
      type: type,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('💥 Failed to start sync:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function startSyncProcess(type: 'full' | 'incremental' | 'complete'): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'sync-bdns-data.js');
    let args: string[] = [];
    
    if (type === 'full') {
      args = ['--full'];
    } else if (type === 'complete') {
      args = ['--complete'];
    }
    // incremental has no args
    
    console.log(`🚀 Spawning sync process: node ${scriptPath} ${args.join(' ')}`);
    
    const syncProcess = spawn('node', [scriptPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL
      },
      detached: true
    });

    // Let the process run in background
    syncProcess.unref();

    // Log output for debugging
    syncProcess.stdout?.on('data', (data) => {
      console.log(`[SYNC] ${data.toString().trim()}`);
    });

    syncProcess.stderr?.on('data', (data) => {
      console.error(`[SYNC ERROR] ${data.toString().trim()}`);
    });

    syncProcess.on('error', (error) => {
      console.error('💥 Sync process error:', error);
      reject(error);
    });

    // Resolve immediately since we want async operation
    setTimeout(() => {
      resolve({
        pid: syncProcess.pid,
        started: true
      });
    }, 1000);
  });
}