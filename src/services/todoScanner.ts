import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Todo } from '../types/index.js';

const TODO_PATTERNS = ['TODO', 'FIXME', 'PLAN', 'SPEC'] as const;
type TodoPattern = (typeof TODO_PATTERNS)[number];

const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  'vendor',
  '__pycache__',
];

const SCAN_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.md',
  '.txt',
  '.yaml',
  '.yml',
  '.json',
];

interface ScannedTodo {
  pattern: TodoPattern;
  title: string;
  filePath: string;
  lineNumber: number;
  context: string;
}

function shouldIgnoreDir(dirName: string): boolean {
  return IGNORE_DIRS.includes(dirName) || dirName.startsWith('.');
}

function shouldScanFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return SCAN_EXTENSIONS.includes(ext);
}

function extractTodoFromLine(
  line: string,
  pattern: TodoPattern
): { title: string } | null {
  // Match patterns that look like actual TODO comments:
  // - Must be preceded by comment markers (// # /* * -) or start of line with whitespace
  // - Pattern must be followed by colon and then a space and actual text
  // - The text after should look like a sentence/description, not code
  const commentPrefixes = '(?:^\\s*|//\\s*|#\\s*|/\\*\\s*|\\*\\s*|<!--\\s*|-\\s*)';
  const regex = new RegExp(`${commentPrefixes}${pattern}\\s*:\\s+([A-Za-z].*)`, 'i');
  const match = line.match(regex);

  if (match && match[1]) {
    // Clean up the title
    let title = match[1].trim();
    // Remove trailing comment closers
    title = title.replace(/\s*\*\/\s*$/, '');
    title = title.replace(/\s*-->?\s*$/, '');
    // Remove leading/trailing quotes if present
    title = title.replace(/^["']|["']$/g, '');

    // Skip if it looks like code (contains common code patterns)
    if (title.includes("'") && title.includes(',')) {
      return null;
    }

    if (title.length > 0 && title.length < 200) {
      return { title };
    }
  }

  return null;
}

function scanFile(filePath: string, projectPath: string): ScannedTodo[] {
  const todos: ScannedTodo[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      for (const pattern of TODO_PATTERNS) {
        if (line.toUpperCase().includes(pattern)) {
          const extracted = extractTodoFromLine(line, pattern);
          if (extracted) {
            // Get context (surrounding lines)
            const contextStart = Math.max(0, index - 1);
            const contextEnd = Math.min(lines.length, index + 2);
            const context = lines.slice(contextStart, contextEnd).join('\n');

            const relativePath = path.relative(projectPath, filePath);

            todos.push({
              pattern,
              title: extracted.title,
              filePath: relativePath,
              lineNumber: index + 1,
              context,
            });
          }
        }
      }
    });
  } catch (error) {
    // Skip files that can't be read
  }

  return todos;
}

function walkDirectory(dir: string, projectPath: string): ScannedTodo[] {
  const todos: ScannedTodo[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!shouldIgnoreDir(entry.name)) {
          todos.push(...walkDirectory(fullPath, projectPath));
        }
      } else if (entry.isFile()) {
        if (shouldScanFile(entry.name)) {
          todos.push(...scanFile(fullPath, projectPath));
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }

  return todos;
}

// Files that contain Claude-specific tasks
const CLAUDE_TODO_FILES = [
  'CLAUDE.md',
  'CLAUDE_TODOS.md',
  '.claude/todos.md',
  '.claude/tasks.md',
];

function scanClaudeTodos(projectPath: string): ScannedTodo[] {
  const todos: ScannedTodo[] = [];

  for (const file of CLAUDE_TODO_FILES) {
    const filePath = path.join(projectPath, file);
    if (fs.existsSync(filePath)) {
      todos.push(...scanFile(filePath, projectPath));
    }
  }

  return todos;
}

export function scanForTodos(projectPath: string): Todo[] {
  const scannedTodos = walkDirectory(projectPath, projectPath);
  const claudeTodos = scanClaudeTodos(projectPath);

  // Mark Claude TODOs
  const claudeFilePaths = new Set(CLAUDE_TODO_FILES);

  // Sort by file depth (root level first), then by pattern priority, then by file path
  const patternPriority: Record<string, number> = {
    'FIXME': 0,
    'TODO': 1,
    'PLAN': 2,
    'SPEC': 3,
  };

  const sortTodos = (todos: ScannedTodo[]) => {
    todos.sort((a, b) => {
      // Count path depth (fewer slashes = closer to root)
      const depthA = (a.filePath.match(/\//g) || []).length;
      const depthB = (b.filePath.match(/\//g) || []).length;

      if (depthA !== depthB) {
        return depthA - depthB; // Root level first
      }

      // Then by pattern priority (FIXME first)
      const priorityA = patternPriority[a.pattern] ?? 99;
      const priorityB = patternPriority[b.pattern] ?? 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Then alphabetically by file path
      return a.filePath.localeCompare(b.filePath);
    });
  };

  sortTodos(claudeTodos);
  sortTodos(scannedTodos);

  // Filter out Claude files from scanned todos (they're in claudeTodos)
  const projectTodos = scannedTodos.filter(
    (t) => !claudeFilePaths.has(t.filePath) && !t.filePath.startsWith('.claude/')
  );

  const mapToTodo = (scanned: ScannedTodo, source: 'scanned' | 'claude'): Todo => ({
    id: uuidv4(),
    title: scanned.title,
    source,
    filePath: scanned.filePath,
    lineNumber: scanned.lineNumber,
    pattern: scanned.pattern,
    context: scanned.context,
    scheduledSessionId: undefined,
  });

  return [
    ...claudeTodos.map((t) => mapToTodo(t, 'claude')),
    ...projectTodos.map((t) => mapToTodo(t, 'scanned')),
  ];
}

export function createManualTodo(
  title: string,
  pattern: TodoPattern = 'TODO'
): Todo {
  return {
    id: uuidv4(),
    title,
    source: 'manual',
    pattern,
    scheduledSessionId: undefined,
  };
}

export function mergeTodos(existing: Todo[], scanned: Todo[]): Todo[] {
  // Keep manual todos and merge with scanned
  const manualTodos = existing.filter((t) => t.source === 'manual');

  // For scanned todos, try to preserve scheduling by matching on file+line
  const mergedScanned = scanned.map((newTodo) => {
    const existingMatch = existing.find(
      (e) =>
        e.source === 'scanned' &&
        e.filePath === newTodo.filePath &&
        e.lineNumber === newTodo.lineNumber
    );

    if (existingMatch) {
      return {
        ...newTodo,
        id: existingMatch.id,
        scheduledSessionId: existingMatch.scheduledSessionId,
      };
    }

    return newTodo;
  });

  return [...manualTodos, ...mergedScanned];
}
