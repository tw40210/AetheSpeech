import { Box } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * Thin wrapper that renders a vertical sequence of StepCard accordions.
 * All step-specific rendering logic lives in PromptLabPage.
 */
interface Props {
  children: ReactNode;
}

export default function WorkflowStepper({ children }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {children}
    </Box>
  );
}
