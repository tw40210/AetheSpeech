import { createTheme } from '@mui/material/styles';

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#37474F', // Blue-grey — distinct from the user app's indigo
    },
    secondary: {
      main: '#5C6BC0',
    },
    background: {
      default: '#F5F5F5',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    fontSize: 13,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(0,0,0,0.10)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: 13,
        },
      },
    },
  },
});
