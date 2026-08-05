import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({required this.baseUrl, http.Client? httpClient})
      : _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _httpClient;

  Future<ApiResponse> get(String path, {String? bearerToken}) async {
    final uri = Uri.parse('$baseUrl$path');
    final response =
        await _httpClient.get(uri, headers: _headers(bearerToken: bearerToken));
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

  Future<ApiResponse> put(String path, Map<String, dynamic> body,
      {String? bearerToken}) async {
    final response = await _httpClient.put(Uri.parse('$baseUrl$path'),
        headers: _headers(bearerToken: bearerToken), body: jsonEncode(body));
    return ApiResponse.fromHttp(response);
  }

  Future<ApiResponse> delete(String path, {String? bearerToken}) async {
    final response = await _httpClient.delete(Uri.parse('$baseUrl$path'),
        headers: _headers(bearerToken: bearerToken));
    return ApiResponse.fromHttp(response);
  }

  Future<ApiResponse> postMultipart(String path, Map<String, String> fields,
      {String? bearerToken}) async {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$path'))
      ..fields.addAll(fields);
    if (bearerToken != null && bearerToken.isNotEmpty)
      request.headers['Authorization'] = 'Bearer $bearerToken';
    final streamed = await _httpClient.send(request);
    return ApiResponse.fromHttp(await http.Response.fromStream(streamed));
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
    required this.bodyBytes,
  });

  final int statusCode;
  final String body;
  final Uint8List bodyBytes;

  bool get isSuccess => statusCode >= 200 && statusCode < 300;

  dynamic decodeJson() {
    if (body.isEmpty) {
      return null;
    }
    return jsonDecode(body);
  }

  static ApiResponse fromHttp(http.Response response) {
    return ApiResponse(
      statusCode: response.statusCode,
      body: response.body,
      bodyBytes: response.bodyBytes,
    );
  }
}
