import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Session, Todo } from '../types/index.js';

const LOG_DIR = '.claude-clock-logs';

function ensureLogDir(projectPath: string): string {
  const logDir = path.join(projectPath, LOG_DIR);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

function getLogFileName(sessionId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `session-${timestamp}-${sessionId.slice(0, 8)}.log`;
}

function formatTasksAsPrompt(todos: Todo[]): string {
  if (todos.length === 0) {
    return 'No specific tasks scheduled. Review the codebase and work on any improvements you find.';
  }

  const taskList = todos
    .map((todo, i) => {
      const location = todo.filePath
        ? ` (${todo.filePath}${todo.lineNumber ? `:${todo.lineNumber}` : ''})`
        : '';
      return `${i + 1}. [${todo.pattern}] ${todo.title}${location}`;
    })
    .join('\n');

  return `Please work on the following tasks:\n\n${taskList}\n\nWork through each task methodically. For each task, understand the context, implement the solution, and verify it works.`;
}

export interface SessionRunResult {
  success: boolean;
  logFile: string;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export function runSession(
  session: Session,
  projectPath: string,
  onOutput?: (data: string) => void
): Promise<SessionRunResult> {
  return new Promise((resolve) => {
    const logDir = ensureLogDir(projectPath);
    const logFileName = getLogFileName(session.id);
    const logFile = path.join(logDir, logFileName);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    const startTime = new Date();
    const prompt = formatTasksAsPrompt(session.todos);

    // Log session start
    const header = `
================================================================================
CLAUDE CLOCK SESSION
================================================================================
Session ID: ${session.id}
Start Time: ${startTime.toISOString()}
Tasks: ${session.todos.length}
Project: ${projectPath}
================================================================================

PROMPT:
${prompt}

================================================================================
OUTPUT:
`;
    logStream.write(header);
    onOutput?.(header);

    // Spawn Claude Code CLI
    const claude = spawn('claude', ['--print', prompt], {
      cwd: projectPath,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    claude.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      logStream.write(text);
      onOutput?.(text);
    });

    claude.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      logStream.write(`[STDERR] ${text}`);
      onOutput?.(`[STDERR] ${text}`);
    });

    claude.on('error', (err) => {
      const endTime = new Date();
      const errorMsg = `\n[ERROR] Failed to start Claude: ${err.message}\n`;
      logStream.write(errorMsg);
      logStream.end();
      onOutput?.(errorMsg);

      resolve({
        success: false,
        logFile,
        startTime,
        endTime,
        error: err.message,
      });
    });

    claude.on('close', (code) => {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      const footer = `
================================================================================
SESSION COMPLETE
Exit Code: ${code}
Duration: ${duration}s
End Time: ${endTime.toISOString()}
================================================================================
`;
      logStream.write(footer);
      logStream.end();
      onOutput?.(footer);

      resolve({
        success: code === 0,
        logFile,
        startTime,
        endTime,
        error: code !== 0 ? `Process exited with code ${code}` : undefined,
      });
    });
  });
}

export function checkClaudeInstalled(): boolean {
  try {
    const result = spawn('claude', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
