import * as fs from 'fs';
import * as path from 'path';
import { ScheduleData, Session, Todo, Config } from '../types/index.js';
import { formatSessionTime, formatTime, serializeDate, deserializeDate } from '../utils/time.js';
import { v4 as uuidv4 } from 'uuid';

const SCHEDULE_FILE = 'SCHEDULE.md';
const CACHE_FILE = '.claude-clock-cache.json';

export function getSchedulePath(projectPath: string): string {
  return path.join(projectPath, SCHEDULE_FILE);
}

export function getCachePath(projectPath: string): string {
  return path.join(projectPath, CACHE_FILE);
}

export function scheduleFileExists(projectPath: string): boolean {
  return fs.existsSync(getSchedulePath(projectPath));
}

interface CacheData {
  sessions: Array<{
    id: string;
    startTime: string;
    endTime: string;
    status: 'upcoming' | 'active' | 'completed';
    todos: Todo[];
  }>;
  unscheduledTodos: Todo[];
}

export function loadCache(projectPath: string): { sessions: Session[]; unscheduledTodos: Todo[] } | null {
  const cachePath = getCachePath(projectPath);

  try {
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, 'utf-8');
      const data: CacheData = JSON.parse(content);

      return {
        sessions: data.sessions.map((s) => ({
          ...s,
          startTime: deserializeDate(s.startTime),
          endTime: deserializeDate(s.endTime),
        })),
        unscheduledTodos: data.unscheduledTodos,
      };
    }
  } catch (error) {
    // Ignore cache errors
  }

  return null;
}

export function saveCache(
  projectPath: string,
  sessions: Session[],
  unscheduledTodos: Todo[]
): void {
  const cachePath = getCachePath(projectPath);

  const data: CacheData = {
    sessions: sessions.map((s) => ({
      ...s,
      startTime: serializeDate(s.startTime),
      endTime: serializeDate(s.endTime),
    })),
    unscheduledTodos,
  };

  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function writeScheduleFile(
  projectPath: string,
  config: Config,
  sessions: Session[],
  unscheduledTodos: Todo[]
): void {
  const schedulePath = getSchedulePath(projectPath);

  let content = `# Claude Clock Schedule

## Config
- Sleep hours: ${config.sleepStart} - ${config.sleepEnd}
- Session duration: 5 hours (rolling window)

## Upcoming Sessions

`;

  sessions.forEach((session, index) => {
    const sessionTime = formatSessionTime(session.startTime, session.endTime);
    content += `### Session ${index + 1}: ${sessionTime}\n`;

    if (session.todos.length === 0) {
      content += `- [ ] (No tasks scheduled)\n`;
    } else {
      session.todos.forEach((todo) => {
        const location = todo.filePath
          ? ` (${todo.filePath}${todo.lineNumber ? `:${todo.lineNumber}` : ''})`
          : '';
        content += `- [ ] ${todo.pattern}: ${todo.title}${location}\n`;
      });
    }
    content += '\n';
  });

  content += `## Unscheduled TODOs\n`;

  if (unscheduledTodos.length === 0) {
    content += `- (No unscheduled tasks)\n`;
  } else {
    unscheduledTodos.forEach((todo) => {
      const location = todo.filePath
        ? ` (${todo.filePath}${todo.lineNumber ? `:${todo.lineNumber}` : ''})`
        : '';
      content += `- [ ] ${todo.pattern}: ${todo.title}${location}\n`;
    });
  }

  fs.writeFileSync(schedulePath, content, 'utf-8');
  saveCache(projectPath, sessions, unscheduledTodos);
}

export function parseScheduleFile(projectPath: string, config: Config): ScheduleData | null {
  const schedulePath = getSchedulePath(projectPath);

  if (!fs.existsSync(schedulePath)) {
    return null;
  }

  // For simplicity, we'll primarily use the cache for data
  // The markdown file is mainly for human readability
  const cache = loadCache(projectPath);

  if (cache) {
    return {
      config,
      sessions: cache.sessions,
      unscheduledTodos: cache.unscheduledTodos,
    };
  }

  return null;
}

export function createExampleScheduleFile(projectPath: string): void {
  const examplePath = path.join(projectPath, 'SCHEDULE.md.example');

  const content = `# Claude Clock Schedule

## Config
- Sleep hours: 22:00 - 07:00
- Session duration: 5 hours (rolling window)

## Upcoming Sessions

### Session 1: Tonight 10:00 PM - 3:00 AM
- [ ] TODO: Implement user authentication (src/auth.ts:45)
- [ ] FIXME: Memory leak in event handler (src/events.ts:120)

### Session 2: Tonight 3:00 AM - 8:00 AM
- [ ] PLAN: Refactor database layer
- [ ] SPEC: Write API documentation

## Unscheduled TODOs
- [ ] TODO: Add unit tests for scheduler
- [ ] FIXME: Handle edge case in parser
`;

  fs.writeFileSync(examplePath, content, 'utf-8');
}
