import {
  setHours,
  setMinutes,
  addHours,
  addDays,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Session, Config } from '../types/index.js';
import { parseTimeString } from '../utils/time.js';

const SESSION_DURATION_HOURS = 5;

export function generateSessions(config: Config, count: number = 6): Session[] {
  const sessions: Session[] = [];
  const now = new Date();

  const { hours: sleepStartHours, minutes: sleepStartMinutes } = parseTimeString(
    config.sleepStart
  );
  const { hours: sleepEndHours, minutes: sleepEndMinutes } = parseTimeString(
    config.sleepEnd
  );

  // Find the next sleep window start
  let currentDate = startOfDay(now);
  let sleepStart = setMinutes(setHours(currentDate, sleepStartHours), sleepStartMinutes);

  // If we're past today's sleep start, use today's
  // If we're before today's sleep start, use today's
  if (isAfter(now, sleepStart)) {
    // We're already past sleep start today, check if we're still in the sleep window
    let sleepEnd = setMinutes(setHours(currentDate, sleepEndHours), sleepEndMinutes);

    // Handle overnight sleep (end time is next day)
    if (sleepEndHours < sleepStartHours) {
      sleepEnd = addDays(sleepEnd, 1);
    }

    if (isAfter(now, sleepEnd)) {
      // Past today's sleep window entirely, start from tomorrow
      sleepStart = addDays(sleepStart, 1);
    }
    // Otherwise we're in the current sleep window, start from sleepStart
  }

  // Generate sessions within sleep windows
  let sessionStart = sleepStart;
  let generatedCount = 0;

  while (generatedCount < count) {
    // Calculate sleep end for this window
    let sleepEnd = setMinutes(
      setHours(startOfDay(sessionStart), sleepEndHours),
      sleepEndMinutes
    );

    // Handle overnight sleep
    if (sleepEndHours < sleepStartHours) {
      sleepEnd = addDays(sleepEnd, 1);
    }

    // Ensure sleepEnd is after sessionStart
    while (isBefore(sleepEnd, sessionStart)) {
      sleepEnd = addDays(sleepEnd, 1);
    }

    // Generate sessions within this sleep window
    while (isBefore(sessionStart, sleepEnd) && generatedCount < count) {
      let sessionEnd = addHours(sessionStart, SESSION_DURATION_HOURS);

      // Clip to sleep end if needed
      if (isAfter(sessionEnd, sleepEnd)) {
        sessionEnd = sleepEnd;
      }

      // Only add session if it has reasonable duration (at least 1 hour)
      const durationMs = sessionEnd.getTime() - sessionStart.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      if (durationHours >= 1) {
        const status = getSessionStatus(sessionStart, sessionEnd, now);

        sessions.push({
          id: uuidv4(),
          startTime: new Date(sessionStart),
          endTime: new Date(sessionEnd),
          status,
          todos: [],
        });

        generatedCount++;
      }

      sessionStart = sessionEnd;
    }

    // Move to next day's sleep window
    const nextDaySleepStart = setMinutes(
      setHours(addDays(startOfDay(sessionStart), 1), sleepStartHours),
      sleepStartMinutes
    );

    // Handle case where sleep start is in the evening
    if (sleepStartHours >= 12) {
      sessionStart = nextDaySleepStart;
    } else {
      // Sleep starts in the morning, need to go to the evening before
      sessionStart = setMinutes(
        setHours(startOfDay(addDays(sessionStart, 1)), sleepStartHours),
        sleepStartMinutes
      );
    }
  }

  return sessions;
}

function getSessionStatus(
  startTime: Date,
  endTime: Date,
  now: Date
): 'upcoming' | 'active' | 'completed' {
  if (isBefore(now, startTime)) {
    return 'upcoming';
  }
  if (isAfter(now, endTime)) {
    return 'completed';
  }
  return 'active';
}

export function updateSessionStatuses(sessions: Session[]): Session[] {
  const now = new Date();
  return sessions.map((session) => ({
    ...session,
    status: getSessionStatus(session.startTime, session.endTime, now),
  }));
}

export function getNextSession(sessions: Session[]): Session | null {
  const now = new Date();

  // First, look for an active session
  const activeSession = sessions.find((s) => s.status === 'active');
  if (activeSession) {
    return activeSession;
  }

  // Then, find the next upcoming session
  const upcomingSessions = sessions
    .filter((s) => s.status === 'upcoming')
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return upcomingSessions[0] || null;
}

export function getTimeUntilNextSession(sessions: Session[]): {
  minutes: number;
  isActive: boolean;
} | null {
  const nextSession = getNextSession(sessions);

  if (!nextSession) {
    return null;
  }

  const now = new Date();

  if (nextSession.status === 'active') {
    return { minutes: 0, isActive: true };
  }

  const diffMs = nextSession.startTime.getTime() - now.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  return { minutes, isActive: false };
}
