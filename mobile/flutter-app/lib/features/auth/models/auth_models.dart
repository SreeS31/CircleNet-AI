class AuthHealth {
  AuthHealth({required this.status});

  final String status;
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
