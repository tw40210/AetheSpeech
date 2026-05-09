import 'package:go_router/go_router.dart';

import '../ui/auth/auth_screen.dart';
import '../ui/home/dashboard_screen.dart';
import '../ui/home/history_screen.dart';
import '../ui/interview/preparation_screen.dart';
import '../ui/interview/recording_screen.dart';
import '../ui/interview/waiting_screen.dart';
import '../ui/report/report_detail_screen.dart';
import '../models/question.dart';

class AppRoutes {
  static const auth = '/';
  static const dashboard = '/dashboard';
  static const history = '/history';
  static const preparation = '/interview/prepare';
  static const recording = '/interview/record';
  static const waiting = '/interview/wait';
  static const report = '/report';

  static final router = GoRouter(
    initialLocation: auth,
    routes: [
      GoRoute(
        path: auth,
        builder: (_, __) => const AuthScreen(),
      ),
      GoRoute(
        path: dashboard,
        builder: (_, __) => const DashboardScreen(),
      ),
      GoRoute(
        path: history,
        builder: (_, __) => const HistoryScreen(),
      ),
      GoRoute(
        path: preparation,
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>;
          return PreparationScreen(
            question: extra['question'] as Question,
            questionNumber: extra['questionNumber'] as int,
            totalQuestions: extra['totalQuestions'] as int,
          );
        },
      ),
      GoRoute(
        path: recording,
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>;
          return RecordingScreen(
            question: extra['question'] as Question,
            questionNumber: extra['questionNumber'] as int,
            totalQuestions: extra['totalQuestions'] as int,
          );
        },
      ),
      GoRoute(
        path: waiting,
        builder: (_, __) => const WaitingScreen(),
      ),
      GoRoute(
        path: report,
        builder: (context, state) {
          final reportId = state.extra as String;
          return ReportDetailScreen(reportId: reportId);
        },
      ),
    ],
  );
}
