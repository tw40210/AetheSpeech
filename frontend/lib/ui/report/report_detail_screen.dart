import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/routes.dart';
import '../../models/report.dart';
import '../../state/interview_state.dart';
import '../../state/report_state.dart';
import 'widgets/labeled_text.dart';

class ReportDetailScreen extends StatefulWidget {
  final String reportId;

  const ReportDetailScreen({super.key, required this.reportId});

  @override
  State<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends State<ReportDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ReportStateProvider>().loadReport(widget.reportId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<ReportStateProvider>();
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Assessment Report'),
        actions: [
          IconButton(
            icon: const Icon(Icons.home),
            onPressed: () {
              context.read<InterviewState>().reset();
              context.read<ReportStateProvider>().reset();
              context.go(AppRoutes.dashboard);
            },
          )
        ],
      ),
      body: switch (state.fetchState) {
        ReportFetchState.idle ||
        ReportFetchState.submitting ||
        ReportFetchState.polling =>
          const Center(child: CircularProgressIndicator()),
        ReportFetchState.error => Center(
            child: Text(
              state.error ?? 'Failed to load report',
              style: TextStyle(color: cs.error),
            ),
          ),
        ReportFetchState.done => _ReportBody(report: state.report!),
      },
    );
  }
}

class _ReportBody extends StatelessWidget {
  final Report report;

  const _ReportBody({required this.report});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: report.assessments.length + 1,
      child: Column(
        children: [
          TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              const Tab(text: 'Overview'),
              ...report.assessments.asMap().entries.map(
                    (e) => Tab(text: 'Q${e.key + 1}'),
                  ),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _OverviewTab(suggestions: report.suggestions),
                ...report.assessments.map(
                  (a) => _AssessmentTab(assessment: a),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OverviewTab extends StatelessWidget {
  final String? suggestions;

  const _OverviewTab({this.suggestions});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            color: cs.primaryContainer,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.auto_awesome, color: cs.onPrimaryContainer),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'AI Coaching Suggestions',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: cs.onPrimaryContainer,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            suggestions ?? 'No suggestions available.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

class _AssessmentTab extends StatelessWidget {
  final AnswerAssessment assessment;

  const _AssessmentTab({required this.assessment});

  // Stub labels — in production derive from topic stored in report
  static const _fallbackLabels = <Map<String, String>>[
    {'key': 'WWAD', 'name': 'What we are doing'},
    {'key': 'WWSDI', 'name': 'Why we should do it'},
    {'key': 'WWHD', 'name': 'What we have done'},
    {'key': 'NS', 'name': 'Next step'},
    {'key': 'PROBLEM', 'name': 'Problem statement'},
    {'key': 'SOLUTION', 'name': 'Proposed solution'},
    {'key': 'VALUE', 'name': 'Value proposition'},
    {'key': 'PLAN', 'name': 'Execution plan'},
    {'key': 'BACKGROUND', 'name': 'Professional background'},
    {'key': 'SKILLS', 'name': 'Key skills'},
    {'key': 'ACHIEVEMENT', 'name': 'Notable achievements'},
    {'key': 'GOAL', 'name': 'Future goals'},
  ];

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(text: 'Raw'),
              Tab(text: 'Labeled'),
              Tab(text: 'Recommended'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _TextPane(
                  text: assessment.rawTranscript,
                  emptyLabel: 'No transcript available',
                ),
                _LabeledPane(
                  xmlText: assessment.labeledTranscript,
                  labels: _fallbackLabels,
                ),
                _LabeledPane(
                  xmlText: assessment.rephrasedTranscript,
                  labels: _fallbackLabels,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TextPane extends StatelessWidget {
  final String? text;
  final String emptyLabel;

  const _TextPane({this.text, required this.emptyLabel});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (text == null || text!.isEmpty) {
      return Center(
          child: Text(emptyLabel, style: TextStyle(color: cs.outline)));
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Text(text!),
    );
  }
}

class _LabeledPane extends StatelessWidget {
  final String? xmlText;
  final List<Map<String, String>> labels;

  const _LabeledPane({this.xmlText, required this.labels});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (xmlText == null || xmlText!.isEmpty) {
      return Center(
          child: Text('No labeled text', style: TextStyle(color: cs.outline)));
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: LabeledTextWidget(xmlText: xmlText!, labels: labels),
    );
  }
}
