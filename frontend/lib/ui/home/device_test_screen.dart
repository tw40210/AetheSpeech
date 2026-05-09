import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

enum _TestPhase { idle, requesting, recording, playing, done, error }

class DeviceTestScreen extends StatefulWidget {
  const DeviceTestScreen({super.key});

  @override
  State<DeviceTestScreen> createState() => _DeviceTestScreenState();
}

class _DeviceTestScreenState extends State<DeviceTestScreen>
    with SingleTickerProviderStateMixin {
  static const _recordSeconds = 10;

  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _player = AudioPlayer();

  _TestPhase _phase = _TestPhase.idle;
  int _remaining = _recordSeconds;
  String? _filePath;
  String? _errorMessage;
  Timer? _timer;
  bool _isStopping = false;

  late AnimationController _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseAnim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _player.playerStateStream.listen(_onPlayerState);
  }

  void _onPlayerState(PlayerState state) {
    if (state.processingState == ProcessingState.completed && mounted) {
      setState(() => _phase = _TestPhase.done);
    }
  }

  Future<void> _requestAndRecord() async {
    setState(() => _phase = _TestPhase.requesting);

    final hasPermission = await _recorder.hasPermission();
    if (!hasPermission) {
      if (mounted) {
        setState(() {
          _phase = _TestPhase.error;
          _errorMessage =
              'Microphone permission denied. Please allow access in Settings.';
        });
      }
      return;
    }

    final dir = await getTemporaryDirectory();
    _filePath = '${dir.path}/device_test.m4a';

    // Remove leftover file from a previous test
    final prev = File(_filePath!);
    if (prev.existsSync()) prev.deleteSync();

    await _recorder.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        sampleRate: 16000,
        bitRate: 64000,
        numChannels: 1,
        androidConfig: AndroidRecordConfig(
          useLegacy: true,
          manageBluetooth: false,
          audioSource: AndroidAudioSource.mic,
        ),
      ),
      path: _filePath!,
    );

    setState(() {
      _phase = _TestPhase.recording;
      _remaining = _recordSeconds;
    });
    _pulseAnim.repeat(reverse: true);

    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() => _remaining--);
      if (_remaining <= 0) {
        t.cancel();
        _stopAndPlay();
      }
    });
  }

  Future<void> _stopAndPlay() async {
    if (_isStopping) return;
    _isStopping = true;
    _timer?.cancel();
    _pulseAnim.stop();

    final path = await _recorder.stop();
    if (!mounted) return;

    if (path == null || !File(path).existsSync()) {
      setState(() {
        _phase = _TestPhase.error;
        _errorMessage = 'Recording failed — no audio was captured.';
      });
      _isStopping = false;
      return;
    }

    setState(() => _phase = _TestPhase.playing);

    try {
      await _player.setFilePath(path);
      await _player.play();
    } catch (e) {
      if (mounted) {
        setState(() {
          _phase = _TestPhase.error;
          _errorMessage = 'Playback error: $e';
        });
      }
    } finally {
      _isStopping = false;
    }
  }

  Future<void> _reset() async {
    _timer?.cancel();
    _pulseAnim.stop();
    await _recorder.cancel();
    await _player.stop();
    if (mounted) {
      setState(() {
        _phase = _TestPhase.idle;
        _remaining = _recordSeconds;
        _errorMessage = null;
      });
    }
    _isStopping = false;
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseAnim.dispose();
    _recorder.dispose();
    _player.dispose();
    super.dispose();
  }

  // ───────────────────────── build ─────────────────────────

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Device Test'),
        leading: BackButton(onPressed: () => Navigator.of(context).pop()),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
          child: Column(
            children: [
              _buildInfoCard(context, cs),
              const Spacer(),
              _buildIndicator(cs),
              const SizedBox(height: 32),
              _buildStatusText(context, cs),
              const Spacer(),
              _buildActions(context, cs),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context, ColorScheme cs) {
    return Card(
      color: cs.secondaryContainer.withValues(alpha: 0.5),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.info_outline, color: cs.secondary, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Tap Record to capture a 10-second clip. '
                'It will play back automatically so you can confirm your microphone works.',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: cs.onSecondaryContainer),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIndicator(ColorScheme cs) {
    switch (_phase) {
      case _TestPhase.idle:
      case _TestPhase.requesting:
        return _CircleIcon(
          icon: Icons.mic_none_rounded,
          color: cs.outline,
          pulse: false,
          anim: _pulseAnim,
        );
      case _TestPhase.recording:
        return _CircleIcon(
          icon: Icons.mic_rounded,
          color: cs.error,
          pulse: true,
          anim: _pulseAnim,
        );
      case _TestPhase.playing:
        return _CircleIcon(
          icon: Icons.volume_up_rounded,
          color: cs.primary,
          pulse: true,
          anim: _pulseAnim..repeat(reverse: true),
        );
      case _TestPhase.done:
        return _CircleIcon(
          icon: Icons.check_circle_rounded,
          color: Colors.green,
          pulse: false,
          anim: _pulseAnim,
        );
      case _TestPhase.error:
        return _CircleIcon(
          icon: Icons.error_outline_rounded,
          color: cs.error,
          pulse: false,
          anim: _pulseAnim,
        );
    }
  }

  Widget _buildStatusText(BuildContext context, ColorScheme cs) {
    final (title, subtitle, titleColor) = switch (_phase) {
      _TestPhase.idle => (
          'Ready to test',
          'Tap the Record button below to start.',
          cs.onSurface
        ),
      _TestPhase.requesting => (
          'Requesting permission…',
          'Please allow microphone access.',
          cs.onSurface
        ),
      _TestPhase.recording => (
          'Recording…',
          'Speak naturally. Stopping in $_remaining second${_remaining == 1 ? "" : "s"}.',
          cs.error
        ),
      _TestPhase.playing => (
          'Playing back…',
          'Listen to confirm your microphone works.',
          cs.primary
        ),
      _TestPhase.done => (
          'Test passed!',
          'Your microphone is working correctly.',
          Colors.green
        ),
      _TestPhase.error => (
          'Something went wrong',
          _errorMessage ?? 'Unknown error.',
          cs.error
        ),
    };

    return Column(
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: titleColor,
              ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          subtitle,
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: cs.outline),
          textAlign: TextAlign.center,
        ),
        if (_phase == _TestPhase.recording) ...[
          const SizedBox(height: 20),
          _CountdownBar(remaining: _remaining, total: _recordSeconds),
        ],
      ],
    );
  }

  Widget _buildActions(BuildContext context, ColorScheme cs) {
    return switch (_phase) {
      _TestPhase.idle || _TestPhase.error => FilledButton.icon(
          onPressed: _requestAndRecord,
          icon: const Icon(Icons.mic_rounded),
          label: const Text('Record'),
        ),
      _TestPhase.requesting => FilledButton.icon(
          onPressed: null,
          icon: const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          label: const Text('Requesting…'),
        ),
      _TestPhase.recording => FilledButton.icon(
          onPressed: _stopAndPlay,
          icon: const Icon(Icons.stop_rounded),
          label: const Text('Stop & Play'),
          style: FilledButton.styleFrom(backgroundColor: cs.error),
        ),
      _TestPhase.playing => FilledButton.icon(
          onPressed: null,
          icon: const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          label: const Text('Playing back…'),
        ),
      _TestPhase.done => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FilledButton.icon(
              onPressed: _reset,
              icon: const Icon(Icons.replay_rounded),
              label: const Text('Test Again'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Done'),
            ),
          ],
        ),
    };
  }
}

// ────────────────────────── helpers ──────────────────────────

class _CircleIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final bool pulse;
  final AnimationController anim;

  const _CircleIcon({
    required this.icon,
    required this.color,
    required this.pulse,
    required this.anim,
  });

  @override
  Widget build(BuildContext context) {
    if (!pulse) {
      return Container(
        width: 120,
        height: 120,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color.withValues(alpha: 0.12),
          border: Border.all(color: color, width: 2.5),
        ),
        child: Icon(icon, color: color, size: 52),
      );
    }

    return AnimatedBuilder(
      animation: anim,
      builder: (_, __) => Container(
        width: 120,
        height: 120,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color.withValues(alpha: 0.08 + 0.18 * anim.value),
          border: Border.all(color: color, width: 2.5),
        ),
        child: Icon(icon, color: color, size: 52),
      ),
    );
  }
}

class _CountdownBar extends StatelessWidget {
  final int remaining;
  final int total;

  const _CountdownBar({required this.remaining, required this.total});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final progress = remaining / total;
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 8,
            color: remaining <= 3 ? cs.error : cs.primary,
            backgroundColor: cs.surfaceContainerHighest,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '$remaining s',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: remaining <= 3 ? cs.error : cs.onSurface,
              ),
        ),
      ],
    );
  }
}
