import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/routes.dart';
import 'core/theme.dart';
import 'services/api_client.dart';
import 'services/audio_service.dart';
import 'services/auth_service.dart';
import 'state/interview_state.dart';
import 'state/report_state.dart';

void main() {
  runApp(const AetheSpeechApp());
}

class AetheSpeechApp extends StatefulWidget {
  const AetheSpeechApp({super.key});

  @override
  State<AetheSpeechApp> createState() => _AetheSpeechAppState();
}

class _AetheSpeechAppState extends State<AetheSpeechApp> {
  late final ApiClient _apiClient;
  late final AuthService _authService;

  @override
  void initState() {
    super.initState();
    _apiClient = ApiClient();
    _authService = AuthService(_apiClient);
    // Sync token whenever auth state changes
    _authService.addListener(() => _apiClient.setToken(_authService.token));
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: _apiClient),
        ChangeNotifierProvider<AuthService>.value(value: _authService),
        ChangeNotifierProvider(
          create: (_) => InterviewState(_apiClient, AudioService()),
        ),
        ChangeNotifierProvider(
          create: (_) => ReportStateProvider(_apiClient),
        ),
      ],
      child: MaterialApp.router(
        title: 'AetheSpeech',
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        routerConfig: AppRoutes.router,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
