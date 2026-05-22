import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';

interface BackToHomeButtonProps {
  disabled?: boolean;
}

export default function BackToHomeButton({ disabled = false }: BackToHomeButtonProps) {
  const navigate = useNavigate();
  const { reset } = useInterview();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = () => {
    setConfirmOpen(false);
    reset();
    navigate('/dashboard', { replace: true });
  };

  return (
    <>
      <Button
        color="inherit"
        startIcon={<HomeOutlinedIcon />}
        disabled={disabled}
        onClick={() => setConfirmOpen(true)}
        sx={{ textTransform: 'none', fontWeight: 600 }}
      >
        Back to Home
      </Button>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Leave this session?</DialogTitle>
        <DialogContent>
          <Typography>
            Your progress on the current question will be lost. You can start a new practice
            session from the home page.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Stay</Button>
          <Button variant="contained" color="primary" onClick={handleConfirm}>
            Back to Home
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
