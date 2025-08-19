import { NextRequest, NextResponse } from 'next/server';

// Required for static export
export const dynamic = 'force-static';
export const revalidate = false; // No revalidation for this stateful API

interface InitProgress {
  step: string;
  progress: number;
  status: 'downloading' | 'processing' | 'complete' | 'error';
  message: string;
  bytesDownloaded?: number;
  totalBytes?: number;
}

// In-memory progress tracking
const progressMap = new Map<string, InitProgress>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId } = body;
    
    if (action === 'start') {
      // Start the initialization process
      const initSessionId = sessionId || Date.now().toString();
      
      // Initialize progress
      progressMap.set(initSessionId, {
        step: 'starting',
        progress: 0,
        status: 'downloading',
        message: 'Initializing MTGJSON data download...'
      });
      
      // Start the download process in the background
      downloadAndProcessMTGJSON(initSessionId).catch(error => {
        progressMap.set(initSessionId, {
          step: 'error',
          progress: 0,
          status: 'error',
          message: `Initialization failed: ${error.message}`
        });
      });
      
      return NextResponse.json({
        success: true,
        sessionId: initSessionId,
        message: 'MTGJSON initialization started'
      });
    }
    
    if (action === 'download_config' && sessionId) {
      const config = progressMap.get(`${sessionId}_download_config`);
      if (config) {
        return NextResponse.json({ success: true, config });
      } else {
        return NextResponse.json({ success: false, message: 'Download config not found' });
      }
    }

    if (action === 'update_progress' && sessionId) {
      const { step, progress, status, message, bytesDownloaded, totalBytes } = body;
      
      progressMap.set(sessionId, {
        step,
        progress,
        status,
        message,
        bytesDownloaded,
        totalBytes
      });
      
      return NextResponse.json({ success: true });
    }

    if (action === 'complete' && sessionId) {
      const { totalCards } = body;
      
      progressMap.set(sessionId, {
        step: 'complete',
        progress: 100,
        status: 'complete',
        message: `Successfully processed MTGJSON data with ${totalCards?.toLocaleString() || 'unknown'} cards`
      });
      
      // Clean up after completion
      setTimeout(() => {
        progressMap.delete(`${sessionId}_download_config`);
        progressMap.delete(sessionId);
      }, 10000); // Keep for 10 seconds to allow final status check
      
      return NextResponse.json({ success: true });
    }

    if (action === 'progress' && sessionId) {
      const progress = progressMap.get(sessionId);
      return NextResponse.json({
        success: true,
        progress: progress || {
          step: 'unknown',
          progress: 0,
          status: 'error',
          message: 'Session not found'
        }
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Invalid action'
    }, { status: 400 });
    
  } catch (error) {
    console.error('MTGJSON init API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

async function downloadAndProcessMTGJSON(sessionId: string) {
  try {
    // Step 1: Prepare client-side download
    progressMap.set(sessionId, {
      step: 'preparing',
      progress: 10,
      status: 'downloading',
      message: 'Preparing client-side download to avoid server memory limits...'
    });
    
    // Instead of downloading on the server (which hits memory limits),
    // we'll provide the client with the download URL and instructions
    progressMap.set(sessionId, {
      step: 'client_download_ready',
      progress: 20,
      status: 'downloading',
      message: 'Ready for client-side download - large file will be downloaded directly in your browser'
    });
    
    // Store download configuration for client
    const downloadConfig = {
      url: 'https://mtgjson.com/api/v5/AllPrices.json',
      expectedSize: 200 * 1024 * 1024, // ~200MB
      timestamp: Date.now()
    };
    
    progressMap.set(`${sessionId}_download_config`, downloadConfig as any);
    
    progressMap.set(sessionId, {
      step: 'awaiting_client',
      progress: 25,
      status: 'downloading',
      message: 'Waiting for client-side download to begin...'
    });
    
  } catch (error) {
    console.error('MTGJSON preparation error:', error);
    progressMap.set(sessionId, {
      step: 'error',
      progress: 0,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const action = searchParams.get('action');
  
  if (action === 'download_config' && sessionId) {
    const config = progressMap.get(`${sessionId}_download_config`);
    if (config) {
      return NextResponse.json({ success: true, config });
    } else {
      return NextResponse.json({ success: false, message: 'Download config not found' });
    }
  }
  
  if (action === 'data' && sessionId) {
    const data = progressMap.get(`${sessionId}_data`);
    if (data) {
      // Clean up the data after retrieval
      progressMap.delete(`${sessionId}_data`);
      return NextResponse.json({
        success: true,
        data
      });
    }
  }
  
  if (action === 'progress' && sessionId) {
    const progress = progressMap.get(sessionId);
    return NextResponse.json({
      success: true,
      progress: progress || {
        step: 'unknown',
        progress: 0,
        status: 'error',
        message: 'Session not found'
      }
    });
  }
  
  return NextResponse.json({
    success: false,
    message: 'Invalid request'
  }, { status: 400 });
}
