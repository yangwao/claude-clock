import React from 'react';
import { Box, Text } from 'ink';
import { Session, Todo, Config, ViewMode } from '../types/index.js';
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
}: DashboardProps) {
  const unscheduledCount = todos.filter((t) => !t.scheduledSessionId).length;
  const totalTodoCount = todos.length;

  return (
    <Box flexDirection="column" width={60}>
      <StatusBar sessions={sessions} />

      <Box marginTop={1} flexDirection="column">
        {view === 'dashboard' && (
          <>
            <Box paddingX={1}>
              <Text bold color="cyan">
                UPCOMING SESSIONS
              </Text>
            </Box>
            <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray">
              <SessionList
                sessions={sessions.slice(0, 5)}
                selectedIndex={selectedSessionIndex}
              />
            </Box>

            <Box marginTop={1}>
              <SessionDetail session={sessions[selectedSessionIndex] || null} />
            </Box>

            <Box marginTop={1} paddingX={1}>
              <Text color="gray">
                {totalTodoCount} TODOs found, {unscheduledCount} unscheduled
              </Text>
            </Box>
          </>
        )}

        {view === 'todos' && (
          <Box borderStyle="single" borderColor="gray">
            <TodoExplorer
              todos={todos}
              sessions={sessions}
              selectedIndex={selectedTodoIndex}
              assignMode={assignMode}
              assignSessionIndex={assignSessionIndex}
            />
          </Box>
        )}

        {view === 'schedule' && (
          <Box borderStyle="single" borderColor="gray">
            <ScheduleView config={config} selectedField={selectedConfigField} />
          </Box>
        )}
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color={view === 'dashboard' ? 'cyan' : 'gray'}>
          [D]ashboard
        </Text>
        <Text> </Text>
        <Text color={view === 'todos' ? 'cyan' : 'gray'}>[T]odos</Text>
        <Text> </Text>
        <Text color={view === 'schedule' ? 'cyan' : 'gray'}>[S]chedule</Text>
        <Text> </Text>
        <Text color="gray">[R]efresh</Text>
        <Text> </Text>
        <Text color="gray">[Q]uit</Text>
      </Box>
    </Box>
  );
}
