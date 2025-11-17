import { NextRequest } from 'next/server';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DEBUG_LOG_DIR = join(process.cwd(), 'debug-logs');
const DEBUG_LOG_FILE = join(DEBUG_LOG_DIR, 'gamelist-debug.log');

// Ensure debug log directory exists
if (!existsSync(DEBUG_LOG_DIR)) {
  mkdirSync(DEBUG_LOG_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const { logs } = await request.json() as { logs: string[] };
    
    if (!Array.isArray(logs)) {
      return Response.json({ error: 'Invalid logs format' }, { status: 400 });
    }

    // Write logs to file
    const content = logs.join('\n') + '\n';
    appendFileSync(DEBUG_LOG_FILE, content, 'utf8');

    return Response.json({ success: true, written: logs.length });
  } catch (error) {
    console.error('Failed to write debug logs:', error);
    return Response.json({ error: 'Failed to write logs' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Clear the debug log file
    writeFileSync(DEBUG_LOG_FILE, '', 'utf8');
    return Response.json({ success: true, message: 'Debug log cleared' });
  } catch (error) {
    console.error('Failed to clear debug logs:', error);
    return Response.json({ error: 'Failed to clear logs' }, { status: 500 });
  }
}
