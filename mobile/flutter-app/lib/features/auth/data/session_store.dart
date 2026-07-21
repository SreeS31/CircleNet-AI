import 'dart:convert';

import 'package:circlenet_mobile/features/auth/models/auth_models.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SessionStore {
  static const String _sessionKey = 'auth_session';

  Future<void> save(AuthTokenBundle tokenBundle) async {
    final prefs = await SharedPreferences.getInstance();
    final payload = jsonEncode({
      'tokenType': tokenBundle.tokenType,
      'accessToken': tokenBundle.accessToken,
      'refreshToken': tokenBundle.refreshToken,
      'expiresIn': tokenBundle.expiresIn,
    });
    await prefs.setString(_sessionKey, payload);
  }

  Future<AuthTokenBundle?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final payload = prefs.getString(_sessionKey);
    if (payload == null || payload.isEmpty) {
      return null;
    }

    final data = jsonDecode(payload);
    if (data is! Map<String, dynamic>) {
      return null;
    }

    return AuthTokenBundle.fromJson(data);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
  }
}
