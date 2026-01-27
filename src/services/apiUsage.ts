import https from 'https';
import { URL } from 'url';

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

export function getApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY || null;
}

export async function checkUsage(): Promise<UsageCheckResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      success: false,
      error: 'ANTHROPIC_API_KEY not set',
    };
  }

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
