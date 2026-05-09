import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import type { CircularProgressProps } from '@mui/material/CircularProgress';

type MuiColor = CircularProgressProps['color'];
const MUI_COLORS = new Set<string>([
  'primary', 'secondary', 'error', 'warning', 'info', 'success', 'inherit',
]);

interface CountdownRingProps {
  remaining: number;
  total: number;
  /** MUI color name or hex string. Defaults to 'primary'. */
  color?: string;
  size?: number;
}

/**
 * Circular countdown indicator that mirrors Flutter's _CountdownRing widget.
 * Shows a colored circular progress bar with the remaining seconds in the center.
 */
export default function CountdownRing({
  remaining,
  total,
  color = 'primary',
  size = 140,
}: CountdownRingProps) {
  const value = total > 0 ? (remaining / total) * 100 : 0;
  const isMuiColor = MUI_COLORS.has(color);

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        width: size,
        height: size,
      }}
    >
      {/* Track (background ring) */}
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={4}
        sx={{
          color: isMuiColor ? undefined : `${color}26`,
          ...(isMuiColor && { opacity: 0.15 }),
          position: 'absolute',
        }}
        color={isMuiColor ? (color as MuiColor) : undefined}
      />
      {/* Foreground ring */}
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={4}
        color={isMuiColor ? (color as MuiColor) : undefined}
        sx={isMuiColor ? {} : { color }}
      />
      {/* Centered number */}
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="h4"
          component="span"
          fontWeight="bold"
          color={isMuiColor ? color : undefined}
          sx={isMuiColor ? {} : { color }}
        >
          {remaining}
        </Typography>
      </Box>
    </Box>
  );
}
