import { Session, Config } from '../types/index.js';
import { loadCache, writeScheduleFile } from './scheduleFile.js';
import { generateSessions, updateSessionStatuses } from './scheduler.js';
import { runSession, SessionRunResult } from './sessionRunner.js';
import { loadConfig } from './storage.js';
import * as fs from 'fs';
import * as path from 'path';

const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
const STATE_FILE = '.claude-clock-daemon.json';

interface DaemonState {
  lastRunSessionId: string | null;
  runningSessionId: string | null;
  lastCheck: string;
}

function getStatePath(projectPath: string): string {
  return path.join(projectPath, STATE_FILE);
}

function loadDaemonState(projectPath: string): DaemonState {
  const statePath = getStatePath(projectPath);
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
  } catch {
    // Ignore errors
  }
  return {
    lastRunSessionId: null,
    runningSessionId: null,
    lastCheck: new Date().toISOString(),
  };
}

function saveDaemonState(projectPath: string, state: DaemonState): void {
  const statePath = getStatePath(projectPath);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function getActiveSession(sessions: Session[]): Session | null {
  return sessions.find((s) => s.status === 'active') || null;
}

export interface DaemonOptions {
  projectPath?: string;
  dryRun?: boolean;
  once?: boolean;
  onSessionStart?: (session: Session) => void;
  onSessionEnd?: (session: Session, result: SessionRunResult) => void;
  onOutput?: (data: string) => void;
}

export async function runDaemon(options: DaemonOptions = {}): Promise<void> {
  const projectPath = options.projectPath || process.cwd();
  const config = loadConfig(projectPath);

  log('Claude Clock daemon starting...');
  log(`Project: ${projectPath}`);
  log(`Sleep hours: ${config.sleepStart} - ${config.sleepEnd}`);
  log(`Dry run: ${options.dryRun || false}`);
  log('');

  const check = async () => {
    const state = loadDaemonState(projectPath);

    // Skip if already running a session
    if (state.runningSessionId) {
      log(`Session ${state.runningSessionId.slice(0, 8)} still running, skipping check`);
      return;
    }

    // Load or generate sessions
    const cache = loadCache(projectPath);
    let sessions: Session[];

    if (cache) {
      sessions = updateSessionStatuses(cache.sessions);
    } else {
      sessions = generateSessions(config, 6);
    }

    const activeSession = getActiveSession(sessions);

    if (!activeSession) {
      const nextSession = sessions.find((s) => s.status === 'upcoming');
      if (nextSession) {
        const msUntil = nextSession.startTime.getTime() - Date.now();
        const minsUntil = Math.round(msUntil / 60000);
        log(`No active session. Next session in ${minsUntil} minutes.`);
      } else {
        log('No sessions scheduled.');
      }
      return;
    }

    // Check if we already ran this session
    if (state.lastRunSessionId === activeSession.id) {
      log(`Session ${activeSession.id.slice(0, 8)} already completed.`);
      return;
    }

    // We have an active session that hasn't been run yet
    log(`Active session found: ${activeSession.id.slice(0, 8)}`);
    log(`Tasks: ${activeSession.todos.length}`);

    if (activeSession.todos.length === 0) {
      log('No tasks scheduled for this session, skipping.');
      state.lastRunSessionId = activeSession.id;
      saveDaemonState(projectPath, state);
      return;
    }

    if (options.dryRun) {
      log('[DRY RUN] Would start session with tasks:');
      activeSession.todos.forEach((todo, i) => {
        log(`  ${i + 1}. [${todo.pattern}] ${todo.title}`);
      });
      state.lastRunSessionId = activeSession.id;
      saveDaemonState(projectPath, state);
      return;
    }

    // Start the session
    log('Starting Claude Code session...');
    state.runningSessionId = activeSession.id;
    saveDaemonState(projectPath, state);

    options.onSessionStart?.(activeSession);

    try {
      const result = await runSession(activeSession, projectPath, options.onOutput);

      log(`Session complete. Success: ${result.success}`);
      log(`Log file: ${result.logFile}`);

      if (result.error) {
        log(`Error: ${result.error}`);
      }

      options.onSessionEnd?.(activeSession, result);
    } catch (err) {
      log(`Session failed with error: ${err}`);
    }

    // Mark session as completed
    state.lastRunSessionId = activeSession.id;
    state.runningSessionId = null;
    state.lastCheck = new Date().toISOString();
    saveDaemonState(projectPath, state);
  };

  // Run once immediately
  await check();

  if (options.once) {
    log('Single run complete, exiting.');
    return;
  }

  // Then run on interval
  log(`Daemon running. Checking every ${CHECK_INTERVAL_MS / 1000}s...`);
  log('Press Ctrl+C to stop.');

  const interval = setInterval(check, CHECK_INTERVAL_MS);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('Shutting down daemon...');
    clearInterval(interval);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('Shutting down daemon...');
    clearInterval(interval);
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}
