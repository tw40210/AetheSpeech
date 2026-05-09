import 'package:flutter/material.dart';

class AppTheme {
  static const _seedColor = Color(0xFF5C6BC0); // Indigo-ish

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _seedColor,
          brightness: Brightness.light,
        ),
        appBarTheme: const AppBarTheme(centerTitle: true, elevation: 0),
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          filled: true,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      );

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _seedColor,
          brightness: Brightness.dark,
        ),
        appBarTheme: const AppBarTheme(centerTitle: true, elevation: 0),
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      );

  // Label tag colors for XML-labeled text
  static const Map<String, Color> labelColors = {
    // Business Report
    'WWAD': Color(0xFF1976D2),   // Blue
    'WWSDI': Color(0xFF388E3C), // Green
    'WWHD': Color(0xFFF57C00),  // Orange
    'NS': Color(0xFF7B1FA2),    // Purple
    // Product Pitch
    'PROBLEM': Color(0xFFD32F2F), // Red
    'SOLUTION': Color(0xFF0288D1), // Light blue
    'VALUE': Color(0xFF00796B),   // Teal
    'PLAN': Color(0xFFC2185B),    // Pink
    // Self Intro
    'BACKGROUND': Color(0xFF5D4037), // Brown
    'SKILLS': Color(0xFF00897B),    // Teal
    'ACHIEVEMENT': Color(0xFFE64A19), // Deep orange
    'GOAL': Color(0xFF1565C0),     // Dark blue
  };

  static Color labelColor(String key) =>
      labelColors[key] ?? const Color(0xFF616161);
}
