import React from 'react';
import { Box, Text } from 'ink';
import { Session } from '../types/index.js';
import { getCurrentTimeDisplay, getMinutesUntil, calculateProgress } from '../utils/time.js';
import { getNextSession, getTimeUntilNextSession } from '../services/scheduler.js';

interface StatusBarProps {
  sessions: Session[];
}

function ProgressBar({ progress, width = 24 }: { progress: number; width?: number }) {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;

  return (
    <Text dimColor>
      {'●'.repeat(filled)}
      {'·'.repeat(empty)}
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
        statusText = `Next session in ${minutes} min`;
      } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        statusText = `Next session in ${hours}h ${mins}m`;
      }

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
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box justifyContent="space-between">
        <Text>claude-clock</Text>
        <Text dimColor>{timeDisplay}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>{statusText}</Text>
        <Box marginTop={0}>
          <ProgressBar progress={progress} width={24} />
        </Box>
      </Box>
    </Box>
  );
}
