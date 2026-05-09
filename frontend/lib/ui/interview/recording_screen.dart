import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../core/routes.dart';
import '../../models/question.dart';
import '../../state/interview_state.dart';

class RecordingScreen extends StatefulWidget {
  final Question question;
  final int questionNumber;
  final int totalQuestions;

  const RecordingScreen({
    super.key,
    required this.question,
    required this.questionNumber,
    required this.totalQuestions,
  });

  @override
  State<RecordingScreen> createState() => _RecordingScreenState();
}

class _RecordingScreenState extends State<RecordingScreen> {
  bool _done = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final interview = context.read<InterviewState>();
      final hasPermission = await interview.checkPermission();
      if (!mounted) return;
      if (!hasPermission) {
        _showPermissionError();
        return;
      }
      interview.startRecording(AppConstants.recordTimeSeconds, _onTimeUp);
    });
  }

  void _onTimeUp() {
    if (!_done) _finishRecording();
  }

  Future<void> _finishRecording() async {
    if (_done) return;
    setState(() => _done = true);

    final interview = context.read<InterviewState>();
    await interview.stopRecordingAndUpload();

    if (!mounted) return;

    if (interview.isLastQuestion) {
      context.go(AppRoutes.waiting);
    } else {
      interview.advanceQuestion();
      context.go(
        AppRoutes.preparation,
        extra: {
          'question': interview.currentQuestion!,
          'questionNumber': widget.questionNumber + 1,
          'totalQuestions': widget.totalQuestions,
        },
      );
    }
  }

  void _showPermissionError() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Microphone permission required'),
        content: const Text(
            'Please allow microphone access in Settings to record your answers.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final state = context.watch<InterviewState>();

    return Scaffold(
      appBar: AppBar(
        title: Text(
            'Question ${widget.questionNumber} of ${widget.totalQuestions}'),
        automaticallyImplyLeading: false,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LinearProgressIndicator(
              value: widget.questionNumber / widget.totalQuestions,
              borderRadius: BorderRadius.circular(8),
            ),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  widget.question.text,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ),
            const Spacer(),
            Center(
              child: state.phase == InterviewPhase.uploading
                  ? const CircularProgressIndicator()
                  : state.phase == InterviewPhase.recording
                      ? _RecordingIndicator(color: cs.error)
                      : const SizedBox.shrink(),
            ),
            const SizedBox(height: 24),
            Text(
              state.phase == InterviewPhase.uploading
                  ? 'Uploading…'
                  : 'Time remaining',
              textAlign: TextAlign.center,
              style: TextStyle(color: cs.outline),
            ),
            if (state.phase == InterviewPhase.recording) ...[
              const SizedBox(height: 8),
              Center(
                child: Text(
                  _formatTime(state.remainingSeconds),
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: state.remainingSeconds <= 10
                            ? cs.error
                            : cs.onSurface,
                      ),
                ),
              ),
            ],
            const Spacer(),
            FilledButton.icon(
              onPressed:
                  (state.phase == InterviewPhase.uploading || _done)
                      ? null
                      : _finishRecording,
              icon: const Icon(Icons.stop_circle_outlined),
              label: const Text('Finish Answer'),
              style: FilledButton.styleFrom(backgroundColor: cs.error),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  String _formatTime(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }
}

class _RecordingIndicator extends StatefulWidget {
  final Color color;
  const _RecordingIndicator({required this.color});

  @override
  State<_RecordingIndicator> createState() => _RecordingIndicatorState();
}

class _RecordingIndicatorState extends State<_RecordingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _anim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: widget.color.withValues(alpha: 0.1 + 0.2 * _anim.value),
          border: Border.all(color: widget.color, width: 3),
        ),
        child: Icon(Icons.mic, color: widget.color, size: 32),
      ),
    );
  }
}
