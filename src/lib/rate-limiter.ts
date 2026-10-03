interface RateLimitEntry {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit = 60,
  windowSeconds = 60
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const threshold = now - windowMs;

  const entry = memoryStore.get(key) || { timestamps: [] };

  // Filter out timestamps outside the active sliding window
  const activeTimestamps = entry.timestamps.filter((ts) => ts > threshold);

  if (activeTimestamps.length >= limit) {
    const oldest = activeTimestamps[0];
    const resetInSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetInSeconds,
    };
  }

  activeTimestamps.push(now);
  memoryStore.set(key, { timestamps: activeTimestamps });

  return {
    allowed: true,
    limit,
    remaining: limit - activeTimestamps.length,
    resetInSeconds: windowSeconds,
  };
}

export function clearRateLimitStore() {
  memoryStore.clear();
}

export function getSecurityStatus() {
  return {
    rateLimitingEnabled: true,
    contentSecurityPolicy: "Strict (self, no eval in prod)",
    httpStrictTransportSecurity: "Enabled (max-age 63072000)",
    frameProtection: "DENY (Clickjacking shield)",
    mimeSniffingProtection: "nosniff",
    referrerPolicy: "strict-origin-when-cross-origin",
  };
}
