import { createTheme } from '@mui/material/styles';

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

// Palette for XML-labeled transcript rendering; assigned by label order (mirrors Flutter AppTheme.labelPalette)
export const labelPalette: string[] = [
  '#1976D2', // Blue
  '#388E3C', // Green
  '#F57C00', // Orange
  '#7B1FA2', // Purple
  '#D32F2F', // Red
  '#0288D1', // Light blue
  '#00796B', // Teal
  '#C2185B', // Pink
  '#5D4037', // Brown
  '#E64A19', // Deep orange
];

export function getLabelColorAtIndex(index: number): string {
  return labelPalette[index % labelPalette.length];
}
