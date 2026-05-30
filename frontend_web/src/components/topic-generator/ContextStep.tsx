import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

const MIN_LENGTH = 20;
const MAX_LENGTH = 2000;

interface Props {
  loading: boolean;
  onSubmit: (context: string) => void;
}

export default function ContextStep({ loading, onSubmit }: Props) {
  const [text, setText] = useState('');

  const tooShort = text.trim().length < MIN_LENGTH;

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Describe your practice scenario
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Explain the situation you want to practise — the context, audience, and goal. The AI will
        suggest a communication framework and generate 10 tailored questions.
      </Typography>

      <TextField
        multiline
        minRows={5}
        fullWidth
        label="Practice context"
        placeholder="e.g. I need to present a quarterly business update to senior leadership. I want to structure my talking points clearly and highlight what my team has done, what we're planning, and key risks."
        value={text}
        onChange={(e) => setText(e.target.value)}
        inputProps={{ maxLength: MAX_LENGTH }}
        helperText={`${text.length} / ${MAX_LENGTH} characters (minimum ${MIN_LENGTH})`}
        disabled={loading}
      />

      <Button
        variant="contained"
        size="large"
        fullWidth
        sx={{ mt: 3 }}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
        disabled={tooShort || loading}
        onClick={() => onSubmit(text.trim())}
      >
        {loading ? 'Analysing…' : 'Analyse Context'}
      </Button>
    </Box>
  );
}
