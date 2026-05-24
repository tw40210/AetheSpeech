import { Box, Button, TextField, Typography } from '@mui/material';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onReset?: () => void;
  readOnly?: boolean;
  minRows?: number;
}

export default function PromptEditor({
  label,
  value,
  onChange,
  onReset,
  readOnly = false,
  minRows = 6,
}: Props) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
          {label}
        </Typography>
        {!readOnly && onReset && (
          <Button size="small" variant="text" sx={{ py: 0, fontSize: 11 }} onClick={onReset}>
            Reset to default
          </Button>
        )}
      </Box>
      <TextField
        fullWidth
        multiline
        minRows={minRows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        InputProps={{
          sx: {
            fontFamily: '"Roboto Mono", "Fira Code", monospace',
            fontSize: 12,
            bgcolor: readOnly ? '#F5F5F5' : undefined,
          },
        }}
      />
      {!readOnly && (
        <Typography variant="caption" color="text.disabled" sx={{ float: 'right', mt: 0.5 }}>
          {value.length} chars
        </Typography>
      )}
    </Box>
  );
}
