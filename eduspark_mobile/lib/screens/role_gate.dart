import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import '../native_v2/screens/dashboard_screen.dart';
import 'webview_screen.dart';
import '../services/data_service.dart';

/// Estudiantes: dashboard nativo v2. Docentes y demás roles: app web completa en WebView
/// (tablets/celular — mismo comportamiento que el navegador).
/// En Flutter Web siempre se usa DashboardScreen (WebView no disponible en web).
class RoleGate extends StatefulWidget {
  const RoleGate({super.key});

  @override
  State<RoleGate> createState() => _RoleGateState();
}

class _RoleGateState extends State<RoleGate> {
  bool _loading = true;
  bool _useTeacherWeb = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    // En Flutter Web: WebViewScreen no está soportado, siempre dashboard nativo
    if (kIsWeb) {
      if (mounted) setState(() => _loading = false);
      return;
    }

    try {
      final profile = await DataService.getCurrentUserProfile();
      final roles = profile?['roles'];
      String? name;
      if (roles is Map<String, dynamic>) {
        name = roles['name'] as String?;
      } else if (roles is List && roles.isNotEmpty) {
        final first = roles.first;
        if (first is Map<String, dynamic>) {
          name = first['name'] as String?;
        }
      }
      final isStudent = name == null || name == 'student';
      if (mounted) {
        setState(() {
          _useTeacherWeb = !isStudent;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _useTeacherWeb = false;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    // En web: siempre DashboardScreen (WebView no disponible)
    if (!kIsWeb && _useTeacherWeb) {
      return const WebViewScreen(
        initialPath: '/teacher/dashboard',
        title: 'Panel docente',
      );
    }
    return const DashboardScreen();
  }
}
