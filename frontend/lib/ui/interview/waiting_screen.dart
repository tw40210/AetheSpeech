import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/routes.dart';
import '../../models/report.dart';
import '../../state/interview_state.dart';
import '../../state/report_state.dart';

class WaitingScreen extends StatefulWidget {
  const WaitingScreen({super.key});

  @override
  State<WaitingScreen> createState() => _WaitingScreenState();
}

class _WaitingScreenState extends State<WaitingScreen> {
  bool _submitted = false;

  // assessmentId → time when we first detected done/failed
  final Map<String, DateTime> _doneAt = {};

  // Timestamps for the report-generation phase
  DateTime? _reportStartedAt;
  DateTime? _reportFinishedAt;

  late ReportStateProvider _reportState;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _reportState = context.read<ReportStateProvider>();
      _reportState.addListener(_onReportChanged);
      _submitAndPoll();
    });
  }

  @override
  void dispose() {
    _reportState.removeListener(_onReportChanged);
    super.dispose();
  }

  void _onReportChanged() {
    bool changed = false;

    for (final a in _reportState.liveAssessments) {
      if ((a.status == 'done' || a.status == 'failed') &&
          !_doneAt.containsKey(a.id)) {
        _doneAt[a.id] = DateTime.now();
        changed = true;
      }
    }

    // Stamp report-generation start the moment all answers become terminal.
    final questions = context.read<InterviewState>().questions;
    final allAnswersTerminal = questions.isNotEmpty &&
        questions.every((q) {
          final byId = {
            for (final a in _reportState.liveAssessments)
              if (a.questionId != null) a.questionId!: a,
          };
          final a = byId[q.id];
          return a != null && (a.status == 'done' || a.status == 'failed');
        });

    if (allAnswersTerminal && _reportStartedAt == null) {
      _reportStartedAt = DateTime.now();
      changed = true;
    }

    final status = _reportState.liveReportStatus;
    if ((status == 'done' || status == 'failed') && _reportFinishedAt == null) {
      _reportFinishedAt = DateTime.now();
      changed = true;
    }

    if (changed && mounted) setState(() {});
  }

  Future<void> _submitAndPoll() async {
    if (_submitted) return;
    _submitted = true;

    final interview = context.read<InterviewState>();

    if (interview.answerIds.isEmpty) {
      if (mounted) context.go(AppRoutes.dashboard);
      return;
    }

    final reportId = await _reportState.submitBatch(interview.answerIds);
    if (reportId == null || !mounted) return;

    _reportState.startPolling(reportId, onDone: () {
      if (mounted) context.go(AppRoutes.report, extra: reportId);
    });
  }

  String _formatDuration(Duration d) {
    final secs = d.inSeconds.abs();
    if (secs < 60) return '${secs}s';
    return '${d.inMinutes}m ${secs % 60}s';
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final state = context.watch<ReportStateProvider>();
    final questions = context.watch<InterviewState>().questions;

    if (state.fetchState == ReportFetchState.error) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.error_outline, size: 64, color: cs.error),
                const SizedBox(height: 16),
                Text(
                  'Something went wrong',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  state.error ?? 'Unknown error',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: cs.outline),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => context.go(AppRoutes.dashboard),
                  child: const Text('Back to Home'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Build lookup: questionId → assessment
    final byQuestionId = <String, AnswerAssessment>{
      for (final a in state.liveAssessments)
        if (a.questionId != null) a.questionId!: a,
    };

    // Derive report-generation phase indicators
    final allAnswersTerminal = questions.isNotEmpty &&
        questions.every((q) {
          final a = byQuestionId[q.id];
          return a != null && (a.status == 'done' || a.status == 'failed');
        });

    final reportStatus = state.liveReportStatus;
    final isReportDone = reportStatus == 'done';
    final isReportFailed = reportStatus == 'failed';
    final isReportTerminal = isReportDone || isReportFailed;

    String reportTimeLabel = '';
    if (isReportTerminal && _reportStartedAt != null && _reportFinishedAt != null) {
      reportTimeLabel = _formatDuration(
        _reportFinishedAt!.difference(_reportStartedAt!),
      );
    }

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SpinKitFadingCircle(color: cs.primary, size: 80),
              const SizedBox(height: 32),
              Text(
                'Analysing your answers…',
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'AI is transcribing your speech, labeling key points, '
                'and preparing personalised feedback.',
                textAlign: TextAlign.center,
                style: TextStyle(color: cs.outline),
              ),

              // Per-question progress list
              if (questions.isNotEmpty) ...[
                const SizedBox(height: 28),
                Card(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: cs.outlineVariant),
                  ),
                  elevation: 0,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ASSESSMENT PROGRESS',
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: cs.outline,
                                letterSpacing: 1.2,
                              ),
                        ),
                        const SizedBox(height: 12),
                        ...List.generate(questions.length, (i) {
                          final q = questions[i];
                          final assessment = byQuestionId[q.id];
                          final isDone = assessment?.status == 'done';
                          final isFailed = assessment?.status == 'failed';
                          final isCompleted = isDone || isFailed;

                          String timeLabel = '';
                          if (isCompleted && assessment != null) {
                            final doneAt = _doneAt[assessment.id];
                            if (doneAt != null) {
                              final elapsed = doneAt.difference(assessment.createdAt);
                              timeLabel = _formatDuration(elapsed);
                            }
                          }

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Status indicator
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: isCompleted
                                      ? Icon(
                                          isDone
                                              ? Icons.check_circle
                                              : Icons.highlight_off,
                                          size: 18,
                                          color: isDone ? Colors.green : cs.error,
                                        )
                                      : const _PulsingDot(),
                                ),
                                const SizedBox(width: 12),

                                // Question text + timing
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text.rich(
                                        TextSpan(
                                          children: [
                                            TextSpan(
                                              text: 'Q${i + 1}. ',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w700,
                                                color: cs.onSurface,
                                              ),
                                            ),
                                            TextSpan(
                                              text: q.text,
                                              style: TextStyle(
                                                color: isCompleted
                                                    ? cs.onSurface
                                                    : cs.outline,
                                              ),
                                            ),
                                          ],
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      if (isCompleted && timeLabel.isNotEmpty)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 2),
                                          child: Text(
                                            'Processed in $timeLabel',
                                            style:
                                                Theme.of(context).textTheme.labelSmall?.copyWith(
                                                      color: isDone ? Colors.green : cs.error,
                                                    ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),

                        // ── Report-generation row ─────────────────────────────
                        Divider(color: cs.outlineVariant, height: 1),
                        const SizedBox(height: 12),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: isReportTerminal
                                  ? Icon(
                                      isReportDone
                                          ? Icons.check_circle
                                          : Icons.highlight_off,
                                      size: 18,
                                      color: isReportDone ? Colors.green : cs.error,
                                    )
                                  : allAnswersTerminal
                                      ? const _PulsingDot()
                                      : Container(
                                          width: 12,
                                          height: 12,
                                          decoration: BoxDecoration(
                                            color: cs.surfaceContainerHighest,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.auto_awesome,
                                        size: 16,
                                        color: isReportDone
                                            ? Colors.green
                                            : isReportFailed
                                                ? cs.error
                                                : allAnswersTerminal
                                                    ? Colors.amber
                                                    : cs.outline,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Generating personalised feedback',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w700,
                                          color: (isReportTerminal || allAnswersTerminal)
                                              ? cs.onSurface
                                              : cs.outline,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(
                                      isReportDone
                                          ? 'Ready in $reportTimeLabel'
                                          : isReportFailed
                                              ? 'Failed to generate suggestions'
                                              : allAnswersTerminal
                                                  ? 'Synthesising AI coaching suggestions…'
                                                  : 'Starts after all answers are processed',
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelSmall
                                          ?.copyWith(
                                            color: isReportDone
                                                ? Colors.green
                                                : isReportFailed
                                                    ? cs.error
                                                    : cs.outline,
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── Pulsing yellow dot ────────────────────────────────────────────────────────

class _PulsingDot extends StatefulWidget {
  const _PulsingDot();

  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 18,
      height: 18,
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (context, _) {
          return Stack(
            alignment: Alignment.center,
            children: [
              // Ping ring: scales up and fades out
              Transform.scale(
                scale: 1.0 + _ctrl.value * 1.6,
                child: Opacity(
                  opacity: (1.0 - _ctrl.value).clamp(0.0, 1.0),
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(
                      color: Colors.amber,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
              // Solid center dot
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Colors.amber,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
