class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8080',
  );

  static const String authHealthPath = '/api/auth/health';
  static const String authLoginPath = '/api/auth/login';
  static const String authRefreshPath = '/api/auth/refresh';
  static const String usersPath = '/api/users';
}
