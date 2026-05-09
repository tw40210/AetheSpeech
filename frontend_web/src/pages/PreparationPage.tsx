import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CountdownRing from '../components/CountdownRing';
import { AppConstants } from '../core/constants';
import { useInterview } from '../context/InterviewContext';

export default function PreparationPage() {
  const navigate = useNavigate();
  const { currentQuestion, questions, currentIndex, remainingSeconds, startPreparation } =
    useInterview();

  const startedRef = useRef(false);

  const questionNumber = currentIndex + 1;
  const totalQuestions = questions.length;

  useEffect(() => {
    if (startedRef.current) return;
    if (!currentQuestion) {
      navigate('/dashboard', { replace: true });
      return;
    }
    startedRef.current = true;
    startPreparation(AppConstants.prepTimeSeconds, () => {
      navigate('/interview/record');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentQuestion) return null;

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
          sx={{ height: 8, borderRadius: 4, mb: 4 }}
        />

        {/* Question card */}
        <Box
          sx={{
            borderRadius: 3,
            p: 2.5,
            bgcolor: 'primary.main' + '18',
            border: '1px solid',
            borderColor: 'primary.main' + '40',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <HelpOutlineIcon color="primary" />
            <Typography fontWeight={600} color="primary.main">
              Question
            </Typography>
          </Box>
          <Typography variant="subtitle1" fontWeight={500}>
            {currentQuestion.text}
          </Typography>

          {currentQuestion.context && (
            <>
              <Divider sx={{ my: 1.5, borderColor: 'primary.main' + '40' }} />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <InfoOutlinedIcon
                  sx={{
                    fontSize: 16,
                    color: 'primary.main',
                    opacity: 0.7,
                    mt: 0.25,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" sx={{ color: 'primary.dark', opacity: 0.85 }}>
                  {currentQuestion.context}
                </Typography>
              </Box>
            </>
          )}
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Countdown ring */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1" color="text.secondary">
            Preparation time
          </Typography>
          <CountdownRing
            remaining={remainingSeconds}
            total={AppConstants.prepTimeSeconds}
            size={140}
          />
          <Typography variant="caption" color="text.secondary">
            Recording will start automatically
          </Typography>
        </Box>

        <Box sx={{ height: 40 }} />
      </Box>
    </Box>
  );
}
