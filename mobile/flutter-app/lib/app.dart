import 'package:flutter/material.dart';
import 'package:circlenet_mobile/core/theme/app_theme.dart';
import 'package:circlenet_mobile/features/auth/data/session_store.dart';
import 'package:circlenet_mobile/features/auth/models/auth_models.dart';
import 'package:circlenet_mobile/features/auth/presentation/auth_screen.dart';
import 'package:circlenet_mobile/features/shell/presentation/app_shell.dart';

class CircleNetMobileApp extends StatefulWidget {
  const CircleNetMobileApp({super.key});

  @override
  State<CircleNetMobileApp> createState() => _CircleNetMobileAppState();
}

class _CircleNetMobileAppState extends State<CircleNetMobileApp> {
  final SessionStore _store = SessionStore();
  AuthTokenBundle? _session;
  bool _restoring = true;

  @override
  void initState() {
    super.initState();
    _store.load().then((value) {
      if (mounted)
        setState(() {
          _session = value;
          _restoring = false;
        });
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CircleNet',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: _restoring
          ? const _SplashScreen()
          : _session == null
              ? AuthScreen(
                  onAuthenticated: (session) =>
                      setState(() => _session = session))
              : AppShell(
                  session: _session!,
                  onSignedOut: () => setState(() => _session = null)),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();
  @override
  Widget build(BuildContext context) => const Scaffold(
        body: DecoratedBox(
          decoration: BoxDecoration(
              gradient: LinearGradient(
                  colors: [Color(0xFF6251C8), Color(0xFFD47DA9)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight)),
          child: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            CircleAvatar(
                radius: 34,
                backgroundColor: Colors.white24,
                child: Icon(Icons.hub_rounded, color: Colors.white, size: 38)),
            SizedBox(height: 16),
            Text('CircleNet',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 30,
                    fontWeight: FontWeight.w900)),
            SizedBox(height: 20),
            CircularProgressIndicator(color: Colors.white)
          ])),
        ),
      );
}
