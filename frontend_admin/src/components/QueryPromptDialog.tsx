import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import type { ChatPayload } from '../core/types';
import JsonPayloadViewer from './JsonPayloadViewer';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  payload?: ChatPayload | null;
  note?: string;
}

export default function QueryPromptDialog({ open, onClose, title, payload, note }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent dividers>
        {note && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {note}
          </Typography>
        )}
        {payload ? (
          <JsonPayloadViewer
            label="Full request body sent to /chat/completions"
            value={payload}
            maxHeight={480}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No LLM prompt is available for this step.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
