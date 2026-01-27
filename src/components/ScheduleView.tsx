import React from 'react';
import { Box, Text } from 'ink';
import { Config } from '../types/index.js';

interface ScheduleViewProps {
  config: Config;
  onConfigChange?: (config: Config) => void;
  selectedField: number;
}

export function ScheduleView({ config, selectedField }: ScheduleViewProps) {
  const fields = [
    { label: 'Sleep Start', value: config.sleepStart, key: 'sleepStart' },
    { label: 'Sleep End', value: config.sleepEnd, key: 'sleepEnd' },
    { label: 'Project Path', value: config.projectPath, key: 'projectPath' },
  ];

  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text bold color="cyan">
          SCHEDULE SETTINGS
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column" paddingX={1}>
        {fields.map((field, index) => {
          const isSelected = index === selectedField;

          return (
            <Box key={field.key} marginBottom={1}>
              <Text color={isSelected ? 'cyan' : 'white'} inverse={isSelected}>
                {isSelected ? '▶ ' : '  '}
                {field.label}:
              </Text>
              <Text color="yellow"> {field.value}</Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} paddingX={1} flexDirection="column">
        <Text color="gray">Session Configuration:</Text>
        <Text color="gray">  • Duration: 5 hours (rolling window)</Text>
        <Text color="gray">  • Sessions auto-generate within sleep hours</Text>
      </Box>

      <Box marginTop={1} paddingX={1} flexDirection="column">
        <Text color="gray">Files:</Text>
        <Text color="gray">  • SCHEDULE.md - Human-readable schedule</Text>
        <Text color="gray">  • .claude-clock.json - Configuration</Text>
        <Text color="gray">  • .claude-clock-cache.json - Session cache</Text>
      </Box>

      <Box marginTop={1} paddingX={1}>
        <Text color="gray">
          Edit .claude-clock.json directly to change settings
        </Text>
      </Box>
    </Box>
  );
}
