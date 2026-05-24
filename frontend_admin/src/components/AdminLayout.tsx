import DatabaseIcon from '@mui/icons-material/Storage';
import TuneIcon from '@mui/icons-material/Tune';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  IconButton,
} from '@mui/material';
import { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApiClient } from '../services/adminApiClient';

const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
  { label: 'DB Browser', icon: <DatabaseIcon fontSize="small" />, path: '/db' },
  { label: 'Prompt Lab', icon: <TuneIcon fontSize="small" />, path: '/prompt-lab' },
];

interface Props {
  children: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    adminApiClient.clearKey();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: '#263238',
            color: 'white',
            borderRight: 'none',
          },
        }}
      >
        <Toolbar sx={{ px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 1, color: '#CFD8DC' }}>
            AETHESPEECH
          </Typography>
        </Toolbar>

        <Box sx={{ px: 1 }}>
          <Typography
            variant="caption"
            sx={{ px: 1.5, color: '#78909C', textTransform: 'uppercase', letterSpacing: 1 }}
          >
            Admin
          </Typography>
          <List dense disablePadding sx={{ mt: 0.5 }}>
            {NAV_ITEMS.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <ListItemButton
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    color: active ? 'white' : '#B0BEC5',
                    bgcolor: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 600 : 400 }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {/* Main area */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <AppBar position="static" color="inherit" elevation={0}>
          <Toolbar variant="dense" sx={{ gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
              Admin Dashboard
            </Typography>
            <Tooltip title="Sign out">
              <IconButton size="small" onClick={handleSignOut}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'background.default' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
