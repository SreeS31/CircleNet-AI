import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  ApiClient({required this.baseUrl, http.Client? httpClient})
      : _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _httpClient;

  Future<ApiResponse> get(String path, {String? bearerToken}) async {
    final uri = Uri.parse('$baseUrl$path');
    final cacheable = !path.contains('/attachment');
    final cacheKey = _cacheKey(path, bearerToken);
    try {
      final response = await _httpClient
          .get(uri, headers: _headers(bearerToken: bearerToken))
          .timeout(const Duration(seconds: 15));
      final result = ApiResponse.fromHttp(response);
      if (cacheable &&
          result.isSuccess &&
          response.bodyBytes.length < 1048576) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(cacheKey, response.body);
        await prefs.setInt(
            '${cacheKey}_saved', DateTime.now().millisecondsSinceEpoch);
      }
      return result;
    } catch (_) {
      if (!cacheable) rethrow;
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString(cacheKey);
      if (cached == null) rethrow;
      return ApiResponse(
          statusCode: 200,
          body: cached,
          bodyBytes: Uint8List.fromList(utf8.encode(cached)),
          fromCache: true,
          cachedAt: DateTime.fromMillisecondsSinceEpoch(
              prefs.getInt('${cacheKey}_saved') ?? 0));
    }
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

  Future<ApiResponse> postMultipart(
    String path,
    Map<String, String> fields, {
    String? bearerToken,
    Uint8List? fileBytes,
    String? fileName,
    void Function(double progress)? onProgress,
  }) async {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$path'))
      ..fields.addAll(fields);
    if (fileBytes != null && fileName != null) {
      request.files.add(http.MultipartFile.fromBytes(
        'file',
        fileBytes,
        filename: fileName,
      ));
    }
    if (bearerToken != null && bearerToken.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $bearerToken';
    }
    final streamed = onProgress == null
        ? await _httpClient.send(request)
        : await _httpClient.send(_ProgressRequest(request, onProgress));
    return ApiResponse.fromHttp(await http.Response.fromStream(streamed));
  }

  Map<String, String> _headers({String? bearerToken}) {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }
    return headers;
  }

  String _cacheKey(String path, String? token) {
    final identity = token == null || token.isEmpty
        ? 'public'
        : token.substring(token.length > 16 ? token.length - 16 : 0);
    return 'api_cache_${base64Url.encode(utf8.encode('$identity:$path'))}';
  }
}

class _ProgressRequest extends http.BaseRequest {
  _ProgressRequest(this.request, this.onProgress)
      : super(request.method, request.url) {
    headers.addAll(request.headers);
    contentLength = request.contentLength;
  }

  final http.MultipartRequest request;
  final void Function(double progress) onProgress;

  @override
  http.ByteStream finalize() {
    super.finalize();
    final total = contentLength ?? 0;
    var sent = 0;
    final stream = request.finalize().transform(
      StreamTransformer<List<int>, List<int>>.fromHandlers(
        handleData: (chunk, sink) {
          sent += chunk.length;
          onProgress(total == 0 ? 1 : sent / total);
          sink.add(chunk);
        },
      ),
    );
    return http.ByteStream(stream);
  }
}

class ApiResponse {
  ApiResponse({
    required this.statusCode,
    required this.body,
    required this.bodyBytes,
    this.fromCache = false,
    this.cachedAt,
  });

  final int statusCode;
  final String body;
  final Uint8List bodyBytes;
  final bool fromCache;
  final DateTime? cachedAt;

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
