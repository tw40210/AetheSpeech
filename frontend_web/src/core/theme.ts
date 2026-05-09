import { createTheme } from '@mui/material/styles';
import type { TopicLabel } from './types';

const seedColor = '#5C6BC0'; // Indigo — matches Flutter seed

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: seedColor,
    },
    secondary: {
      main: '#7986CB',
    },
    error: {
      main: '#D32F2F',
    },
    success: {
      main: '#388E3C',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          minHeight: 48,
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

// Label tag colors for XML-labeled transcript rendering (mirrors Flutter AppTheme.labelColors)
export const labelColors: Record<string, string> = {
  // Business Report
  WWAD: '#1976D2',
  WWSDI: '#388E3C',
  WWHD: '#F57C00',
  NS: '#7B1FA2',
  // Product Pitch
  PROBLEM: '#D32F2F',
  SOLUTION: '#0288D1',
  VALUE: '#00796B',
  PLAN: '#C2185B',
  // Self Introduction
  BACKGROUND: '#5D4037',
  SKILLS: '#00897B',
  ACHIEVEMENT: '#E64A19',
  GOAL: '#1565C0',
};

export function getLabelColor(key: string): string {
  return labelColors[key] ?? '#616161';
}

// Fallback label definitions used by the assessment tab renderer
export const fallbackLabels: TopicLabel[] = [
  { key: 'WWAD', name: 'What we are doing' },
  { key: 'WWSDI', name: 'Why we should do it' },
  { key: 'WWHD', name: 'What we have done' },
  { key: 'NS', name: 'Next step' },
  { key: 'PROBLEM', name: 'Problem statement' },
  { key: 'SOLUTION', name: 'Proposed solution' },
  { key: 'VALUE', name: 'Value proposition' },
  { key: 'PLAN', name: 'Execution plan' },
  { key: 'BACKGROUND', name: 'Professional background' },
  { key: 'SKILLS', name: 'Key skills' },
  { key: 'ACHIEVEMENT', name: 'Notable achievements' },
  { key: 'GOAL', name: 'Future goals' },
];
