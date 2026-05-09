import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../core/routes.dart';
import '../../models/question.dart';
import '../../state/interview_state.dart';

class PreparationScreen extends StatefulWidget {
  final Question question;
  final int questionNumber;
  final int totalQuestions;

  const PreparationScreen({
    super.key,
    required this.question,
    required this.questionNumber,
    required this.totalQuestions,
  });

  @override
  State<PreparationScreen> createState() => _PreparationScreenState();
}

class _PreparationScreenState extends State<PreparationScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InterviewState>().startPreparation(
            AppConstants.prepTimeSeconds,
            _onPrepDone,
          );
    });
  }

  void _onPrepDone() {
    if (!mounted) return;
    context.go(
      AppRoutes.recording,
      extra: {
        'question': widget.question,
        'questionNumber': widget.questionNumber,
        'totalQuestions': widget.totalQuestions,
      },
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
            // Progress bar
            LinearProgressIndicator(
              value: widget.questionNumber / widget.totalQuestions,
              borderRadius: BorderRadius.circular(8),
            ),
            const SizedBox(height: 32),
            Card(
              color: cs.primaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.help_outline, color: cs.onPrimaryContainer),
                        const SizedBox(width: 8),
                        Text(
                          'Question',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: cs.onPrimaryContainer,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      widget.question.text,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: cs.onPrimaryContainer,
                          ),
                    ),
                    if (widget.question.context != null) ...[
                      const SizedBox(height: 12),
                      Divider(color: cs.onPrimaryContainer.withValues(alpha: 0.3)),
                      const SizedBox(height: 8),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.info_outline,
                              size: 16,
                              color: cs.onPrimaryContainer.withValues(alpha: 0.7)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              widget.question.context!,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: cs.onPrimaryContainer
                                        .withValues(alpha: 0.8),
                                  ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const Spacer(),
            Text(
              'Preparation time',
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: cs.outline),
            ),
            const SizedBox(height: 16),
            Center(
              child: _CountdownRing(
                remaining: state.remainingSeconds,
                total: AppConstants.prepTimeSeconds,
                color: cs.primary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Recording will start automatically',
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: cs.outline),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

class _CountdownRing extends StatelessWidget {
  final int remaining;
  final int total;
  final Color color;

  const _CountdownRing({
    required this.remaining,
    required this.total,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final progress = total > 0 ? remaining / total : 0.0;
    return SizedBox(
      width: 140,
      height: 140,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: progress,
            strokeWidth: 8,
            backgroundColor: color.withValues(alpha: 0.15),
            color: color,
          ),
          Text(
            '$remaining',
            style: Theme.of(context)
                .textTheme
                .displaySmall
                ?.copyWith(fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }
}
