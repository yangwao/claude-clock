export interface Session {
  id: string;
  startTime: Date;
  endTime: Date;
  status: 'upcoming' | 'active' | 'completed';
  todos: Todo[];
}

export interface Todo {
  id: string;
  title: string;
  source: 'scanned' | 'manual';
  filePath?: string;
  lineNumber?: number;
  pattern: 'TODO' | 'FIXME' | 'PLAN' | 'SPEC';
  context?: string;
  scheduledSessionId?: string;
}

export interface Config {
  sleepStart: string;
  sleepEnd: string;
  projectPath: string;
}

export interface ScheduleData {
  config: Config;
  sessions: Session[];
  unscheduledTodos: Todo[];
}

export type ViewMode = 'dashboard' | 'todos' | 'schedule';
