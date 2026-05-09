import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MicNoneRoundedIcon from '@mui/icons-material/MicNoneRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/system';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RECORD_SECONDS = 10;

const enum Phase {
  IDLE = 'idle',
  REQUESTING = 'requesting',
  RECORDING = 'recording',
  PLAYING = 'playing',
  DONE = 'done',
  ERROR = 'error',
}

const pulseAnim = keyframes`
  0%   { transform: scale(1);    opacity: 1;   }
  50%  { transform: scale(1.08); opacity: 0.7; }
  100% { transform: scale(1);    opacity: 1;   }
`;

interface StatusUI {
  icon: ReactNode;
  iconColor: string;
  statusTitle: string;
  statusSubtitle: string;
  titleColor: string;
}

export default function DeviceTestPage() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>(Phase.IDLE);
  const [remaining, setRemaining] = useState(RECORD_SECONDS);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef(new Audio());
  const blobUrlRef = useRef<string | null>(null);
  const stoppingRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      clearTimer();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audio.pause();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const startRecording = async () => {
    setPhase(Phase.REQUESTING);
    stoppingRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start(100);

      setPhase(Phase.RECORDING);
      setRemaining(RECORD_SECONDS);

      let rem = RECORD_SECONDS;
      timerRef.current = setInterval(() => {
        rem -= 1;
        setRemaining(rem);
        if (rem <= 0) {
          clearTimer();
          stopAndPlay();
        }
      }, 1000);
    } catch {
      setErrorMsg('Microphone permission denied. Please allow access in Settings.');
      setPhase(Phase.ERROR);
    }
  };

  const stopAndPlay = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    clearTimer();

    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') {
      stoppingRef.current = false;
      return;
    }

    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      mr.stop();
    });

    streamRef.current?.getTracks().forEach((t) => t.stop());

    const mimeType = mr.mimeType || 'audio/webm';
    const blob = new Blob(chunksRef.current, { type: mimeType });

    if (blob.size === 0) {
      setErrorMsg('Recording failed — no audio was captured.');
      setPhase(Phase.ERROR);
      stoppingRef.current = false;
      return;
    }

    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = URL.createObjectURL(blob);

    const audio = audioRef.current;
    audio.src = blobUrlRef.current;
    setPhase(Phase.PLAYING);

    audio.onended = () => setPhase(Phase.DONE);
    audio.onerror = () => {
      setErrorMsg('Playback error — could not play the recording.');
      setPhase(Phase.ERROR);
    };

    try {
      await audio.play();
    } catch {
      setErrorMsg('Playback was blocked by the browser. Try clicking play.');
      setPhase(Phase.ERROR);
    }

    stoppingRef.current = false;
  }, []);

  const reset = () => {
    clearTimer();
    stoppingRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioRef.current.pause();
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPhase(Phase.IDLE);
    setRemaining(RECORD_SECONDS);
    setErrorMsg('');
    chunksRef.current = [];
  };

  const ui = getStatusUI(phase, remaining, errorMsg);
  const isPulsing = phase === Phase.RECORDING || phase === Phase.PLAYING;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit">
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="bold" sx={{ ml: 1 }}>
            Device Test
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          px: 4,
          py: 3,
          maxWidth: 480,
          mx: 'auto',
          width: '100%',
        }}
      >
        {/* Info card */}
        <Box
          sx={{
            width: '100%',
            borderRadius: 3,
            p: 2,
            display: 'flex',
            gap: 1.5,
            bgcolor: 'secondary.main' + '18',
            mb: 4,
          }}
        >
          <InfoOutlinedIcon sx={{ color: 'secondary.main', flexShrink: 0, mt: 0.25 }} />
          <Typography variant="body2" color="text.secondary">
            Tap Record to capture a 10-second clip. It will play back automatically so you can
            confirm your microphone works.
          </Typography>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: `2.5px solid ${ui.iconColor}`,
              bgcolor: `${ui.iconColor}1E`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isPulsing ? `${pulseAnim} 0.9s ease-in-out infinite` : 'none',
            }}
          >
            {ui.icon}
          </Box>
        </Box>

        {/* Status text */}
        <Box sx={{ width: '100%', textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: ui.titleColor, mb: 0.5 }}>
            {ui.statusTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {ui.statusSubtitle}
          </Typography>

          {phase === Phase.RECORDING && (
            <Box sx={{ mt: 2.5 }}>
              <LinearProgress
                variant="determinate"
                value={(remaining / RECORD_SECONDS) * 100}
                color={remaining <= 3 ? 'error' : 'primary'}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                mt={1}
                color={remaining <= 3 ? 'error' : 'text.primary'}
              >
                {remaining} s
              </Typography>
            </Box>
          )}
        </Box>

        {/* Action buttons */}
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {(phase === Phase.IDLE || phase === Phase.ERROR) && (
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<MicRoundedIcon />}
              onClick={startRecording}
            >
              Record
            </Button>
          )}

          {phase === Phase.REQUESTING && (
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled
              startIcon={<CircularProgress size={18} color="inherit" />}
            >
              Requesting…
            </Button>
          )}

          {phase === Phase.RECORDING && (
            <Button
              variant="contained"
              size="large"
              fullWidth
              color="error"
              startIcon={<StopRoundedIcon />}
              onClick={stopAndPlay}
            >
              Stop & Play
            </Button>
          )}

          {phase === Phase.PLAYING && (
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled
              startIcon={<CircularProgress size={18} color="inherit" />}
            >
              Playing back…
            </Button>
          )}

          {phase === Phase.DONE && (
            <>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<ReplayRoundedIcon />}
                onClick={reset}
              >
                Test Again
              </Button>
              <Button variant="outlined" size="large" fullWidth onClick={() => navigate(-1)}>
                Done
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function getStatusUI(phase: Phase, remaining: number, errorMsg: string): StatusUI {
  switch (phase) {
    case Phase.IDLE:
      return {
        icon: <MicNoneRoundedIcon sx={{ fontSize: 52, color: 'text.secondary' }} />,
        iconColor: '#9E9E9E',
        statusTitle: 'Ready to test',
        statusSubtitle: 'Tap the Record button below to start.',
        titleColor: 'inherit',
      };
    case Phase.REQUESTING:
      return {
        icon: <CircularProgress size={40} />,
        iconColor: '#9E9E9E',
        statusTitle: 'Requesting permission…',
        statusSubtitle: 'Please allow microphone access.',
        titleColor: 'inherit',
      };
    case Phase.RECORDING:
      return {
        icon: <MicRoundedIcon sx={{ fontSize: 52, color: 'error.main' }} />,
        iconColor: '#D32F2F',
        statusTitle: 'Recording…',
        statusSubtitle: `Speak naturally. Stopping in ${remaining} second${remaining === 1 ? '' : 's'}.`,
        titleColor: '#D32F2F',
      };
    case Phase.PLAYING:
      return {
        icon: <VolumeUpRoundedIcon sx={{ fontSize: 52, color: 'primary.main' }} />,
        iconColor: '#5C6BC0',
        statusTitle: 'Playing back…',
        statusSubtitle: 'Listen to confirm your microphone works.',
        titleColor: '#5C6BC0',
      };
    case Phase.DONE:
      return {
        icon: <CheckCircleRoundedIcon sx={{ fontSize: 52, color: 'success.main' }} />,
        iconColor: '#388E3C',
        statusTitle: 'Test passed!',
        statusSubtitle: 'Your microphone is working correctly.',
        titleColor: '#388E3C',
      };
    case Phase.ERROR:
      return {
        icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 52, color: 'error.main' }} />,
        iconColor: '#D32F2F',
        statusTitle: 'Something went wrong',
        statusSubtitle: errorMsg || 'Unknown error.',
        titleColor: '#D32F2F',
      };
  }
}
