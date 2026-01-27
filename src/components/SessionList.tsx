import React from 'react';
import { Box, Text } from 'ink';
import { Session } from '../types/index.js';
import { formatSessionTime } from '../utils/time.js';

interface SessionListProps {
  sessions: Session[];
  selectedIndex: number;
  onSelect?: (session: Session) => void;
}

export function SessionList({ sessions, selectedIndex }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No sessions scheduled</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {sessions.map((session, index) => {
        const isSelected = index === selectedIndex;
        const timeStr = formatSessionTime(session.startTime, session.endTime);
        const todoCount = session.todos.length;
        const todoText = todoCount === 0 ? '' : ` · ${todoCount} task${todoCount > 1 ? 's' : ''}`;

        const marker = isSelected ? '›' : ' ';
        const isCompleted = session.status === 'completed';
        const isActive = session.status === 'active';

        return (
          <Box key={session.id} paddingX={1}>
            <Text dimColor={!isSelected && !isActive}>
              {marker} {timeStr}
            </Text>
            {todoCount > 0 && (
              <Text dimColor>{todoText}</Text>
            )}
            {isActive && (
              <Text dimColor> · active</Text>
            )}
            {isCompleted && (
              <Text dimColor> · done</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

interface SessionDetailProps {
  session: Session | null;
}

export function SessionDetail({ session }: SessionDetailProps) {
  if (!session) {
    return (
      <Box paddingX={1}>
        <Text dimColor>Select a session to view details</Text>
      </Box>
    );
  }

  const timeStr = formatSessionTime(session.startTime, session.endTime);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text>{timeStr}</Text>
      <Text dimColor>{session.status}</Text>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>tasks:</Text>
        {session.todos.length === 0 ? (
          <Text dimColor>  none assigned</Text>
        ) : (
          session.todos.map((todo: { id: string; pattern: string; title: string; filePath?: string; lineNumber?: number }) => (
            <Box key={todo.id}>
              <Text dimColor>  </Text>
              <Text>{todo.pattern.toLowerCase()}</Text>
              <Text dimColor> · </Text>
              <Text>{todo.title}</Text>
              {todo.filePath && (
                <Text dimColor>
                  {' '}· {todo.filePath}
                  {todo.lineNumber ? `:${todo.lineNumber}` : ''}
                </Text>
              )}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
