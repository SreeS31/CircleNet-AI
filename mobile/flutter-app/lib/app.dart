import 'package:flutter/material.dart';
import 'package:circlenet_mobile/features/auth/presentation/auth_screen.dart';

class CircleNetMobileApp extends StatelessWidget {
  const CircleNetMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CircleNet-AI Mobile',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF005C99)),
        useMaterial3: true,
      ),
      home: const AuthScreen(),
    );
  }
}
