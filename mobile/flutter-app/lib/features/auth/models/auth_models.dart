class AuthHealth {
  AuthHealth({required this.status});

  final String status;
}

class LoginRequest {
  LoginRequest({
    required this.email,
    required this.password,
  });

  final String email;
  final String password;

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
    };
  }
}

class RefreshRequest {
  RefreshRequest({required this.refreshToken});

  final String refreshToken;

  Map<String, dynamic> toJson() {
    return {'refreshToken': refreshToken};
  }
}

class AuthTokenBundle {
  AuthTokenBundle({
    required this.tokenType,
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  final String tokenType;
  final String accessToken;
  final String refreshToken;
  final int expiresIn;

  factory AuthTokenBundle.fromJson(Map<String, dynamic> json) {
    return AuthTokenBundle(
      tokenType: json['tokenType'] as String? ?? 'Bearer',
      accessToken: json['accessToken'] as String? ?? '',
      refreshToken: json['refreshToken'] as String? ?? '',
      expiresIn: (json['expiresIn'] as num?)?.toInt() ?? 0,
    );
  }
}

class DashboardSummary {
  DashboardSummary({
    required this.userCount,
    required this.personCount,
    required this.circleCount,
    required this.relationshipCount,
    required this.permissionCount,
  });

  final int userCount;
  final int personCount;
  final int circleCount;
  final int relationshipCount;
  final int permissionCount;

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    return DashboardSummary(
      userCount: (json['userCount'] as num?)?.toInt() ?? 0,
      personCount: (json['personCount'] as num?)?.toInt() ?? 0,
      circleCount: (json['circleCount'] as num?)?.toInt() ?? 0,
      relationshipCount: (json['relationshipCount'] as num?)?.toInt() ?? 0,
      permissionCount: (json['permissionCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class RegisterUserRequest {
  RegisterUserRequest({
    required this.username,
    required this.email,
    required this.password,
  });

  final String username;
  final String email;
  final String password;

  Map<String, dynamic> toJson() {
    return {
      'username': username,
      'email': email,
      'password': password,
    };
  }
}

class RegisterUserResult {
  RegisterUserResult({
    required this.id,
    required this.username,
    required this.email,
  });

  final int id;
  final String username;
  final String email;

  factory RegisterUserResult.fromJson(Map<String, dynamic> json) {
    return RegisterUserResult(
      id: (json['id'] as num).toInt(),
      username: json['username'] as String? ?? '',
      email: json['email'] as String? ?? '',
    );
  }
}
