import 'package:circlenet_mobile/app.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('renders milestone foundation message', (tester) async {
    await tester.pumpWidget(const CircleNetMobileApp());

    expect(find.text('Milestone 6 Foundation'), findsOneWidget);
    expect(
      find.text('Flutter mobile baseline is initialized and ready.'),
      findsOneWidget,
    );
  });
}
