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

function UsageBar({ remaining, limit, width = 16 }: { remaining: number; limit: number; width?: number }) {
  const ratio = Math.min(1, remaining / limit);
  const filled = Math.round(ratio * width);
  const empty = width - filled;

  return (
    <Text dimColor>
      {'●'.repeat(filled)}
      {'·'.repeat(empty)}
    </Text>
  );
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
        <Text>claude-clock</Text>
        <Text dimColor>{timeDisplay}</Text>
      </Box>

      {rateLimit ? (
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text dimColor>requests </Text>
            <UsageBar remaining={rateLimit.requestsRemaining} limit={rateLimit.requestsLimit} width={12} />
            <Text dimColor> {rateLimit.requestsRemaining}/{rateLimit.requestsLimit}</Text>
          </Box>
          <Box>
            <Text dimColor>tokens   </Text>
            <UsageBar remaining={rateLimit.tokensRemaining} limit={rateLimit.tokensLimit} width={12} />
            <Text dimColor> {Math.round(rateLimit.tokensRemaining / 1000)}k/{Math.round(rateLimit.tokensLimit / 1000)}k</Text>
          </Box>
          <Box marginTop={0}>
            <Text dimColor>resets in {formatTimeUntilReset(rateLimit.tokensReset)}</Text>
            {sessionStatus && <Text dimColor> · {sessionStatus}</Text>}
          </Box>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>
            {usageError === 'no api key'
              ? 'set ANTHROPIC_API_KEY for usage stats'
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
