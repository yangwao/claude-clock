import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { Session, Todo, Config, ViewMode } from './types/index.js';
import { Dashboard } from './components/Dashboard.js';
import { loadConfig, saveConfig } from './services/storage.js';
import {
  generateSessions,
  updateSessionStatuses,
} from './services/scheduler.js';
import { scanForTodos, mergeTodos } from './services/todoScanner.js';
import {
  writeScheduleFile,
  loadCache,
  scheduleFileExists,
} from './services/scheduleFile.js';

function App() {
  const { exit } = useApp();

  // State
  const [config, setConfig] = useState<Config>(() => loadConfig());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [view, setView] = useState<ViewMode>('dashboard');
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const [selectedTodoIndex, setSelectedTodoIndex] = useState(0);
  const [selectedConfigField, setSelectedConfigField] = useState(0);
  const [assignMode, setAssignMode] = useState(false);
  const [assignSessionIndex, setAssignSessionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  // Initialize data
  useEffect(() => {
    initializeData();
  }, []);

  // Update session statuses periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions((prev) => updateSessionStatuses(prev));
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  const initializeData = useCallback(() => {
    setLoading(true);
    setStatusMessage('Loading...');

    try {
      // Load or generate sessions
      const cache = loadCache(config.projectPath);
      let loadedSessions: Session[];
      let loadedTodos: Todo[];

      if (cache) {
        loadedSessions = updateSessionStatuses(cache.sessions);
        loadedTodos = cache.unscheduledTodos;
      } else {
        loadedSessions = generateSessions(config, 6);
        loadedTodos = [];
      }

      // Scan for TODOs
      const scannedTodos = scanForTodos(config.projectPath);
      const mergedTodos = mergeTodos(loadedTodos, scannedTodos);

      // Separate scheduled and unscheduled
      const unscheduledTodos = mergedTodos.filter((t) => !t.scheduledSessionId);

      // Update sessions with their assigned todos
      const sessionsWithTodos = loadedSessions.map((session) => ({
        ...session,
        todos: mergedTodos.filter((t) => t.scheduledSessionId === session.id),
      }));

      setSessions(sessionsWithTodos);
      setTodos(mergedTodos);

      // Save schedule file
      writeScheduleFile(config.projectPath, config, sessionsWithTodos, unscheduledTodos);

      setStatusMessage(`Found ${scannedTodos.length} TODOs`);
    } catch (error) {
      setStatusMessage('Error loading data');
    }

    setLoading(false);
  }, [config]);

  const rescanTodos = useCallback(() => {
    setStatusMessage('Scanning for TODOs...');

    try {
      const scannedTodos = scanForTodos(config.projectPath);
      const mergedTodos = mergeTodos(todos, scannedTodos);
      const unscheduledTodos = mergedTodos.filter((t) => !t.scheduledSessionId);

      // Update sessions with their assigned todos
      const sessionsWithTodos = sessions.map((session) => ({
        ...session,
        todos: mergedTodos.filter((t) => t.scheduledSessionId === session.id),
      }));

      setSessions(sessionsWithTodos);
      setTodos(mergedTodos);

      // Save schedule file
      writeScheduleFile(config.projectPath, config, sessionsWithTodos, unscheduledTodos);

      setStatusMessage(`Found ${scannedTodos.length} TODOs`);
    } catch (error) {
      setStatusMessage('Error scanning TODOs');
    }
  }, [config, todos, sessions]);

  const assignTodoToSession = useCallback(
    (todoIndex: number, sessionIndex: number) => {
      const unscheduledTodos = todos.filter((t) => !t.scheduledSessionId);
      const todoToAssign = unscheduledTodos[todoIndex];
      const targetSession = sessions[sessionIndex];

      if (!todoToAssign || !targetSession) return;

      // Update todo with session assignment
      const updatedTodos = todos.map((t) =>
        t.id === todoToAssign.id
          ? { ...t, scheduledSessionId: targetSession.id }
          : t
      );

      // Update sessions
      const updatedSessions = sessions.map((session) => ({
        ...session,
        todos: updatedTodos.filter((t) => t.scheduledSessionId === session.id),
      }));

      setSessions(updatedSessions);
      setTodos(updatedTodos);

      // Save schedule file
      const unscheduled = updatedTodos.filter((t) => !t.scheduledSessionId);
      writeScheduleFile(config.projectPath, config, updatedSessions, unscheduled);

      setStatusMessage(`Assigned "${todoToAssign.title.substring(0, 30)}..." to Session ${sessionIndex + 1}`);
      setAssignMode(false);

      // Move selection if we've run out of unscheduled todos
      const newUnscheduledCount = unscheduled.length;
      if (selectedTodoIndex >= newUnscheduledCount && newUnscheduledCount > 0) {
        setSelectedTodoIndex(newUnscheduledCount - 1);
      }
    },
    [todos, sessions, config, selectedTodoIndex]
  );

  // Handle keyboard input
  useInput((input, key) => {
    // Global shortcuts
    if (input === 'q' && !assignMode) {
      exit();
      return;
    }

    if (input === 'd' && !assignMode) {
      setView('dashboard');
      return;
    }

    if (input === 't' && !assignMode) {
      setView('todos');
      return;
    }

    if (input === 's' && !assignMode) {
      setView('schedule');
      return;
    }

    if (input === 'r' && !assignMode) {
      rescanTodos();
      return;
    }

    // Escape to cancel assign mode
    if (key.escape && assignMode) {
      setAssignMode(false);
      return;
    }

    // View-specific navigation
    if (view === 'dashboard' && !assignMode) {
      const maxIndex = Math.min(sessions.length - 1, 4);
      if (key.upArrow || input === 'k') {
        setSelectedSessionIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedSessionIndex((prev) => Math.min(maxIndex, prev + 1));
      }
    }

    if (view === 'todos') {
      const unscheduledTodos = todos.filter((t) => !t.scheduledSessionId);
      const maxTodoIndex = unscheduledTodos.length - 1;

      if (assignMode) {
        // Navigate session selection
        if (key.upArrow || input === 'k') {
          setAssignSessionIndex((prev) => Math.max(0, prev - 1));
        } else if (key.downArrow || input === 'j') {
          setAssignSessionIndex((prev) => Math.min(sessions.length - 1, prev + 1));
        } else if (key.return) {
          assignTodoToSession(selectedTodoIndex, assignSessionIndex);
        }
      } else {
        // Navigate todo list
        if (key.upArrow || input === 'k') {
          setSelectedTodoIndex((prev) => Math.max(0, prev - 1));
        } else if (key.downArrow || input === 'j') {
          setSelectedTodoIndex((prev) => Math.min(maxTodoIndex, prev + 1));
        } else if (key.return && unscheduledTodos.length > 0) {
          setAssignMode(true);
          setAssignSessionIndex(0);
        }
      }
    }

    if (view === 'schedule' && !assignMode) {
      if (key.upArrow || input === 'k') {
        setSelectedConfigField((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedConfigField((prev) => Math.min(2, prev + 1));
      }
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan">CLAUDE CLOCK</Text>
        <Text color="gray">Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Dashboard
        sessions={sessions}
        todos={todos}
        config={config}
        view={view}
        selectedSessionIndex={selectedSessionIndex}
        selectedTodoIndex={selectedTodoIndex}
        selectedConfigField={selectedConfigField}
        assignMode={assignMode}
        assignSessionIndex={assignSessionIndex}
      />
      {statusMessage && (
        <Box paddingX={1}>
          <Text color="gray">{statusMessage}</Text>
        </Box>
      )}
    </Box>
  );
}

// Run the app
render(<App />);
