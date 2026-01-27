import React from 'react';
import { Box, Text } from 'ink';
import { Session, RateLimitInfo } from '../types/index.js';
import { getCurrentTimeDisplay, calculateProgress } from '../utils/time.js';
import { getNextSession, getTimeUntilNextSession } from '../services/scheduler.js';
import { formatTimeUntilReset } from '../services/apiUsage.js';

interface StatusBarProps {
  sessions: Session[];
  rateLimit: RateLimitInfo | null;
  usageError: string | null;
}

function UsageBar({ used, width = 12 }: { used: number; width?: number }) {
  // used is a percentage (0-100)
  const ratio = Math.min(1, used / 100);
  const filled = Math.round(ratio * width);
  const empty = width - filled;

  // Color based on usage level
  let color: string | undefined;
  if (used >= 80) {
    color = 'red';
  } else if (used >= 50) {
    color = 'yellow';
  } else {
    color = 'green';
  }

  return (
    <Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
    </Text>
  );
}

function formatAbsoluteTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const minStr = minutes.toString().padStart(2, '0');
  return `${hour12}:${minStr} ${ampm}`;
}

export function StatusBar({ sessions, rateLimit, usageError }: StatusBarProps) {
  const timeDisplay = getCurrentTimeDisplay();
  const nextSessionInfo = getTimeUntilNextSession(sessions);
  const nextSession = getNextSession(sessions);

  let sessionStatus = '';
  if (nextSessionInfo) {
    if (nextSessionInfo.isActive) {
      sessionStatus = 'session active';
    } else {
      const minutes = nextSessionInfo.minutes;
      if (minutes < 60) {
        sessionStatus = `next in ${minutes}m`;
      } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        sessionStatus = `next in ${hours}h ${mins}m`;
      }
    }
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box justifyContent="space-between">
        <Text color="magenta" bold>claude-clock</Text>
        <Text dimColor>{timeDisplay}</Text>
      </Box>

      {rateLimit ? (
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text dimColor>5h used </Text>
            <UsageBar used={100 - rateLimit.requestsRemaining} />
            <Text dimColor> {100 - rateLimit.requestsRemaining}%</Text>
          </Box>
          <Box>
            <Text dimColor>7d used </Text>
            <UsageBar used={100 - rateLimit.tokensRemaining} />
            <Text dimColor> {100 - rateLimit.tokensRemaining}%</Text>
          </Box>
          <Box marginTop={0}>
            <Text dimColor>resets in </Text>
            <Text color="cyan">{formatTimeUntilReset(rateLimit.requestsReset)}</Text>
            <Text dimColor> ({formatAbsoluteTime(rateLimit.requestsReset)})</Text>
          </Box>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>
            {usageError === 'no credentials'
              ? 'login to claude cli for usage stats'
              : usageError
                ? `usage: ${usageError}`
                : 'loading usage...'}
          </Text>
          {sessionStatus && (
            <Text dimColor>{sessionStatus}</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
