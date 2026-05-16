export const AppConstants = {
  // Update to your machine's IP when testing from a phone or other device
  // baseUrl: 'http://localhost:8000',
  baseUrl: '',

  // Interview timing (must match backend config)
  prepTimeSeconds: 5,
  recordTimeSeconds: 180,
  /** Max wait for POST /answers (large recordings). */
  uploadTimeoutMs: 180_000,
  questionsPerSession: 3,

  // Report polling
  pollIntervalMs: 2000,
  pollTimeoutMs: 300000,

  // LocalStorage keys
  tokenKey: 'auth_token',
  userEmailKey: 'user_email',

  // User-uploaded topics (must match backend MAX_USER_TOPICS)
  maxUserTopics: 10,
} as const;
