import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import BackToHomeButton from './BackToHomeButton';

interface InterviewStageAppBarProps {
  questionNumber: number;
  totalQuestions: number;
  homeDisabled?: boolean;
}

export default function InterviewStageAppBar({
  questionNumber,
  totalQuestions,
  homeDisabled = false,
}: InterviewStageAppBarProps) {
  return (
    <AppBar position="static" color="inherit">
      <Toolbar>
        <Typography variant="h6" fontWeight="bold" sx={{ flex: 1, textAlign: 'center' }}>
          Question {questionNumber} of {totalQuestions}
        </Typography>
        <BackToHomeButton disabled={homeDisabled} />
      </Toolbar>
    </AppBar>
  );
}
