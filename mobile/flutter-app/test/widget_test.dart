import 'package:circlenet_mobile/app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('renders auth flow entry screen', (tester) async {
    await tester.pumpWidget(const CircleNetMobileApp());

    expect(find.text('CircleNet-AI Auth'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Sign In'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
  });
}
