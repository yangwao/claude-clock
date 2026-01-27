import React from 'react';
import { Box, Text } from 'ink';
import { Session, Todo, Config, ViewMode, RateLimitInfo } from '../types/index.js';
import { StatusBar } from './StatusBar.js';
import { SessionList, SessionDetail } from './SessionList.js';
import { TodoExplorer } from './TodoExplorer.js';
import { ScheduleView } from './ScheduleView.js';

interface DashboardProps {
  sessions: Session[];
  todos: Todo[];
  config: Config;
  view: ViewMode;
  selectedSessionIndex: number;
  selectedTodoIndex: number;
  selectedConfigField: number;
  assignMode: boolean;
  assignSessionIndex: number;
  rateLimit: RateLimitInfo | null;
  usageError: string | null;
}

export function Dashboard({
  sessions,
  todos,
  config,
  view,
  selectedSessionIndex,
  selectedTodoIndex,
  selectedConfigField,
  assignMode,
  assignSessionIndex,
  rateLimit,
  usageError,
}: DashboardProps) {
  const unscheduledCount = todos.filter((t) => !t.scheduledSessionId).length;
  const totalTodoCount = todos.length;

  return (
    <Box flexDirection="column" width={56}>
      <StatusBar sessions={sessions} rateLimit={rateLimit} usageError={usageError} />

      <Box flexDirection="column">
        {view === 'dashboard' && (
          <>
            <Box paddingX={1}>
              <Text>sessions</Text>
            </Box>
            <Box flexDirection="column">
              <SessionList
                sessions={sessions.slice(0, 5)}
                selectedIndex={selectedSessionIndex}
              />
            </Box>

            <Box marginTop={1}>
              <SessionDetail session={sessions[selectedSessionIndex] || null} />
            </Box>

            <Box marginTop={1} paddingX={1}>
              <Text dimColor>
                {totalTodoCount} items · {unscheduledCount} unscheduled
              </Text>
            </Box>
          </>
        )}

        {view === 'todos' && (
          <TodoExplorer
            todos={todos}
            sessions={sessions}
            selectedIndex={selectedTodoIndex}
            assignMode={assignMode}
            assignSessionIndex={assignSessionIndex}
          />
        )}

        {view === 'schedule' && (
          <ScheduleView config={config} selectedField={selectedConfigField} />
        )}
      </Box>

      <Box marginTop={1} paddingX={1}>
        <Text color={view === 'dashboard' ? 'cyan' : undefined} dimColor={view !== 'dashboard'} bold={view === 'dashboard'}>
          d
        </Text>
        <Text dimColor> dashboard  </Text>
        <Text color={view === 'todos' ? 'cyan' : undefined} dimColor={view !== 'todos'} bold={view === 'todos'}>
          t
        </Text>
        <Text dimColor> todos  </Text>
        <Text color={view === 'schedule' ? 'cyan' : undefined} dimColor={view !== 'schedule'} bold={view === 'schedule'}>
          s
        </Text>
        <Text dimColor> settings  </Text>
        <Text color="blue">u</Text>
        <Text dimColor> usage  </Text>
        <Text color="red">q</Text>
        <Text dimColor> quit</Text>
      </Box>
    </Box>
  );
}
