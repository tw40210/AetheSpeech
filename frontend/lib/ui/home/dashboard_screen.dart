import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../core/routes.dart';
import '../../models/topic.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../state/interview_state.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<Topic>? _topics;
  bool _loading = true;
  String? _error;
  Topic? _selected;

  @override
  void initState() {
    super.initState();
    _loadTopics();
  }

  Future<void> _loadTopics() async {
    try {
      final api = context.read<ApiClient>();
      final data = await api.get('/topics') as List<dynamic>;
      if (mounted) {
        setState(() {
          _topics = data
              .map((t) => Topic.fromJson(t as Map<String, dynamic>))
              .toList();
          _loading = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() { _error = e.message; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _startInterview() async {
    if (_selected == null) return;
    final interview = context.read<InterviewState>();
    interview.setTopic(_selected!);
    await interview.loadQuestions(
      _selected!.id,
      AppConstants.questionsPerSession,
    );

    if (!mounted) return;
    if (interview.questions.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No questions available for this topic')),
      );
      return;
    }

    context.go(
      AppRoutes.preparation,
      extra: {
        'question': interview.currentQuestion!,
        'questionNumber': 1,
        'totalQuestions': interview.questions.length,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('AetheSpeech'),
        actions: [
          IconButton(
            icon: const Icon(Icons.mic_external_on_rounded),
            onPressed: () => context.push(AppRoutes.deviceTest),
            tooltip: 'Test Device',
          ),
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () => context.push(AppRoutes.history),
            tooltip: 'History',
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await auth.logout();
              if (context.mounted) context.go(AppRoutes.auth);
            },
            tooltip: 'Logout',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, style: TextStyle(color: cs.error)),
                      TextButton(
                          onPressed: _loadTopics,
                          child: const Text('Retry')),
                    ],
                  ))
              : Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Welcome${auth.email != null ? ", ${auth.email!.split("@")[0]}" : ""}!',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Select a topic to practise',
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(color: cs.outline),
                      ),
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: () => context.push(AppRoutes.deviceTest),
                        icon: const Icon(Icons.mic_external_on_rounded),
                        label: const Text('Test your microphone'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(44),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: ListView.separated(
                          itemCount: _topics!.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (_, i) {
                            final t = _topics![i];
                            final isSelected = _selected?.id == t.id;
                            return _TopicCard(
                              topic: t,
                              selected: isSelected,
                              onTap: () =>
                                  setState(() => _selected = isSelected ? null : t),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        onPressed: _selected == null ? null : _startInterview,
                        icon: const Icon(Icons.play_arrow_rounded),
                        label: const Text('Start Interview'),
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _TopicCard extends StatelessWidget {
  final Topic topic;
  final bool selected;
  final VoidCallback onTap;

  const _TopicCard({
    required this.topic,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? cs.primary : cs.outlineVariant,
            width: selected ? 2 : 1,
          ),
          color: selected
              ? cs.primaryContainer.withValues(alpha: 0.3)
              : cs.surface,
        ),
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              Icons.topic_outlined,
              color: selected ? cs.primary : cs.onSurfaceVariant,
              size: 32,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    topic.name,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: selected ? cs.primary : null,
                        ),
                  ),
                  if (topic.description != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      topic.description!,
                      style: Theme.of(context).textTheme.bodySmall,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    children: topic.labels
                        .map((l) => Chip(
                              label: Text(l.key,
                                  style: const TextStyle(fontSize: 11)),
                              materialTapTargetSize:
                                  MaterialTapTargetSize.shrinkWrap,
                              visualDensity: VisualDensity.compact,
                              padding: EdgeInsets.zero,
                            ))
                        .toList(),
                  ),
                ],
              ),
            ),
            if (selected)
              Icon(Icons.check_circle_rounded, color: cs.primary),
          ],
        ),
      ),
    );
  }
}
