import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Todo } from '../types/index.js';

const TODO_PATTERNS = ['TODO', 'FIXME', 'PLAN', 'SPEC'] as const;
type TodoPattern = (typeof TODO_PATTERNS)[number];

interface ParsedItem {
  title: string;
  pattern: TodoPattern;
  lineNumber: number;
}

function detectPattern(text: string): TodoPattern {
  const upper = text.toUpperCase();
  if (upper.startsWith('FIXME')) return 'FIXME';
  if (upper.startsWith('PLAN')) return 'PLAN';
  if (upper.startsWith('SPEC')) return 'SPEC';
  if (upper.startsWith('TODO')) return 'TODO';
  return 'TODO';
}

function cleanTitle(text: string, pattern: TodoPattern): string {
  // Remove pattern prefix like "TODO: " or "FIXME: "
  const regex = new RegExp(`^${pattern}\\s*:\\s*`, 'i');
  return text.replace(regex, '').trim();
}

function parseMarkdownFile(filePath: string): ParsedItem[] {
  const items: ParsedItem[] = [];

  try {
    if (!fs.existsSync(filePath)) return items;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Match markdown list items:
      // - [ ] Task description
      // - [x] Completed task (skip)
      // - Task description
      // * Task description
      // Also match TODO/FIXME patterns in comments

      // Skip completed items
      if (/^[-*]\s*\[x\]/i.test(trimmed)) return;

      // Checkbox items: - [ ] text
      const checkboxMatch = trimmed.match(/^[-*]\s*\[\s*\]\s+(.+)/);
      if (checkboxMatch) {
        const text = checkboxMatch[1].trim();
        if (text.length > 0) {
          const pattern = detectPattern(text);
          items.push({
            title: cleanTitle(text, pattern),
            pattern,
            lineNumber: index + 1,
          });
          return;
        }
      }

      // Plain list items: - text or * text (but not headers or blank lines)
      const listMatch = trimmed.match(/^[-*]\s+([^[\s].+)/);
      if (listMatch) {
        const text = listMatch[1].trim();
        // Skip if it looks like a section separator or header-like
        if (text.length > 0 && !text.startsWith('#') && !text.startsWith('---')) {
          const pattern = detectPattern(text);
          items.push({
            title: cleanTitle(text, pattern),
            pattern,
            lineNumber: index + 1,
          });
          return;
        }
      }

      // Comment-style TODOs: <!-- TODO: text --> or // TODO: text
      for (const pat of TODO_PATTERNS) {
        if (trimmed.toUpperCase().includes(pat)) {
          const commentPrefixes = '(?://\\s*|#\\s*|/\\*\\s*|\\*\\s*|<!--\\s*|-\\s*)';
          const regex = new RegExp(`${commentPrefixes}${pat}\\s*:\\s+(.+)`, 'i');
          const match = trimmed.match(regex);
          if (match && match[1]) {
            let title = match[1].trim();
            title = title.replace(/\s*\*\/\s*$/, '');
            title = title.replace(/\s*-->?\s*$/, '');
            if (title.length > 0 && title.length < 200) {
              items.push({
                title,
                pattern: pat,
                lineNumber: index + 1,
              });
            }
            return;
          }
        }
      }
    });
  } catch {
    // Skip files that can't be read
  }

  return items;
}

// Files to scan for TODOs
const PROJECT_TODO_FILES = ['TODO.md', 'TODOS.md'];
const CLAUDE_TODO_FILES = ['CLAUDE.md', 'CLAUDE_TODOS.md', '.claude/todos.md', '.claude/tasks.md'];

export function scanForTodos(projectPath: string): Todo[] {
  const results: Todo[] = [];

  // Scan Claude files
  for (const file of CLAUDE_TODO_FILES) {
    const filePath = path.join(projectPath, file);
    const items = parseMarkdownFile(filePath);
    for (const item of items) {
      results.push({
        id: uuidv4(),
        title: item.title,
        source: 'claude',
        filePath: file,
        lineNumber: item.lineNumber,
        pattern: item.pattern,
        scheduledSessionId: undefined,
      });
    }
  }

  // Scan project TODO files
  for (const file of PROJECT_TODO_FILES) {
    const filePath = path.join(projectPath, file);
    const items = parseMarkdownFile(filePath);
    for (const item of items) {
      results.push({
        id: uuidv4(),
        title: item.title,
        source: 'scanned',
        filePath: file,
        lineNumber: item.lineNumber,
        pattern: item.pattern,
        scheduledSessionId: undefined,
      });
    }
  }

  return results;
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

  // For scanned/claude todos, preserve scheduling by matching on file+line
  const mergedScanned = scanned.map((newTodo) => {
    const existingMatch = existing.find(
      (e) =>
        e.source === newTodo.source &&
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
