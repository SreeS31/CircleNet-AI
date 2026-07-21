import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({required this.baseUrl, http.Client? httpClient})
      : _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _httpClient;

  Future<ApiResponse> get(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _httpClient.get(uri, headers: _headers());
    return ApiResponse.fromHttp(response);
  }

  Future<ApiResponse> post(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _httpClient.post(
      uri,
      headers: _headers(),
      body: jsonEncode(body),
    );
    return ApiResponse.fromHttp(response);
  }

  Map<String, String> _headers() {
    return const {'Content-Type': 'application/json'};
  }
}

class ApiResponse {
  ApiResponse({
    required this.statusCode,
    required this.body,
  });

  final int statusCode;
  final String body;

  bool get isSuccess => statusCode >= 200 && statusCode < 300;

  dynamic decodeJson() {
    if (body.isEmpty) {
      return null;
    }
    return jsonDecode(body);
  }

  static ApiResponse fromHttp(http.Response response) {
    return ApiResponse(statusCode: response.statusCode, body: response.body);
  }
}
