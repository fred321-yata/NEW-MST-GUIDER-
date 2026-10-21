import 'package:flutter/material.dart' show Size;
import 'package:flutter_test/flutter_test.dart';
import 'package:mst_guider_flutter/main.dart';

void main() {
  testWidgets('shows the campus guide after loading offline room data', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MstGuiderApp());
    await tester.pump(const Duration(seconds: 1));
    await tester.pump();

    expect(find.text('Explore the campus'), findsOneWidget);
    expect(find.text('Top view'), findsOneWidget);
    expect(find.text('Directions'), findsOneWidget);
  });
}
