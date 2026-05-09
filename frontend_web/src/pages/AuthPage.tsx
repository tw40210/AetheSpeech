import MicRoundedIcon from '@mui/icons-material/MicRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState(0); // 0 = Login, 1 = Register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setError('');
    setEmail('');
    setPassword('');
  };

  const validate = (): string | null => {
    if (!email.includes('@')) return 'Enter a valid email address';
    if (tab === 1 && password.length < 6) return 'Password must be at least 6 characters';
    if (!password) return 'Enter your password';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');
    try {
      if (tab === 0) {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="xs">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
          {/* Logo */}
          <MicRoundedIcon sx={{ fontSize: 64, color: 'primary.main', mb: 1.5 }} />
          <Typography variant="h4" fontWeight="bold" color="primary" textAlign="center">
            AetheSpeech
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={4}>
            AI-powered speech assessment
          </Typography>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ width: '100%', mb: 3 }}
          >
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              autoComplete="email"
            />
            <TextField
              label={tab === 1 ? 'Password (min 6 chars)' : 'Password'}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              autoComplete={tab === 0 ? 'current-password' : 'new-password'}
            />

            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{ mt: 1 }}
            >
              {loading ? (
                <CircularProgress size={22} color="inherit" />
              ) : tab === 0 ? (
                'Login'
              ) : (
                'Create Account'
              )}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
