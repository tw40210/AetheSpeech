import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/routes.dart';
import '../../state/report_state.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ReportStateProvider>().loadHistory();
    });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final state = context.watch<ReportStateProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Interview History')),
      body: state.history.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.history, size: 64, color: cs.outlineVariant),
                  const SizedBox(height: 16),
                  Text(
                    'No interviews yet',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Complete your first interview to see reports here.',
                    style: TextStyle(color: cs.outline),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: state.history.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final r = state.history[i];
                final color = r.status == 'done'
                    ? cs.primary
                    : r.status == 'failed'
                        ? cs.error
                        : cs.outline;
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: color.withValues(alpha: 0.15),
                      child: Icon(
                        r.status == 'done'
                            ? Icons.check_circle_outline
                            : r.status == 'failed'
                                ? Icons.error_outline
                                : Icons.hourglass_empty,
                        color: color,
                      ),
                    ),
                    title: Text(
                      '${r.answerCount} Questions',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      '${_formatDate(r.createdAt)} · ${r.status.toUpperCase()}',
                      style: TextStyle(fontSize: 12, color: cs.outline),
                    ),
                    trailing: r.status == 'done'
                        ? const Icon(Icons.chevron_right)
                        : null,
                    onTap: r.status == 'done'
                        ? () => context.push(AppRoutes.report, extra: r.id)
                        : null,
                  ),
                );
              },
            ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}-${_pad(dt.month)}-${_pad(dt.day)} '
        '${_pad(dt.hour)}:${_pad(dt.minute)}';
  }

  String _pad(int n) => n.toString().padLeft(2, '0');
}
