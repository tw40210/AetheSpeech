import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PendingIcon from '@mui/icons-material/HourglassEmpty';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import type { StepResult } from '../core/types';

interface Props {
  stepId: string;
  title: string;
  subtitle?: string;
  result?: StepResult | null;
  defaultExpanded?: boolean;
  children: ReactNode;
}

function StatusChip({ result }: { result?: StepResult | null }) {
  if (!result) return null;
  if (result.error) {
    return (
      <Chip
        icon={<ErrorIcon />}
        label="Error"
        size="small"
        color="error"
        variant="outlined"
        sx={{ ml: 1 }}
      />
    );
  }
  if (result.output !== null) {
    return (
      <Chip
        icon={<CheckCircleIcon />}
        label={result.attempts ? `Done (${result.attempts} attempt${result.attempts > 1 ? 's' : ''})` : 'Done'}
        size="small"
        color="success"
        variant="outlined"
        sx={{ ml: 1 }}
      />
    );
  }
  return (
    <Chip icon={<PendingIcon />} label="Pending" size="small" variant="outlined" sx={{ ml: 1 }} />
  );
}

export default function StepCard({
  stepId,
  title,
  subtitle,
  result,
  defaultExpanded = false,
  children,
}: Props) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{
        mb: 1,
        border: '1px solid',
        borderColor: result?.error
          ? 'error.light'
          : result?.output !== null && result?.output !== undefined
          ? 'success.light'
          : 'divider',
        borderRadius: '8px !important',
        '&:before': { display: 'none' },
        boxShadow: 'none',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 48 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <StatusChip result={result} />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }} data-step={stepId}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}
