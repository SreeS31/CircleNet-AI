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
  Future<List<Map<String, dynamic>>> notifications() async =>
      (await _json(_client.get('/api/notifications', bearerToken: _token))
              as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
  Future<int> unreadNotificationCount() async =>
      ((await _json(_client.get('/api/notifications/unread-count',
              bearerToken: _token)) as Map)['count'] as num)
          .toInt();
  Future<void> readNotification(int id) async => _json(_client
      .post('/api/notifications/$id/read', const {}, bearerToken: _token));
  Future<void> readAllNotifications() async => _json(_client
      .post('/api/notifications/read-all', const {}, bearerToken: _token));
  Future<Map<String, dynamic>> notificationPreferences() async =>
      Map<String, dynamic>.from(await _json(_client
          .get('/api/notifications/preferences', bearerToken: _token)) as Map);
  Future<Map<String, dynamic>> updateNotificationPreferences(
          Map<String, dynamic> values) async =>
      Map<String, dynamic>.from(await _json(_client.put(
              '/api/notifications/preferences', values, bearerToken: _token))
          as Map);
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
  Future<Relationship> updateRelationship(
          Relationship relationship, String type, String visibility) async =>
      Relationship.fromJson(await _json(_client.put(
          '/api/network/relationships/${relationship.id}',
          {
            'contactName': relationship.person.displayName,
            'contactPhone': relationship.contactPhone,
            'contactEmail': relationship.contactEmail,
            'type': type,
            'visibilityScope': visibility,
            'visibilityCompany': relationship.visibilityCompany
          },
          bearerToken: _token)) as Map<String, dynamic>);
  Future<CircleModel> createCircle(String name, String description) async =>
      CircleModel.fromJson(await _json(_client.post(
          '/api/network/circles', {'name': name, 'description': description},
          bearerToken: _token)) as Map<String, dynamic>);
  Future<CircleModel> updateCircle(int id, String name, String description,
          String postingPermission) async =>
      CircleModel.fromJson(await _json(_client.put(
          '/api/network/circles/$id',
          {
            'name': name,
            'description': description,
            'postingPermission': postingPermission
          },
          bearerToken: _token)) as Map<String, dynamic>);
  Future<CircleModel> addCircleMember(int id, int userId) async =>
      CircleModel.fromJson(await _json(_client.post(
          '/api/network/circles/$id/members', {'userId': userId},
          bearerToken: _token)) as Map<String, dynamic>);
  Future<CircleModel> removeCircleMember(int id, int userId) async =>
      CircleModel.fromJson(await _json(_client.delete(
          '/api/network/circles/$id/members/$userId',
          bearerToken: _token)) as Map<String, dynamic>);
  Future<CircleModel> promoteCircleAdmin(int id, int userId) async =>
      CircleModel.fromJson(await _json(_client.post(
          '/api/network/circles/$id/admins/$userId', const {},
          bearerToken: _token)) as Map<String, dynamic>);
  Future<CircleModel> demoteCircleAdmin(int id, int userId) async =>
      CircleModel.fromJson(await _json(_client.delete(
          '/api/network/circles/$id/admins/$userId',
          bearerToken: _token)) as Map<String, dynamic>);
  Future<List<ConversationMessage>> circleMessages(int id) async =>
      (await _json(_client.get('/api/network/circles/$id/posts',
              bearerToken: _token)) as List)
          .map((item) =>
              ConversationMessage.fromJson(item as Map<String, dynamic>))
          .toList();
  Future<void> postCircleMessage(int id, String message,
          {int? parentMessageId}) async =>
      _json(_client.postMultipart(
          '/api/network/circles/$id/posts',
          {
            'message': message,
            if (parentMessageId != null)
              'parentPostId': parentMessageId.toString()
          },
          bearerToken: _token));
  Future<void> postCircleAttachment(
    int id,
    String message,
    Uint8List bytes,
    String fileName, {
    int? parentMessageId,
    void Function(double progress)? onProgress,
  }) async =>
      _json(_client.postMultipart(
        '/api/network/circles/$id/posts',
        {
          'message': message,
          if (parentMessageId != null)
            'parentPostId': parentMessageId.toString()
        },
        bearerToken: _token,
        fileBytes: bytes,
        fileName: fileName,
        onProgress: onProgress,
      ));
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
  Future<void> sendDirectAttachment(
    int userId,
    String message,
    Uint8List bytes,
    String fileName, {
    void Function(double progress)? onProgress,
  }) async =>
      _json(_client.postMultipart(
        '/api/network/messages/with/$userId',
        {'message': message},
        bearerToken: _token,
        fileBytes: bytes,
        fileName: fileName,
        onProgress: onProgress,
      ));
  Future<DirectCallModel> startCall(
          int recipientId, String callType, String offerSdp) async =>
      DirectCallModel.fromJson(await _json(_client.post(
          '/api/network/calls',
          {
            'recipientId': recipientId,
            'callType': callType,
            'offerSdp': offerSdp
          },
          bearerToken: _token)) as Map<String, dynamic>);
  Future<List<DirectCallModel>> incomingCalls() async => (await _json(
              _client.get('/api/network/calls/incoming', bearerToken: _token))
          as List)
      .map((item) => DirectCallModel.fromJson(item as Map<String, dynamic>))
      .toList();
  Future<DirectCallModel> call(int id) async => DirectCallModel.fromJson(
      await _json(_client.get('/api/network/calls/$id', bearerToken: _token))
          as Map<String, dynamic>);
  Future<DirectCallModel> acceptCall(int id, String answerSdp) async =>
      DirectCallModel.fromJson(await _json(_client.post(
          '/api/network/calls/$id/accept', {'answerSdp': answerSdp},
          bearerToken: _token)) as Map<String, dynamic>);
  Future<void> rejectCall(int id) async => _json(_client
      .post('/api/network/calls/$id/reject', const {}, bearerToken: _token));
  Future<void> endCall(int id) async => _json(_client
      .post('/api/network/calls/$id/end', const {}, bearerToken: _token));
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

  Future<List<Map<String, dynamic>>> analyzeContacts(
          List<Map<String, dynamic>> contacts) async =>
      (await _json(_client.post(
              '/api/contact-organizer/analyze',
              {'consent': true, 'contacts': contacts},
              bearerToken: _token)) as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();

  Future<Map<String, dynamic>> acceptContactSuggestions(
          List<Map<String, dynamic>> suggestions) async =>
      Map<String, dynamic>.from(await _json(_client.post(
              '/api/contact-organizer/accept', {'suggestions': suggestions},
              bearerToken: _token)) as Map);
}

class CircleNetApiException implements Exception {
  const CircleNetApiException(this.message);
  final String message;
  @override
  String toString() => message;
}
