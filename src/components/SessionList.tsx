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
        <Text color="gray">No sessions scheduled</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {sessions.map((session, index) => {
        const isSelected = index === selectedIndex;
        const timeStr = formatSessionTime(session.startTime, session.endTime);
        const todoCount = session.todos.length;
        const todoText =
          todoCount === 0
            ? '[unassigned]'
            : `[${todoCount} todo${todoCount > 1 ? 's' : ''}]`;

        let statusColor: string = 'white';
        let statusIcon = '  ';

        if (session.status === 'active') {
          statusColor = 'green';
          statusIcon = '▶ ';
        } else if (session.status === 'completed') {
          statusColor = 'gray';
          statusIcon = '✓ ';
        } else if (isSelected) {
          statusIcon = '▶ ';
        }

        return (
          <Box key={session.id} paddingX={1}>
            <Text
              color={isSelected ? 'cyan' : statusColor}
              bold={isSelected}
              inverse={isSelected}
            >
              {statusIcon}
              {timeStr}
            </Text>
            <Text color={todoCount === 0 ? 'gray' : 'yellow'}> {todoText}</Text>
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
        <Text color="gray">Select a session to view details</Text>
      </Box>
    );
  }

  const timeStr = formatSessionTime(session.startTime, session.endTime);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        {timeStr}
      </Text>
      <Text color="gray">Status: {session.status}</Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Scheduled Tasks:</Text>
        {session.todos.length === 0 ? (
          <Text color="gray">  No tasks assigned</Text>
        ) : (
          session.todos.map((todo, index) => (
            <Box key={todo.id}>
              <Text color="yellow">  • </Text>
              <Text color="magenta">{todo.pattern}: </Text>
              <Text>{todo.title}</Text>
              {todo.filePath && (
                <Text color="gray">
                  {' '}
                  ({todo.filePath}
                  {todo.lineNumber ? `:${todo.lineNumber}` : ''})
                </Text>
              )}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
