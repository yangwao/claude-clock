#!/usr/bin/env node
import { runDaemon } from './services/daemon.js';

const args = process.argv.slice(2);

function printHelp(): void {
  console.log(`
claude-clock - Schedule Claude Code sessions during off-peak hours

Usage:
  claude-clock              Launch interactive TUI
  claude-clock daemon       Run daemon to auto-start sessions
  claude-clock daemon --dry Run daemon in dry-run mode (no actual execution)
  claude-clock daemon --once Check once and exit
  claude-clock run          Run current session immediately
  claude-clock help         Show this help

Daemon Mode:
  The daemon monitors your schedule and automatically runs Claude Code
  when a session becomes active. Sessions are defined by your sleep hours
  (default 22:00-07:00) split into 5-hour windows.

  Logs are saved to .claude-clock-logs/ in your project directory.

Configuration:
  Edit .claude-clock.json to change sleep hours:
  {
    "sleepStart": "22:00",
    "sleepEnd": "07:00"
  }

Files:
  SCHEDULE.md              Human-readable schedule
  .claude-clock.json       Configuration
  .claude-clock-cache.json Session/task cache
  .claude-clock-daemon.json Daemon state
  .claude-clock-logs/      Session logs
`);
}

async function main(): Promise<void> {
  const command = args[0];

  switch (command) {
    case 'daemon': {
      const dryRun = args.includes('--dry') || args.includes('--dry-run');
      const once = args.includes('--once');

      await runDaemon({
        dryRun,
        once,
        onOutput: (data) => process.stdout.write(data),
      });
      break;
    }

    case 'run': {
      // Run current/next session immediately
      await runDaemon({
        once: true,
        onOutput: (data) => process.stdout.write(data),
      });
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;

    case undefined:
      // No args - launch TUI
      // Dynamically import to avoid loading ink when not needed
      await import('./index.js');
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "claude-clock help" for usage information.');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
