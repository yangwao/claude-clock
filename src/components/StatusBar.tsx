import React from 'react';
import { Box, Text } from 'ink';
import { Session } from '../types/index.js';
import { getCurrentTimeDisplay, getMinutesUntil, calculateProgress } from '../utils/time.js';
import { getNextSession, getTimeUntilNextSession } from '../services/scheduler.js';

interface StatusBarProps {
  sessions: Session[];
}

function ProgressBar({ progress, width = 20 }: { progress: number; width?: number }) {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;

  return (
    <Text>
      <Text color="green">{'━'.repeat(filled)}</Text>
      <Text color="gray">{'░'.repeat(empty)}</Text>
    </Text>
  );
}

export function StatusBar({ sessions }: StatusBarProps) {
  const timeDisplay = getCurrentTimeDisplay();
  const nextSessionInfo = getTimeUntilNextSession(sessions);
  const nextSession = getNextSession(sessions);

  let statusText = '';
  let progress = 0;

  if (nextSessionInfo) {
    if (nextSessionInfo.isActive) {
      statusText = 'Session Active';
      if (nextSession) {
        progress = calculateProgress(nextSession.startTime, nextSession.endTime);
      }
    } else {
      const minutes = nextSessionInfo.minutes;
      if (minutes < 60) {
        statusText = `Next Session: ${minutes} min`;
      } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        statusText = `Next Session: ${hours}h ${mins}m`;
      }

      // Calculate progress until next session (inverse)
      if (nextSession) {
        const now = new Date();
        const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
        progress = calculateProgress(fiveHoursAgo, nextSession.startTime);
      }
    }
  } else {
    statusText = 'No sessions scheduled';
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">
          CLAUDE CLOCK
        </Text>
        <Text color="gray">{timeDisplay}</Text>
      </Box>
      <Box marginTop={1}>
        <Box flexDirection="column" flexGrow={1}>
          <Text>{statusText}</Text>
          <Box marginTop={0}>
            <ProgressBar progress={progress} width={30} />
            <Text color="gray"> {Math.round(progress)}%</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
