import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../types/index.js';

const CONFIG_FILE = '.claude-clock.json';

export function getConfigPath(projectPath: string): string {
  return path.join(projectPath, CONFIG_FILE);
}

export function getDefaultConfig(): Config {
  return {
    sleepStart: '22:00',
    sleepEnd: '07:00',
    projectPath: process.cwd(),
  };
}

export function loadConfig(projectPath: string = process.cwd()): Config {
  const configPath = getConfigPath(projectPath);

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const loaded = JSON.parse(content);
      return { ...getDefaultConfig(), ...loaded, projectPath };
    }
  } catch (error) {
    // Fall through to default
  }

  return { ...getDefaultConfig(), projectPath };
}

export function saveConfig(config: Config): void {
  const configPath = getConfigPath(config.projectPath);
  const toSave = {
    sleepStart: config.sleepStart,
    sleepEnd: config.sleepEnd,
  };

  fs.writeFileSync(configPath, JSON.stringify(toSave, null, 2), 'utf-8');
}

export function configExists(projectPath: string = process.cwd()): boolean {
  return fs.existsSync(getConfigPath(projectPath));
}
