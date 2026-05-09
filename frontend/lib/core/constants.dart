class AppConstants {
  // Change to your machine's LAN IP when testing on a physical device
  static const String baseUrl = 'http://10.0.2.2:8000'; // Android emulator

  // Interview timing (must match backend config)
  static const int prepTimeSeconds = 5;
  static const int recordTimeSeconds = 20;
  static const int questionsPerSession = 3;

  // Report polling
  static const Duration pollInterval = Duration(seconds: 2);
  static const Duration pollTimeout = Duration(seconds: 120);

  // Storage keys
  static const String tokenKey = 'auth_token';
  static const String userEmailKey = 'user_email';
}
