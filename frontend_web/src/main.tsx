import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { InterviewProvider } from './context/InterviewContext';
import { ReportProvider } from './context/ReportContext';
import { appTheme } from './core/theme';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <InterviewProvider>
            <ReportProvider>
              <App />
            </ReportProvider>
          </InterviewProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
