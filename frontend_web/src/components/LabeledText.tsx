import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { TopicLabel } from '../core/types';
import { getLabelColorAtIndex } from '../core/theme';

interface Segment {
  tag: string;
  text: string;
}

interface LabeledTextProps {
  xmlText: string;
  labels?: TopicLabel[];
}

/**
 * Parses labeled XML text (e.g. <WWAD>…</WWAD><WWHD>…</WWHD>) and renders
 * each segment with a colored left-border, a chip-style label, and body text.
 *
 * Colors are assigned by order of first appearance — no predefined label set required.
 * Mirrors Flutter's LabeledTextWidget.
 */
export default function LabeledText({ xmlText, labels = [] }: LabeledTextProps) {
  const segments = parseSegments(xmlText);

  if (!segments.length) {
    return (
      <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No labeled content available.
      </Typography>
    );
  }

  const colorIndices = tagColorIndices(segments);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {segments.map((seg, i) => {
        const color = seg.tag
          ? getLabelColorAtIndex(colorIndices.get(seg.tag)!)
          : '#616161';
        const labelName = labels.find((l) => l.key === seg.tag)?.name ?? seg.tag;

        return (
          <Box key={i} sx={{ display: 'flex', alignItems: 'stretch', gap: 1.5 }}>
            {/* Colored left border */}
            <Box sx={{ width: 4, borderRadius: 1, flexShrink: 0, bgcolor: color }} />

            <Box sx={{ flex: 1 }}>
              {seg.tag && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    mb: 0.75,
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    border: `0.5px solid ${color}66`,
                    bgcolor: `${color}1E`,
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    sx={{ color, letterSpacing: 0.3 }}
                  >
                    {seg.tag} · {labelName}
                  </Typography>
                </Box>
              )}
              <Typography variant="body2">{seg.text}</Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/** Assign palette colors by order of first appearance in parsed segments. */
function tagColorIndices(segments: Segment[]): Map<string, number> {
  const indices = new Map<string, number>();
  let next = 0;
  for (const seg of segments) {
    if (seg.tag && !indices.has(seg.tag)) {
      indices.set(seg.tag, next++);
    }
  }
  return indices;
}

/** Parse <TAG>content</TAG> segments from XML-ish text. */
function parseSegments(xmlText: string): Segment[] {
  if (!xmlText) return [];

  const pattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
  const segments: Segment[] = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xmlText)) !== null) {
    const tag = match[1];
    const content = match[2].trim();
    if (content) {
      segments.push({ tag, text: content });
    }
  }

  // Fallback: show plain text if no XML tags matched
  if (segments.length === 0 && xmlText.trim()) {
    segments.push({ tag: '', text: xmlText.trim() });
  }

  return segments;
}
