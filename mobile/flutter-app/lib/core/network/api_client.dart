import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({required this.baseUrl, http.Client? httpClient})
      : _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _httpClient;

  Future<ApiResponse> get(String path, {String? bearerToken}) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _httpClient.get(uri, headers: _headers(bearerToken: bearerToken));
    return ApiResponse.fromHttp(response);
  }

  Future<ApiResponse> post(
    String path,
    Map<String, dynamic> body, {
    String? bearerToken,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _httpClient.post(
      uri,
      headers: _headers(bearerToken: bearerToken),
      body: jsonEncode(body),
    );
    return ApiResponse.fromHttp(response);
  }

  Map<String, String> _headers({String? bearerToken}) {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }
    return headers;
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
