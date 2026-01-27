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
    { label: 'sleep start', value: config.sleepStart, key: 'sleepStart' },
    { label: 'sleep end', value: config.sleepEnd, key: 'sleepEnd' },
    { label: 'project', value: config.projectPath, key: 'projectPath' },
  ];

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box paddingX={1}>
        <Text>settings</Text>
      </Box>

      <Box marginTop={1} flexDirection="column" paddingX={1}>
        {fields.map((field, index) => {
          const isSelected = index === selectedField;
          const marker = isSelected ? '›' : ' ';

          return (
            <Box key={field.key}>
              <Text dimColor={!isSelected}>
                {marker} {field.label}
              </Text>
              <Text dimColor> · </Text>
              <Text dimColor={!isSelected}>{field.value}</Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} paddingX={1} flexDirection="column">
        <Text dimColor>session duration · 5 hours</Text>
        <Text dimColor>sessions auto-generate within sleep hours</Text>
      </Box>

      <Box marginTop={1} paddingX={1} flexDirection="column">
        <Text dimColor>files:</Text>
        <Text dimColor>  SCHEDULE.md</Text>
        <Text dimColor>  .claude-clock.json</Text>
      </Box>

      <Box marginTop={1} paddingX={1}>
        <Text dimColor>edit .claude-clock.json to change settings</Text>
      </Box>
    </Box>
  );
}
