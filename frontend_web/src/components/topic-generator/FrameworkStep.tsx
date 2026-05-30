import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import { useState } from 'react';
import type { FrameworkSuggestion, TopicLabel } from '../../core/types';

interface CustomLabel {
  key: string;
  name: string;
}

interface Props {
  suggestions: FrameworkSuggestion[];
  onNext: (labels: TopicLabel[]) => void;
  onBack: () => void;
}

export default function FrameworkStep({ suggestions, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(suggestions.map((s) => s.key)),
  );
  const [custom, setCustom] = useState<CustomLabel[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [customError, setCustomError] = useState('');

  const toggleSuggestion = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addCustom = () => {
    const key = newKey.trim().toUpperCase();
    const name = newName.trim();
    if (!key || !name) {
      setCustomError('Both key and name are required.');
      return;
    }
    if (key.length > 20) {
      setCustomError('Key must be 20 characters or less.');
      return;
    }
    if (name.length > 100) {
      setCustomError('Name must be 100 characters or less.');
      return;
    }
    const allKeys = [...suggestions.map((s) => s.key), ...custom.map((c) => c.key)];
    if (allKeys.includes(key)) {
      setCustomError(`Key "${key}" already exists.`);
      return;
    }
    setCustom((prev) => [...prev, { key, name }]);
    setNewKey('');
    setNewName('');
    setCustomError('');
  };

  const removeCustom = (key: string) => {
    setCustom((prev) => prev.filter((c) => c.key !== key));
  };

  const buildLabels = (): TopicLabel[] => {
    const fromSuggestions = suggestions
      .filter((s) => selected.has(s.key))
      .map((s) => ({ key: s.key, name: s.name }));
    return [...fromSuggestions, ...custom];
  };

  const totalLabels = selected.size + custom.length;
  const canProceed = totalLabels > 0 && totalLabels <= 20;

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Select your framework labels
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        The AI suggested these frameworks based on your context. Select the ones you want to use,
        or add custom labels below.
      </Typography>

      <Stack spacing={1.5} mb={3}>
        {suggestions.map((s) => (
          <Box
            key={s.key}
            sx={{
              border: 1,
              borderColor: selected.has(s.key) ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 2,
              bgcolor: selected.has(s.key) ? 'primary.main' + '0D' : 'background.paper',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onClick={() => toggleSuggestion(s.key)}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Checkbox
                checked={selected.has(s.key)}
                size="small"
                sx={{ p: 0, mt: 0.25 }}
                onChange={() => toggleSuggestion(s.key)}
                onClick={(e) => e.stopPropagation()}
              />
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip label={s.key} size="small" color="primary" variant="outlined" />
                  <Typography variant="subtitle2" fontWeight={600}>
                    {s.name}
                  </Typography>
                  {s.is_preset && (
                    <Chip label="preset" size="small" sx={{ height: 18, fontSize: 10 }} />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {s.rationale}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Stack>

      {custom.length > 0 && (
        <Box mb={2}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
            CUSTOM LABELS
          </Typography>
          <Stack spacing={1}>
            {custom.map((c) => (
              <Box
                key={c.key}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}
              >
                <Chip label={c.key} size="small" color="secondary" variant="outlined" />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {c.name}
                </Typography>
                <Tooltip title="Remove">
                  <IconButton size="small" onClick={() => removeCustom(c.key)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" fontWeight={600} mb={1}>
        Add a custom label
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          label="Key (e.g. RISK)"
          size="small"
          value={newKey}
          onChange={(e) => { setNewKey(e.target.value.toUpperCase()); setCustomError(''); }}
          inputProps={{ maxLength: 20 }}
          sx={{ width: 140 }}
        />
        <TextField
          label="Name (e.g. Risk factor)"
          size="small"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setCustomError(''); }}
          inputProps={{ maxLength: 100 }}
          sx={{ flex: 1, minWidth: 160 }}
          error={!!customError}
          helperText={customError}
        />
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addCustom}
          sx={{ height: 40 }}
        >
          Add
        </Button>
      </Box>

      {totalLabels > 20 && (
        <Typography variant="caption" color="error" mt={1} display="block">
          Maximum 20 labels allowed.
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button variant="outlined" onClick={onBack} sx={{ flex: 1 }}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={() => onNext(buildLabels())}
          disabled={!canProceed}
          sx={{ flex: 2 }}
        >
          Use {totalLabels} label{totalLabels !== 1 ? 's' : ''} →
        </Button>
      </Box>
    </Box>
  );
}
