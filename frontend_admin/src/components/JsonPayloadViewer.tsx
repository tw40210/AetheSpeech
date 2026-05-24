import { Box, Typography } from '@mui/material';

interface Props {
  label?: string;
  value: unknown;
  maxHeight?: number;
}

export default function JsonPayloadViewer({ label, value, maxHeight = 300 }: Props) {
  const text = JSON.stringify(value, null, 2);

  return (
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {label}
        </Typography>
      )}
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          maxHeight,
          overflowY: 'auto',
          bgcolor: '#1E272E',
          color: '#B0BEC5',
          borderRadius: 1,
          fontSize: 12,
          fontFamily: '"Roboto Mono", "Fira Code", monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {text}
      </Box>
    </Box>
  );
}
