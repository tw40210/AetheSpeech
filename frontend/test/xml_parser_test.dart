import 'package:flutter_test/flutter_test.dart';
import 'package:aethespeech/ui/report/widgets/labeled_text.dart';
import 'package:flutter/material.dart';

void main() {
  group('LabeledTextWidget XML parsing', () {
    const labels = [
      {'key': 'WWAD', 'name': 'What we are doing'},
      {'key': 'WWHD', 'name': 'What we have done'},
      {'key': 'NS', 'name': 'Next step'},
    ];

    testWidgets('renders labeled segments from valid XML', (tester) async {
      const xml =
          '<WWAD>We are building a product.</WWAD><WWHD>We shipped v1.</WWHD>';
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LabeledTextWidget(xmlText: xml, labels: labels),
          ),
        ),
      );
      expect(find.text('We are building a product.'), findsOneWidget);
      expect(find.text('We shipped v1.'), findsOneWidget);
    });

    testWidgets('shows plain text for unparseable XML', (tester) async {
      const xml = 'No XML tags here, plain text only.';
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LabeledTextWidget(xmlText: xml, labels: labels),
          ),
        ),
      );
      expect(find.text('No XML tags here, plain text only.'), findsOneWidget);
    });

    testWidgets('ignores unknown tags', (tester) async {
      const xml = '<UNKNOWN>Some text.</UNKNOWN><WWAD>Known text.</WWAD>';
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LabeledTextWidget(xmlText: xml, labels: labels),
          ),
        ),
      );
      // Only known tags render
      expect(find.text('Known text.'), findsOneWidget);
    });

    testWidgets('shows label chip text', (tester) async {
      const xml = '<WWAD>Some content.</WWAD>';
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: LabeledTextWidget(xmlText: xml, labels: labels),
            ),
          ),
        ),
      );
      // The chip label shows 'WWAD · What we are doing'
      expect(find.textContaining('WWAD'), findsWidgets);
    });

    testWidgets('handles empty XML gracefully', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LabeledTextWidget(xmlText: '', labels: labels),
          ),
        ),
      );
      // No crash, empty widget tree
      expect(tester.takeException(), isNull);
    });
  });
}
