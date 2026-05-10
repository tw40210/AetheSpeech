import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { TopicLabel } from '../core/types';
import { getLabelColor } from '../core/theme';

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
 * Mirrors Flutter's LabeledTextWidget.
 */
export default function LabeledText({ xmlText, labels = [] }: LabeledTextProps) {
  const segments = parseSegments(xmlText, labels);

  if (!segments.length) {
    return (
      <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No labeled content available.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {segments.map((seg, i) => {
        const color = getLabelColor(seg.tag);
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

/** Parse <TAG>content</TAG> segments from XML-ish text. */
function parseSegments(xmlText: string, labels: TopicLabel[]): Segment[] {
  if (!xmlText) return [];

  const pattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
  const segments: Segment[] = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xmlText)) !== null) {
    const tag = match[1];
    const content = match[2].trim();
    // Keep all XML segments, even when tag is not part of local fallback labels.
    // Backend topic labels can vary by dataset (e.g. EXECUTION), and filtering
    // unknown tags here hides real transcript content in report UI.
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
