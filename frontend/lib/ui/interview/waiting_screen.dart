import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/routes.dart';
import '../../state/interview_state.dart';
import '../../state/report_state.dart';

class WaitingScreen extends StatefulWidget {
  const WaitingScreen({super.key});

  @override
  State<WaitingScreen> createState() => _WaitingScreenState();
}

class _WaitingScreenState extends State<WaitingScreen> {
  bool _submitted = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _submitAndPoll());
  }

  Future<void> _submitAndPoll() async {
    if (_submitted) return;
    _submitted = true;

    final interview = context.read<InterviewState>();
    final reportState = context.read<ReportStateProvider>();

    if (interview.answerIds.isEmpty) {
      if (mounted) context.go(AppRoutes.dashboard);
      return;
    }

    final reportId = await reportState.submitBatch(interview.answerIds);
    if (reportId == null || !mounted) return;

    reportState.startPolling(reportId, onDone: () {
      if (mounted) context.go(AppRoutes.report, extra: reportId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final state = context.watch<ReportStateProvider>();

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

    return Scaffold(
      body: Center(
        child: Padding(
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
            ],
          ),
        ),
      ),
    );
  }
}
