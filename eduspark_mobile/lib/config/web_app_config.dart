/// URL base del front web (Vite / Cloud Run). Override en build:
/// `flutter run --dart-define=EDUSPARK_WEB_URL=https://tu-dominio.com`
class WebAppConfig {
  WebAppConfig._();

  static const String baseUrl = String.fromEnvironment(
    'EDUSPARK_WEB_URL',
    defaultValue: 'https://eduspark-frontend-151821961684.us-central1.run.app',
  );

  /// [path] debe ser `/teacher/dashboard`, `/mobile`, etc.
  static Uri uriForPath(String path) {
    final base = baseUrl.replaceAll(RegExp(r'/$'), '');
    final p = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$base$p');
  }
}
