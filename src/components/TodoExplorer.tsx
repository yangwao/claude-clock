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

      {todo.filePath && (
        <Box paddingLeft={2}>
          <Text dimColor>
            {todo.filePath}
            {todo.lineNumber ? `:${todo.lineNumber}` : ''}
          </Text>
        </Box>
      )}

      {isSelected && todo.context && (
        <Box paddingLeft={2} flexDirection="column">
          {todo.context.split('\n').slice(0, 2).map((line: string, i: number) => (
            <Text key={i} dimColor>
              {line.length > 50 ? line.substring(0, 50) + '...' : line}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

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
        <Box marginTop={1}>
          <Text dimColor>Add tasks to CLAUDE.md or use TODO/FIXME comments.</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press r to rescan.</Text>
        </Box>
      </Box>
    );
  }

  // Calculate which section the selected index is in
  let currentIndex = 0;

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box paddingX={1}>
        <Text>todos</Text>
        <Text dimColor> · {unscheduledTodos.length} unscheduled</Text>
      </Box>

      {/* Claude TODOs section */}
      {claudeTodos.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Box paddingX={1}>
            <Text color="magenta">claude tasks</Text>
            <Text dimColor> · {claudeTodos.length}</Text>
          </Box>
          {claudeTodos.map((todo) => {
            const isSelected = currentIndex === selectedIndex;
            currentIndex++;
            return <TodoItem key={todo.id} todo={todo} isSelected={isSelected} />;
          })}
        </Box>
      )}

      {/* Project TODOs section */}
      {projectTodos.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Box paddingX={1}>
            <Text color="blue">project todos</Text>
            <Text dimColor> · {projectTodos.length}</Text>
          </Box>
          {projectTodos.map((todo) => {
            const isSelected = currentIndex === selectedIndex;
            currentIndex++;
            return <TodoItem key={todo.id} todo={todo} isSelected={isSelected} />;
          })}
        </Box>
      )}

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
