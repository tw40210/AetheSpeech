export const AppConstants = {
  // Update to your machine's IP when testing from a phone or other device
  baseUrl: 'http://localhost:8000',

  // Interview timing (must match backend config)
  prepTimeSeconds: 5,
  recordTimeSeconds: 60,
  questionsPerSession: 1,

  // Report polling
  pollIntervalMs: 2000,
  pollTimeoutMs: 300000,

  // LocalStorage keys
  tokenKey: 'auth_token',
  userEmailKey: 'user_email',
} as const;
