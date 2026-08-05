import 'package:circlenet_mobile/core/config/app_config.dart';
import 'package:circlenet_mobile/core/models/network_models.dart';
import 'package:circlenet_mobile/core/network/api_client.dart';
import 'package:circlenet_mobile/features/auth/models/auth_models.dart';
import 'dart:typed_data';

class CircleNetApi {
  CircleNetApi(this.session, {ApiClient? client})
      : _client = client ?? ApiClient(baseUrl: AppConfig.apiBaseUrl);
  final AuthTokenBundle session;
  final ApiClient _client;
  String get _token => session.accessToken;
  Future<dynamic> _json(Future<ApiResponse> request) async {
    final response = await request;
    if (!response.isSuccess) {
      String message = 'Request failed (${response.statusCode})';
      try {
        final body = response.decodeJson();
        message = body is Map
            ? (body['message'] ?? body['error'] ?? message).toString()
            : message;
      } catch (_) {}
      throw CircleNetApiException(message);
    }
    return response.decodeJson();
  }

  Future<List<Relationship>> relationships() async => (await _json(
              _client.get('/api/network/relationships', bearerToken: _token))
          as List)
      .map((item) => Relationship.fromJson(item as Map<String, dynamic>))
      .toList();
  Future<List<CircleModel>> circles() async =>
      (await _json(_client.get('/api/network/circles', bearerToken: _token))
              as List)
          .map((item) => CircleModel.fromJson(item as Map<String, dynamic>))
          .toList();
  Future<List<Person>> search(String query) async => (await _json(_client.get(
          '/api/network/search?q=${Uri.encodeQueryComponent(query)}',
          bearerToken: _token)) as List)
      .map((item) => Person.fromJson(item as Map<String, dynamic>))
      .toList();
  Future<Relationship> addRelationship(
          Person person, String type, String visibility) async =>
      Relationship.fromJson(await _json(_client.post(
          '/api/network/relationships',
          {
            'relatedUserId': person.id,
            'type': type,
            'visibilityScope': visibility
          },
          bearerToken: _token)) as Map<String, dynamic>);
  Future<void> removeRelationship(int id) async => _json(
      _client.delete('/api/network/relationships/$id', bearerToken: _token));
  Future<CircleModel> createCircle(String name, String description) async =>
      CircleModel.fromJson(await _json(_client.post(
          '/api/network/circles', {'name': name, 'description': description},
          bearerToken: _token)) as Map<String, dynamic>);
  Future<List<ConversationMessage>> circleMessages(int id) async =>
      (await _json(_client.get('/api/network/circles/$id/posts',
              bearerToken: _token)) as List)
          .map((item) =>
              ConversationMessage.fromJson(item as Map<String, dynamic>))
          .toList();
  Future<void> postCircleMessage(int id, String message) async =>
      _json(_client.postMultipart(
          '/api/network/circles/$id/posts', {'message': message},
          bearerToken: _token));
  Future<List<ConversationMessage>> directMessages(int userId) async =>
      (await _json(_client.get('/api/network/messages/with/$userId',
              bearerToken: _token)) as List)
          .map((item) =>
              ConversationMessage.fromJson(item as Map<String, dynamic>))
          .toList();
  Future<void> sendDirectMessage(int userId, String message) async =>
      _json(_client.postMultipart(
          '/api/network/messages/with/$userId', {'message': message},
          bearerToken: _token));
  Future<Uint8List> attachment(String path) async {
    final response = await _client.get(path, bearerToken: _token);
    if (!response.isSuccess) {
      throw CircleNetApiException(
          'Unable to load attachment (${response.statusCode})');
    }
    return response.bodyBytes;
  }

  Future<UserProfileModel> profile() async => UserProfileModel.fromJson(
      await _json(_client.get('/api/profile/me', bearerToken: _token))
          as Map<String, dynamic>);
  Future<UserProfileModel> saveProfile(Map<String, dynamic> data) async =>
      UserProfileModel.fromJson(
          await _json(_client.put('/api/profile/me', data, bearerToken: _token))
              as Map<String, dynamic>);
}

class CircleNetApiException implements Exception {
  const CircleNetApiException(this.message);
  final String message;
  @override
  String toString() => message;
}
