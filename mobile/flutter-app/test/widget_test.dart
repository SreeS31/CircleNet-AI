import 'package:circlenet_mobile/app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('renders branded mobile startup', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const CircleNetMobileApp());
    expect(find.text('CircleNet'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
