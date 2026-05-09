import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/system';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import { ReportFetchState, useReport } from '../context/ReportContext';

// Fading-circle spinner animation (mirrors Flutter's SpinKitFadingCircle)
const fadeRotate = keyframes`
  0%   { transform: rotate(0deg);   opacity: 1;   }
  100% { transform: rotate(360deg); opacity: 0.2; }
`;

interface FadingSpinnerProps {
  size?: number;
  color?: string;
}

function FadingSpinner({ size = 80, color = '#5C6BC0' }: FadingSpinnerProps) {
  const dots = 8;
  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      {Array.from({ length: dots }).map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: size * 0.2,
            height: size * 0.2,
            borderRadius: '50%',
            bgcolor: color,
            top: '50%',
            left: '50%',
            transformOrigin: '0 0',
            transform: `rotate(${(i / dots) * 360}deg) translate(${size * 0.35}px) translate(-50%, -50%)`,
            opacity: 1 - (i / dots) * 0.8,
            animation: `${fadeRotate} ${dots * 0.15}s ${-(i * 0.15)}s linear infinite`,
          }}
        />
      ))}
    </Box>
  );
}

export default function WaitingPage() {
  const navigate = useNavigate();
  const { answerIds } = useInterview();
  const { fetchState, error, submitBatch, startPolling } = useReport();

  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    if (!answerIds || answerIds.length === 0) {
      navigate('/dashboard', { replace: true });
      return;
    }

    (async () => {
      const reportId = await submitBatch(answerIds);
      if (!reportId) return;

      startPolling(reportId, {
        onDone: () => navigate(`/report/${reportId}`, { replace: true }),
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Error state ── */
  if (fetchState === ReportFetchState.ERROR) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            maxWidth: 400,
            textAlign: 'center',
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 72, color: 'error.main' }} />
          <Typography variant="h5" fontWeight="bold">
            Something went wrong
          </Typography>
          <Typography color="text.secondary">{error ?? 'An unknown error occurred'}</Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/dashboard', { replace: true })}
          >
            Back to Home
          </Button>
        </Box>
      </Box>
    );
  }

  /* ── Waiting / polling state ── */
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          maxWidth: 400,
          textAlign: 'center',
        }}
      >
        <FadingSpinner size={80} color="#5C6BC0" />
        <Typography variant="h5" fontWeight="bold">
          Analysing your answers…
        </Typography>
        <Typography color="text.secondary">
          AI is transcribing your speech, labeling key points, and preparing personalised
          feedback.
        </Typography>
      </Box>
    </Box>
  );
}
