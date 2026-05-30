import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

interface Props {
  loading: boolean;
  onGenerate: (name: string, description: string) => void;
  onBack: () => void;
}

export default function TopicInfoStep({ loading, onGenerate, onBack }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const canGenerate = name.trim().length > 0 && !loading;

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Topic details
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Give your topic a name and an optional description, then click "Generate" to produce 10
        practice questions.
      </Typography>

      <TextField
        label="Topic name"
        fullWidth
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        inputProps={{ maxLength: 100 }}
        helperText={`${name.length} / 100`}
        disabled={loading}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Description (optional)"
        fullWidth
        multiline
        minRows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        inputProps={{ maxLength: 500 }}
        helperText={`${description.length} / 500`}
        disabled={loading}
        sx={{ mb: 3 }}
      />

      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
        disabled={!canGenerate}
        onClick={() => onGenerate(name.trim(), description.trim())}
        sx={{ mb: 2 }}
      >
        {loading ? 'Generating 10 questions…' : 'Generate 10 Questions'}
      </Button>

      <Button variant="outlined" fullWidth onClick={onBack} disabled={loading}>
        Back
      </Button>
    </Box>
  );
}
