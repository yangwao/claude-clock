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

export function TodoExplorer({
  todos,
  sessions,
  selectedIndex,
  assignMode,
  assignSessionIndex,
}: TodoExplorerProps) {
  const unscheduledTodos = todos.filter((t) => !t.scheduledSessionId);

  if (unscheduledTodos.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text>todos</Text>
        <Box marginTop={1}>
          <Text dimColor>No unscheduled items found.</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press r to rescan.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box paddingX={1}>
        <Text>todos</Text>
        <Text dimColor> · {unscheduledTodos.length} unscheduled</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {unscheduledTodos.map((todo, index) => {
          const isSelected = index === selectedIndex;
          const marker = isSelected ? '›' : ' ';

          return (
            <Box
              key={todo.id}
              flexDirection="column"
              paddingX={1}
            >
              <Box>
                <Text dimColor={!isSelected}>
                  {marker} {todo.pattern.toLowerCase()}
                </Text>
                <Text dimColor={!isSelected}> · </Text>
                <Text dimColor={!isSelected}>{todo.title}</Text>
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
        })}
      </Box>

      {assignMode && (
        <Box marginTop={1} flexDirection="column" paddingX={1}>
          <Text dimColor>assign to:</Text>
          {sessions.map((session, index) => {
            const isSessionSelected = index === assignSessionIndex;
            const marker = isSessionSelected ? '›' : ' ';
            const startTime = session.startTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Box key={session.id}>
                <Text dimColor={!isSessionSelected}>
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
