import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('🕛 CRON: Starting automatic incremental sync at', new Date().toISOString());
    
    // Verify this is an internal request (add a secret header for security)
    const authHeader = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET || 'bdns-cron-secret-2024';
    
    if (authHeader !== expectedSecret) {
      console.log('❌ CRON: Unauthorized sync attempt');
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Execute incremental sync (use Docker container working directory)
    const syncCommand = 'cd /app && npm run db:sync';
    console.log('🔄 CRON: Executing incremental sync command...');
    
    const { stdout, stderr } = await execAsync(syncCommand, {
      timeout: 30 * 60 * 1000, // 30 minutes timeout
    });

    console.log('✅ CRON: Incremental sync completed successfully');
    console.log('📊 CRON: Sync output:', stdout.slice(-500)); // Last 500 chars
    
    if (stderr) {
      console.log('⚠️ CRON: Sync warnings:', stderr.slice(-200));
    }

    return NextResponse.json({
      success: true,
      message: 'Automatic incremental sync completed successfully',
      timestamp: new Date().toISOString(),
      output: stdout.slice(-500), // Return last 500 chars of output
      warnings: stderr ? stderr.slice(-200) : null
    });

  } catch (error: any) {
    console.error('💥 CRON: Automatic sync failed:', error.message);
    
    return NextResponse.json({
      success: false,
      error: `Automatic sync failed: ${error.message}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint to check cron status
export async function GET() {
  try {
    // Return information about the last sync and cron status
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Check if cron is running
    const { stdout: cronStatus } = await execAsync('systemctl is-active cron || service cron status || echo "unknown"');
    
    return NextResponse.json({
      success: true,
      cronService: cronStatus.trim(),
      message: 'Automatic sync cron endpoint is ready',
      timestamp: new Date().toISOString(),
      nextMidnight: getNextMidnight()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

function getNextMidnight(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}