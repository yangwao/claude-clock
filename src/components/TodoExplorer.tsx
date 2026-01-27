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
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="cyan">
          TODO EXPLORER
        </Text>
        <Box marginTop={1}>
          <Text color="gray">No unscheduled TODOs found.</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press [r] to rescan the project.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text bold color="cyan">
          TODO EXPLORER
        </Text>
        <Text color="gray"> ({unscheduledTodos.length} unscheduled)</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {unscheduledTodos.map((todo, index) => {
          const isSelected = index === selectedIndex;
          const patternColors: Record<string, string> = {
            TODO: 'blue',
            FIXME: 'red',
            PLAN: 'magenta',
            SPEC: 'green',
          };

          return (
            <Box
              key={todo.id}
              flexDirection="column"
              paddingX={1}
              marginBottom={index < unscheduledTodos.length - 1 ? 1 : 0}
            >
              <Box>
                <Text color={isSelected ? 'cyan' : 'white'} inverse={isSelected}>
                  {isSelected ? '▶ ' : '  '}
                  <Text color={patternColors[todo.pattern] || 'white'} bold>
                    {todo.pattern}:
                  </Text>{' '}
                  {todo.title}
                </Text>
              </Box>

              {todo.filePath && (
                <Box paddingLeft={2}>
                  <Text color="gray">
                    {todo.filePath}
                    {todo.lineNumber ? `:${todo.lineNumber}` : ''}
                  </Text>
                </Box>
              )}

              {isSelected && todo.context && (
                <Box paddingLeft={2} marginTop={0} flexDirection="column">
                  <Text color="gray" dimColor>
                    Context:
                  </Text>
                  {todo.context.split('\n').map((line, i) => (
                    <Text key={i} color="gray" dimColor>
                      {line.length > 60 ? line.substring(0, 60) + '...' : line}
                    </Text>
                  ))}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {assignMode && (
        <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1}>
          <Text bold color="yellow">
            Assign to Session:
          </Text>
          {sessions.map((session, index) => {
            const isSessionSelected = index === assignSessionIndex;
            const startTime = session.startTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Box key={session.id}>
                <Text color={isSessionSelected ? 'cyan' : 'white'} inverse={isSessionSelected}>
                  {isSessionSelected ? '▶ ' : '  '}
                  Session {index + 1}: {startTime} ({session.todos.length} tasks)
                </Text>
              </Box>
            );
          })}
          <Box marginTop={1}>
            <Text color="gray">Enter to assign, Esc to cancel</Text>
          </Box>
        </Box>
      )}

      {!assignMode && (
        <Box marginTop={1} paddingX={1}>
          <Text color="gray">Enter to assign to session, r to rescan</Text>
        </Box>
      )}
    </Box>
  );
}
