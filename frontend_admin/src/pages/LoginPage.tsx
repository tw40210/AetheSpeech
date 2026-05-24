import LockIcon from '@mui/icons-material/Lock';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApiError, adminApiClient } from '../services/adminApiClient';

export default function LoginPage() {
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError(null);
    adminApiClient.setKey(key.trim());

    try {
      // Validate key by making a real request
      await adminApiClient.get('/admin/db/tables');
      navigate('/db');
    } catch (err) {
      adminApiClient.clearKey();
      if (err instanceof AdminApiError) {
        setError(err.status === 403 ? 'Invalid admin key.' : err.message);
      } else {
        setError('Could not connect to the API. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#263238',
      }}
    >
      <Paper
        elevation={4}
        sx={{ p: 4, width: '100%', maxWidth: 380, borderRadius: 2 }}
        component="form"
        onSubmit={handleSubmit}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
            }}
          >
            <LockIcon sx={{ color: 'white' }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            AetheSpeech Admin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter your admin API key to continue
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Admin API Key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
          disabled={loading}
          sx={{ mb: 2 }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading || !key.trim()}
          sx={{ height: 44 }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Sign in'}
        </Button>

        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
          Set ADMIN_API_KEY in backend/.env
        </Typography>
      </Paper>
    </Box>
  );
}
