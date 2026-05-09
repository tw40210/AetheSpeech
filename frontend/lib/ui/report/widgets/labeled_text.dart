import 'package:flutter/material.dart';
import '../../../core/theme.dart';

/// Parses labeled XML text (e.g. <WWAD>…</WWAD><WWHD>…</WWHD>) and renders
/// each segment with a colored chip label and styled text.
class LabeledTextWidget extends StatelessWidget {
  final String xmlText;
  final List<Map<String, String>> labels; // [{key, name}]

  const LabeledTextWidget({
    super.key,
    required this.xmlText,
    required this.labels,
  });

  /// Very lightweight XML parser that extracts <TAG>content</TAG> segments.
  List<_Segment> _parse() {
    final segments = <_Segment>[];
    final validKeys = labels.map((l) => l['key']!).toSet();

    final pattern = RegExp(r'<(\w+)>([\s\S]*?)<\/\1>');
    for (final match in pattern.allMatches(xmlText)) {
      final tag = match.group(1)!;
      final content = match.group(2)!.trim();
      if (validKeys.contains(tag) && content.isNotEmpty) {
        segments.add(_Segment(tag: tag, text: content));
      }
    }

    // Fallback: if no segments parsed, show plain text
    if (segments.isEmpty && xmlText.isNotEmpty) {
      segments.add(_Segment(tag: '', text: xmlText));
    }

    return segments;
  }

  String _labelName(String key) {
    for (final l in labels) {
      if (l['key'] == key) return l['name']!;
    }
    return key;
  }

  @override
  Widget build(BuildContext context) {
    final segments = _parse();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: segments.map((seg) {
        final color = AppTheme.labelColor(seg.tag);
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: IntrinsicHeight(
            child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Colored left border
              Container(
                width: 4,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (seg.tag.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                              color: color.withValues(alpha: 0.4), width: 0.5),
                        ),
                        child: Text(
                          '${seg.tag} · ${_labelName(seg.tag)}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: color,
                          ),
                        ),
                      ),
                    if (seg.tag.isNotEmpty) const SizedBox(height: 6),
                    Text(seg.text),
                  ],
                ),
              ),
            ],
          ),
          ),
        );
      }).toList(),
    );
  }
}

class _Segment {
  final String tag;
  final String text;
  const _Segment({required this.tag, required this.text});
}
