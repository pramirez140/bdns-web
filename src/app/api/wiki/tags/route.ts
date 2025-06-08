import { NextRequest, NextResponse } from 'next/server';
import { wikiDb } from '@/lib/wiki-database';

export async function GET() {
  try {
    const tags = await wikiDb.getTags();
    
    return NextResponse.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error fetching wiki tags:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}