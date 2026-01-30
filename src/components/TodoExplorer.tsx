import React from 'react';
import { Box, Text } from 'ink';
import { Todo, Session } from '../types/index.js';

interface TodoExplorerProps {
  todos: Todo[];
  sessions: Session[];
  selectedIndex: number;
  onAssign?: (todo: Todo, sessionId: string) => void;
  assignMode: boolean;
  assignSessionIndex: number;
}

function TodoItem({ todo, isSelected }: { todo: Todo; isSelected: boolean }) {
  const marker = isSelected ? '›' : ' ';
  const patternColor = todo.pattern === 'FIXME' ? 'red' : todo.pattern === 'TODO' ? 'yellow' : todo.pattern === 'PLAN' ? 'blue' : 'magenta';

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color={isSelected ? 'cyan' : undefined} dimColor={!isSelected}>
          {marker}{' '}
        </Text>
        <Text color={patternColor} dimColor={!isSelected}>
          {todo.pattern.toLowerCase()}
        </Text>
        <Text dimColor> · </Text>
        <Text color={isSelected ? 'white' : undefined} dimColor={!isSelected}>{todo.title}</Text>
      </Box>

      {todo.filePath && isSelected && (
        <Box paddingLeft={2}>
          <Text dimColor>
            {todo.filePath}
            {todo.lineNumber ? `:${todo.lineNumber}` : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
}

type ListEntry =
  | { type: 'header'; label: string; color: string; count: number }
  | { type: 'todo'; todo: Todo; flatIndex: number };

export function TodoExplorer({
  todos,
  sessions,
  selectedIndex,
  assignMode,
  assignSessionIndex,
}: TodoExplorerProps) {
  const unscheduledTodos = todos.filter((t) => !t.scheduledSessionId);
  const claudeTodos = unscheduledTodos.filter((t) => t.source === 'claude');
  const projectTodos = unscheduledTodos.filter((t) => t.source !== 'claude');

  if (unscheduledTodos.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text>todos</Text>
        <Box marginTop={1}>
          <Text dimColor>No unscheduled items found.</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Add tasks to TODO.md or CLAUDE.md in project root.</Text>
          <Text dimColor>Press r to rescan.</Text>
        </Box>
      </Box>
    );
  }

  // Build flat list with headers for rendering
  const entries: ListEntry[] = [];
  let flatIndex = 0;

  if (claudeTodos.length > 0) {
    entries.push({ type: 'header', label: 'claude tasks', color: 'magenta', count: claudeTodos.length });
    for (const todo of claudeTodos) {
      entries.push({ type: 'todo', todo, flatIndex });
      flatIndex++;
    }
  }

  if (projectTodos.length > 0) {
    entries.push({ type: 'header', label: 'project todos', color: 'blue', count: projectTodos.length });
    for (const todo of projectTodos) {
      entries.push({ type: 'todo', todo, flatIndex });
      flatIndex++;
    }
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box paddingX={1}>
        <Text>todos</Text>
        <Text dimColor> · {unscheduledTodos.length} unscheduled</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {entries.map((entry, i) => {
          if (entry.type === 'header') {
            return (
              <Box key={`h-${i}`} paddingX={1} marginTop={i > 0 ? 1 : 0}>
                <Text color={entry.color}>{entry.label}</Text>
                <Text dimColor> · {entry.count}</Text>
              </Box>
            );
          }

          return (
            <TodoItem
              key={entry.todo.id}
              todo={entry.todo}
              isSelected={entry.flatIndex === selectedIndex}
            />
          );
        })}
      </Box>

      {assignMode && (
        <Box marginTop={1} flexDirection="column" paddingX={1}>
          <Text color="green">assign to:</Text>
          {sessions.map((session, index) => {
            const isSessionSelected = index === assignSessionIndex;
            const marker = isSessionSelected ? '›' : ' ';
            const startTime = session.startTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Box key={session.id}>
                <Text color={isSessionSelected ? 'cyan' : undefined} dimColor={!isSessionSelected}>
                  {marker} session {index + 1} · {startTime}
                </Text>
              </Box>
            );
          })}
          <Box marginTop={1}>
            <Text dimColor>enter to confirm · esc to cancel</Text>
          </Box>
        </Box>
      )}

      {!assignMode && (
        <Box marginTop={1} paddingX={1}>
          <Text dimColor>enter to assign · r to rescan</Text>
        </Box>
      )}
    </Box>
  );
}
