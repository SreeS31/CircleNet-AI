import 'package:circlenet_mobile/features/auth/data/auth_api.dart';
import 'package:circlenet_mobile/features/auth/data/session_store.dart';
import 'package:circlenet_mobile/features/auth/models/auth_models.dart';
import 'package:flutter/material.dart';

enum AuthMode { signIn, signUp }

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final AuthApi _authApi = AuthApi();
  final SessionStore _sessionStore = SessionStore();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  AuthMode _authMode = AuthMode.signIn;
  bool _loading = false;
  String _statusMessage = 'Ready';

  @override
  void initState() {
    super.initState();
    _probeAuthService();
    _restoreSessionIfAvailable();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _probeAuthService() async {
    try {
      final health = await _authApi.checkHealth();
      if (!mounted) {
        return;
      }
      setState(() {
        _statusMessage = 'Auth service: ${health.status}';
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _statusMessage = 'Auth service unavailable';
      });
    }
  }

  Future<void> _restoreSessionIfAvailable() async {
    final existingSession = await _sessionStore.load();
    if (existingSession == null) {
      return;
    }

    try {
      final refreshed = await _authApi.refresh(
        RefreshRequest(refreshToken: existingSession.refreshToken),
      );
      await _sessionStore.save(refreshed);

      if (!mounted) {
        return;
      }

      setState(() {
        _statusMessage = 'Session restored';
      });
    } catch (_) {
      await _sessionStore.clear();
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _loading = true;
      _statusMessage = 'Submitting...';
    });

    try {
      if (_authMode == AuthMode.signUp) {
        final result = await _authApi.registerUser(
          RegisterUserRequest(
            username: _usernameController.text.trim(),
            email: _emailController.text.trim(),
            password: _passwordController.text,
          ),
        );

        if (!mounted) {
          return;
        }

        setState(() {
          _statusMessage = 'Registration created for ${result.username} (#${result.id})';
        });
      } else {
        final tokenBundle = await _authApi.login(
          LoginRequest(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          ),
        );
        await _sessionStore.save(tokenBundle);

        if (!mounted) {
          return;
        }

        setState(() {
          _statusMessage = 'Signed in successfully';
        });
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _statusMessage = 'Request failed: $error';
      });
    } finally {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSignUp = _authMode == AuthMode.signUp;

    return Scaffold(
      appBar: AppBar(title: const Text('CircleNet-AI Auth')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              SegmentedButton<AuthMode>(
                segments: const [
                  ButtonSegment<AuthMode>(
                    value: AuthMode.signIn,
                    label: Text('Sign In'),
                  ),
                  ButtonSegment<AuthMode>(
                    value: AuthMode.signUp,
                    label: Text('Sign Up'),
                  ),
                ],
                selected: {_authMode},
                onSelectionChanged: (selected) {
                  setState(() {
                    _authMode = selected.first;
                  });
                },
              ),
              const SizedBox(height: 16),
              if (isSignUp)
                TextFormField(
                  controller: _usernameController,
                  decoration: const InputDecoration(
                    labelText: 'Username',
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) {
                    if (!isSignUp) {
                      return null;
                    }
                    if (value == null || value.trim().isEmpty) {
                      return 'Username is required';
                    }
                    return null;
                  },
                ),
              if (isSignUp) const SizedBox(height: 12),
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Email is required';
                  }
                  if (!value.contains('@')) {
                    return 'Enter a valid email';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.length < 6) {
                    return 'Password must be at least 6 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loading ? null : _submit,
                child: Text(_loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')),
              ),
              const SizedBox(height: 16),
              Text(
                _statusMessage,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
