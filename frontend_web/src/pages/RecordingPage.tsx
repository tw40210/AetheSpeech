import MicIcon from '@mui/icons-material/Mic';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/system';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppConstants } from '../core/constants';
import { InterviewPhase, useInterview } from '../context/InterviewContext';

const pulseAnim = keyframes`
  0%   { opacity: 0.3; transform: scale(1); }
  50%  { opacity: 0.5; transform: scale(1.06); }
  100% { opacity: 0.3; transform: scale(1); }
`;

export default function RecordingPage() {
  const navigate = useNavigate();
  const {
    currentQuestion,
    questions,
    currentIndex,
    remainingSeconds,
    phase,
    isLastQuestion,
    startRecording,
    stopRecordingAndUpload,
    advanceQuestion,
  } = useInterview();

  const [done, setDone] = useState(false);
  const [permError, setPermError] = useState(false);
  const startedRef = useRef(false);

  const questionNumber = currentIndex + 1;
  const totalQuestions = questions.length;

  const finishRecording = async () => {
    if (done || phase === InterviewPhase.UPLOADING) return;
    if (!currentQuestion) return;
    setDone(true);

    const result = await stopRecordingAndUpload(currentQuestion);
    if (!result) return;

    if (isLastQuestion) {
      navigate('/interview/wait', {
        replace: true,
        state: { answerIds: result.answerIds },
      });
    } else {
      advanceQuestion();
      navigate('/interview/prepare', { replace: true });
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    if (!currentQuestion) {
      navigate('/dashboard', { replace: true });
      return;
    }
    startedRef.current = true;

    startRecording(currentQuestion, AppConstants.recordTimeSeconds, () => {
      if (!done) finishRecording();
    }).catch(() => setPermError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentQuestion) return null;

  const isUploading = phase === InterviewPhase.UPLOADING;
  const isRecording = phase === InterviewPhase.RECORDING;
  const isLow = remainingSeconds <= 10;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit">
        <Toolbar sx={{ justifyContent: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            Question {questionNumber} of {totalQuestions}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 3,
          maxWidth: 600,
          mx: 'auto',
          width: '100%',
        }}
      >
        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={(questionNumber / totalQuestions) * 100}
          sx={{ height: 8, borderRadius: 4, mb: 3 }}
        />

        {/* Question card */}
        <Card elevation={1}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={500}>
              {currentQuestion.text}
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isUploading ? (
            <CircularProgress size={72} />
          ) : isRecording ? (
            <PulsingMicIndicator />
          ) : null}
        </Box>

        {/* Status / timer */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {isUploading ? (
            <Typography color="text.secondary">Uploading…</Typography>
          ) : (
            <>
              <Typography color="text.secondary" mb={1}>
                Time remaining
              </Typography>
              <Typography
                variant="h3"
                fontWeight="bold"
                color={isLow ? 'error' : 'text.primary'}
              >
                {formatTime(remainingSeconds)}
              </Typography>
            </>
          )}
        </Box>

        {/* Finish button */}
        <Button
          variant="contained"
          size="large"
          fullWidth
          color="error"
          startIcon={<StopCircleOutlinedIcon />}
          disabled={isUploading || done}
          onClick={finishRecording}
        >
          Finish Answer
        </Button>
        <Box sx={{ height: 12 }} />
      </Box>

      {/* Permission error dialog */}
      <Dialog open={permError} onClose={() => setPermError(false)}>
        <DialogTitle>Microphone permission required</DialogTitle>
        <DialogContent>
          <Typography>
            Please allow microphone access in your browser settings to record your answers.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermError(false)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function PulsingMicIndicator() {
  return (
    <Box sx={{ position: 'relative', width: 90, height: 90 }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          bgcolor: 'error.main',
          animation: `${pulseAnim} 0.9s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid',
          borderColor: 'error.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MicIcon sx={{ color: 'error.main', fontSize: 36 }} />
      </Box>
    </Box>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
