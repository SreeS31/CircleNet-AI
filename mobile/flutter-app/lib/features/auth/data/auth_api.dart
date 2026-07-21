import 'package:circlenet_mobile/core/config/app_config.dart';
import 'package:circlenet_mobile/core/network/api_client.dart';
import 'package:circlenet_mobile/features/auth/models/auth_models.dart';

class AuthApi {
  AuthApi({ApiClient? apiClient})
      : _apiClient =
            apiClient ?? ApiClient(baseUrl: AppConfig.apiBaseUrl);

  final ApiClient _apiClient;

  Future<AuthHealth> checkHealth() async {
    final response = await _apiClient.get(AppConfig.authHealthPath);
    if (!response.isSuccess) {
      throw AuthApiException(
        'Auth health check failed with status ${response.statusCode}',
      );
    }

    return AuthHealth(status: response.body.trim());
  }

  Future<AuthTokenBundle> login(LoginRequest request) async {
    final response = await _apiClient.post(AppConfig.authLoginPath, request.toJson());
    if (!response.isSuccess) {
      throw AuthApiException(
        'Login failed with status ${response.statusCode}',
      );
    }

    final data = response.decodeJson();
    if (data is! Map<String, dynamic>) {
      throw const AuthApiException('Invalid login response payload');
    }

    return AuthTokenBundle.fromJson(data);
  }

  Future<AuthTokenBundle> refresh(RefreshRequest request) async {
    final response = await _apiClient.post(AppConfig.authRefreshPath, request.toJson());
    if (!response.isSuccess) {
      throw AuthApiException(
        'Refresh failed with status ${response.statusCode}',
      );
    }

    final data = response.decodeJson();
    if (data is! Map<String, dynamic>) {
      throw const AuthApiException('Invalid refresh response payload');
    }

    return AuthTokenBundle.fromJson(data);
  }

  Future<RegisterUserResult> registerUser(RegisterUserRequest request) async {
    final response = await _apiClient.post(AppConfig.usersPath, request.toJson());

    if (!response.isSuccess) {
      throw AuthApiException(
        'User registration failed with status ${response.statusCode}',
      );
    }

    final data = response.decodeJson();
    if (data is! Map<String, dynamic>) {
      throw const AuthApiException('Invalid registration response payload');
    }

    return RegisterUserResult.fromJson(data);
  }
}

class AuthApiException implements Exception {
  const AuthApiException(this.message);

  final String message;

  @override
  String toString() => 'AuthApiException: $message';
}
