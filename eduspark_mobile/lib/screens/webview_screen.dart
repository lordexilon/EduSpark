import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/auth_service.dart';

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    
    // Obtenemos la sesión actual completa de Supabase
    final session = Supabase.instance.client.auth.currentSession;

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            // Update loading bar.
          },
          onPageStarted: (String url) {
            setState(() => _isLoading = true);
          },
          onPageFinished: (String url) {
            setState(() => _isLoading = false);
            if (session != null) {
              _injectAuthSession(session);
            }
          },
          onWebResourceError: (WebResourceError error) {},
        ),
      )
      ..loadRequest(Uri.parse('https://eduspark-frontend-151821961684.us-central1.run.app/mobile'));
  }

  // Puente de Autenticación: Inyectamos la sesión COMPLETA en localStorage
  void _injectAuthSession(Session session) {
    try {
      // Serializamos la sesión completa a JSON tal cual la espera Supabase
      final sessionJson = jsonEncode(session.toJson());
      
      // El key debe coincidir EXACTAMENTE con lo que Supabase espera
      final js = """
        (function() {
          const key = 'sb-mckfscukxcqwntpjagar-auth-token';
          const newSession = $sessionJson;
          
          try {
            const existing = localStorage.getItem(key);
            if (existing) {
              const parsed = JSON.parse(existing);
              // Si el token de acceso es el mismo, no hacemos nada para evitar recargas
              if (parsed.access_token === newSession.access_token) {
                console.log('Mobile Bridge: Sesión ya sincronizada.');
                return;
              }
            }
            
            console.log('Mobile Bridge: Inyectando nueva sesión...');
            localStorage.setItem(key, JSON.stringify(newSession));
            
            // Forzamos recarga para que el cliente de Supabase (JS) lea el nuevo token del storage
            window.location.reload();
          } catch (e) {
            console.error('Mobile Bridge Error:', e);
            // En caso de error, intentamos escribir y recargar de todas formas
            localStorage.setItem(key, JSON.stringify(newSession));
            window.location.reload();
          }
        })();
      """;
      _controller.runJavaScript(js);
    } catch (e) {
      debugPrint('Error inyectando sesión: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('EduSpark'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
               // Limpiamos sesión nativa y del webview
               await AuthService.signOut();
               _controller.clearCache();
               _controller.clearLocalStorage();
            },
          )
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(child: CircularProgressIndicator()),
        ],
      ),
    );
  }
}
