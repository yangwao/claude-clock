import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface RateLimitInfo {
  requestsLimit: number;
  requestsRemaining: number;
  requestsReset: Date;
  tokensLimit: number;
  tokensRemaining: number;
  tokensReset: Date;
}

export interface UsageCheckResult {
  success: boolean;
  rateLimit?: RateLimitInfo;
  error?: string;
}

interface ClaudeCredentials {
  claudeAiOauth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
    subscriptionType: string;
    rateLimitTier: string;
  };
}

interface OAuthUsageResponse {
  five_hour: {
    utilization: number;
    resets_at: string;
  } | null;
  seven_day: {
    utilization: number;
    resets_at: string;
  } | null;
  seven_day_sonnet: {
    utilization: number;
    resets_at: string;
  } | null;
  seven_day_opus: {
    utilization: number;
    resets_at: string;
  } | null;
  extra_usage: {
    is_enabled: boolean;
    monthly_limit: number;
    used_credits: number;
    utilization: number | null;
  } | null;
}

function getCredentialsPath(): string {
  // On Linux: ~/.claude/.credentials.json
  // On macOS: Uses Keychain (service "Claude Code-credentials"), but also has file fallback
  return path.join(os.homedir(), '.claude', '.credentials.json');
}

function loadCliCredentials(): string | null {
  const credPath = getCredentialsPath();

  try {
    if (!fs.existsSync(credPath)) {
      return null;
    }

    const content = fs.readFileSync(credPath, 'utf-8');
    const credentials: ClaudeCredentials = JSON.parse(content);

    if (credentials.claudeAiOauth?.accessToken) {
      // Check if token is expired
      const expiresAt = credentials.claudeAiOauth.expiresAt;
      if (expiresAt && Date.now() > expiresAt) {
        return null; // Token expired
      }
      return credentials.claudeAiOauth.accessToken;
    }

    return null;
  } catch {
    return null;
  }
}

export function getApiKey(): string | null {
  // First try CLI OAuth credentials
  const cliToken = loadCliCredentials();
  if (cliToken) {
    return cliToken;
  }

  // Fall back to environment variable
  return process.env.ANTHROPIC_API_KEY || null;
}

export function hasCliCredentials(): boolean {
  return loadCliCredentials() !== null;
}

async function checkUsageViaOAuth(accessToken: string): Promise<UsageCheckResult> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/api/oauth/usage',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'claude-code/2.1.5',
        'anthropic-beta': 'oauth-2025-04-20',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const data: OAuthUsageResponse = JSON.parse(body);
            const rateLimit = parseOAuthUsageResponse(data);

            if (rateLimit) {
              resolve({ success: true, rateLimit });
            } else {
              resolve({ success: false, error: 'Failed to parse usage data' });
            }
          } catch (e) {
            resolve({ success: false, error: 'Invalid response format' });
          }
        } else if (res.statusCode === 401) {
          resolve({ success: false, error: 'CLI token expired - run claude to re-auth' });
        } else {
          resolve({ success: false, error: `API error: ${res.statusCode}` });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: `Network error: ${err.message}` });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });

    req.end();
  });
}

function parseOAuthUsageResponse(data: OAuthUsageResponse): RateLimitInfo | null {
  // The API returns utilization as a percentage (0-100)
  // We'll map this to our RateLimitInfo structure:
  // - five_hour -> "requests" (short-term usage)
  // - seven_day -> "tokens" (long-term usage)

  const fiveHour = data.five_hour;
  const sevenDay = data.seven_day;

  if (!fiveHour && !sevenDay) {
    return null;
  }

  // Convert utilization percentage to remaining/limit (treat as 100-based)
  const fiveHourUtilization = fiveHour?.utilization ?? 0;
  const sevenDayUtilization = sevenDay?.utilization ?? 0;

  return {
    // Five hour usage (session limit)
    requestsLimit: 100,
    requestsRemaining: Math.round(100 - fiveHourUtilization),
    requestsReset: fiveHour?.resets_at ? new Date(fiveHour.resets_at) : new Date(),
    // Seven day usage (weekly limit)
    tokensLimit: 100,
    tokensRemaining: Math.round(100 - sevenDayUtilization),
    tokensReset: sevenDay?.resets_at ? new Date(sevenDay.resets_at) : new Date(),
  };
}

function parseRateLimitHeaders(headers: Record<string, string | string[] | undefined>): RateLimitInfo | null {
  const get = (name: string): string | undefined => {
    const val = headers[name.toLowerCase()];
    return Array.isArray(val) ? val[0] : val;
  };

  const requestsLimit = get('anthropic-ratelimit-requests-limit');
  const requestsRemaining = get('anthropic-ratelimit-requests-remaining');
  const requestsReset = get('anthropic-ratelimit-requests-reset');
  const tokensLimit = get('anthropic-ratelimit-tokens-limit');
  const tokensRemaining = get('anthropic-ratelimit-tokens-remaining');
  const tokensReset = get('anthropic-ratelimit-tokens-reset');

  if (!requestsLimit || !requestsRemaining || !tokensLimit || !tokensRemaining) {
    return null;
  }

  return {
    requestsLimit: parseInt(requestsLimit, 10),
    requestsRemaining: parseInt(requestsRemaining, 10),
    requestsReset: requestsReset ? new Date(requestsReset) : new Date(),
    tokensLimit: parseInt(tokensLimit, 10),
    tokensRemaining: parseInt(tokensRemaining, 10),
    tokensReset: tokensReset ? new Date(tokensReset) : new Date(),
  };
}

async function checkUsageViaApiKey(apiKey: string): Promise<UsageCheckResult> {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      const headers = res.headers as Record<string, string | string[] | undefined>;
      const rateLimit = parseRateLimitHeaders(headers);

      // Consume response body
      res.on('data', () => {});
      res.on('end', () => {
        if (rateLimit) {
          resolve({ success: true, rateLimit });
        } else if (res.statusCode === 401) {
          resolve({ success: false, error: 'Invalid API key' });
        } else if (res.statusCode === 429) {
          // Rate limited - try to get info from headers anyway
          const limitInfo = parseRateLimitHeaders(headers);
          resolve({
            success: true,
            rateLimit: limitInfo || undefined,
            error: 'Rate limited',
          });
        } else {
          resolve({
            success: false,
            error: `API error: ${res.statusCode}`,
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        error: `Network error: ${err.message}`,
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
      });
    });

    req.write(data);
    req.end();
  });
}

export async function checkUsage(): Promise<UsageCheckResult> {
  // First try CLI OAuth credentials
  const cliToken = loadCliCredentials();
  if (cliToken) {
    return checkUsageViaOAuth(cliToken);
  }

  // Fall back to API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    return checkUsageViaApiKey(apiKey);
  }

  return {
    success: false,
    error: 'no credentials',
  };
}

export function formatTimeUntilReset(resetTime: Date): string {
  const now = new Date();
  const diffMs = resetTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'now';
  }

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffHours > 0) {
    const mins = diffMins % 60;
    return `${diffHours}h ${mins}m`;
  } else if (diffMins > 0) {
    const secs = diffSecs % 60;
    return `${diffMins}m ${secs}s`;
  } else {
    return `${diffSecs}s`;
  }
}

export function formatUsageBar(remaining: number, limit: number, width: number = 20): string {
  const ratio = remaining / limit;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return '●'.repeat(filled) + '·'.repeat(empty);
}
