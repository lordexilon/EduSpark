import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:material_design_icons_flutter/material_design_icons_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';

import '../app_theme.dart';
import '../widgets/glass_card.dart';
import '../widgets/youtube_player_card.dart';
import '../../services/course_detail_service.dart';

/// Pantalla de detalle de sesión — muestra contenido rico (markdown/HTML),
/// materiales adjuntos y recursos (videos/links) de la sesión.
class SessionDetailScreen extends StatefulWidget {
  final CourseSession session;
  final int courseId;
  final bool isCompleted;

  const SessionDetailScreen({
    super.key,
    required this.session,
    required this.courseId,
    required this.isCompleted,
  });

  @override
  State<SessionDetailScreen> createState() => _SessionDetailScreenState();
}

class _SessionDetailScreenState extends State<SessionDetailScreen> {
  List<CourseMaterial> _materials = [];
  bool _loadingMaterials = true;
  bool _markingComplete = false;

  @override
  void initState() {
    super.initState();
    _loadSessionMaterials();
  }

  Future<void> _loadSessionMaterials() async {
    try {
      final raw = await Supabase.instance.client
          .from('materials')
          .select('id, title, kind, url, unit_id, session_id, category, purpose')
          .eq('session_id', widget.session.id)
          .neq('purpose', 'rag');
      if (mounted) {
        setState(() {
          _materials = (raw as List)
              .map((m) => CourseMaterial.fromMap(m as Map<String, dynamic>))
              .toList();
          _loadingMaterials = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loadingMaterials = false);
    }
  }

  Future<void> _markAsCompleted() async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null || _markingComplete) return;
    setState(() => _markingComplete = true);
    try {
      await Supabase.instance.client.from('session_progress').upsert({
        'student_id': userId,
        'session_id': widget.session.id,
        'course_id': widget.courseId,
        'is_completed': true,
        'completed_at': DateTime.now().toIso8601String(),
      });
      if (mounted) {
        Navigator.pop(context, true); // Retorna true para indicar que se completó
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al marcar: $e'), backgroundColor: Colors.redAccent),
        );
        setState(() => _markingComplete = false);
      }
    }
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir el enlace')),
        );
      }
    }
  }

  // Detectar si una URL es de YouTube
  String? _extractYoutubeId(String url) => YoutubeUtils.extractYoutubeId(url);

  // Extraer thumbnail de YouTube
  String? _youtubeThumbnail(String videoId) =>
      'https://img.youtube.com/vi/$videoId/hqdefault.jpg';

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final hasContent = (session.contentMarkdown?.isNotEmpty == true) ||
        (session.contentHtml?.isNotEmpty == true) ||
        (session.description?.isNotEmpty == true);

    return Scaffold(
      backgroundColor: AppTheme.darkBg,
      body: CustomScrollView(
        slivers: [
          _buildAppBar(session),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Badges e info rápida
                  _buildMetaBadges(session),
                  const SizedBox(height: 20),

                  // Contenido rico (markdown)
                  if (hasContent) ...[
                    _buildSectionHeader('📖 Contenido'),
                    const SizedBox(height: 12),
                    _buildRichContent(session),
                    const SizedBox(height: 28),
                  ],

                  // Recursos adjuntos (videos, links del JSONB resources)
                  if (session.resources.isNotEmpty) ...[
                    _buildSectionHeader('🎬 Recursos'),
                    const SizedBox(height: 12),
                    ...session.resources.map(_buildResourceCard),
                    const SizedBox(height: 28),
                  ],

                  // Materiales de la BD (tabla materials)
                  _buildMaterialsSection(),
                  const SizedBox(height: 28),

                  // Google Meet link
                  if (session.googleMeetLink?.isNotEmpty == true) ...[
                    _buildMeetCard(session.googleMeetLink!),
                    const SizedBox(height: 28),
                  ],

                  // Botón marcar completada
                  if (!widget.isCompleted) _buildCompleteButton(),
                  if (widget.isCompleted) _buildCompletedBadge(),

                  const SizedBox(height: 60),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── APP BAR ──────────────────────────────────────────────────────────────

  Widget _buildAppBar(CourseSession session) => SliverAppBar(
        expandedHeight: 160,
        pinned: true,
        backgroundColor: AppTheme.darkBg,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        flexibleSpace: FlexibleSpaceBar(
          background: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF0D1B4E), AppTheme.primaryBlue, Color(0xFF0F172A)],
              ),
            ),
            // El título SOLO se muestra en el background (expandido)
            // El FlexibleSpaceBar.title aparece pineado cuando se colapsa
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 60, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      session.title,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
          ),
          // Sin 'title' aquí para evitar texto superpuesto cuando está expandido
          collapseMode: CollapseMode.parallax,
        ),
        // Título pineado que aparece SOLO cuando el appbar está colapsado
        title: Text(
          session.title,
          style: const TextStyle(fontSize: 14, color: Colors.white),
          overflow: TextOverflow.ellipsis,
        ),
        titleSpacing: 0,
      );

  // ── META BADGES ───────────────────────────────────────────────────────────

  Widget _buildMetaBadges(CourseSession session) => Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          if (widget.isCompleted)
            _badge('✅ Completada', Colors.greenAccent),
          if (session.durationMinutes != null)
            _badge('⏱ ${session.durationMinutes} min', AppTheme.primaryBlue),
          if (session.resources.isNotEmpty)
            _badge('🎬 ${session.resources.length} recursos', AppTheme.primaryPurple),
          if (!_loadingMaterials && _materials.isNotEmpty)
            _badge('📎 ${_materials.length} materiales', Colors.orangeAccent),
        ],
      ).animate().fadeIn(duration: 400.ms);

  Widget _badge(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: color.withAlpha(30),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withAlpha(80)),
        ),
        child: Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
      );

  // ── SECCIÓN HEADER ────────────────────────────────────────────────────────

  Widget _buildSectionHeader(String title) => Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(child: Divider(color: Colors.white.withAlpha(30))),
        ],
      );

  // ── PARSER DE HTML EN BLOQUES ─────────────────────────────────────────────
  // Extrae bloques de texto, imágenes y videos del HTML manteniéndolos en orden.
  // Tipos de bloque: 'text' | 'image' | 'video'

  // Extrae el atributo src de un tag HTML (soporta comillas dobles y simples)
  String? _extractAttr(String tag, String attr) {
    // primero intentar comilla doble: attr="valor"
    final dq = RegExp('$attr="([^"]*)"', caseSensitive: false).firstMatch(tag);
    if (dq != null) return dq.group(1);
    // luego comilla simple: attr='valor'
    final sq = RegExp("$attr='([^']*)'", caseSensitive: false).firstMatch(tag);
    if (sq != null) return sq.group(1);
    return null;
  }

  List<Map<String, String>> _parseHtmlBlocks(String html) {
    final blocks = <Map<String, String>>[];
    // Hacemos el tag de cierre </iframe> opcional para evitar que videos
    // desaparezcan si el HTML de la base de datos está mal formado.
    final mediaPattern = RegExp(
      r'(<img[^>]+>|<iframe[^>]+>(?:.*?</iframe>)?)',
      caseSensitive: false,
      dotAll: true,
    );

    int lastEnd = 0;
    for (final match in mediaPattern.allMatches(html)) {
      final textBefore = html.substring(lastEnd, match.start);
      if (textBefore.trim().isNotEmpty) {
        blocks.add({'type': 'text', 'content': _htmlToMarkdown(textBefore)});
      }

      final tag = match.group(0)!;

      if (tag.toLowerCase().startsWith('<iframe')) {
        final src = _extractAttr(tag, 'src') ?? '';
        if (src.isNotEmpty) {
          final videoId = YoutubeUtils.extractYoutubeId(src);
          blocks.add({'type': 'video', 'url': src, 'videoId': videoId ?? ''});
        }
      } else if (tag.toLowerCase().startsWith('<img')) {
        final src = _extractAttr(tag, 'src') ?? '';
        if (src.isNotEmpty) {
          blocks.add({
            'type': 'image',
            'url': src,
            'alt': _extractAttr(tag, 'alt') ?? '',
          });
        }
      }

      lastEnd = match.end;
    }

    final remaining = html.substring(lastEnd);
    if (remaining.trim().isNotEmpty) {
      blocks.add({'type': 'text', 'content': _htmlToMarkdown(remaining)});
    }

    return blocks;
  }

  // Convierte fragmento HTML a Markdown (img/iframe ya fueron extraídos por el parser)
  String _htmlToMarkdown(String html) {
    // 1. Convertir links antes de eliminar tags
    final withLinks = html.replaceAllMapped(
      RegExp(r'<a[^>]+href="([^"]+)"[^>]*>([^<]+)</a>', caseSensitive: false),
      (m) => '[${m.group(2)}](${m.group(1)})',
    );

    final result = withLinks
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'<p[^>]*>', caseSensitive: false), '')
        .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n\n')
        .replaceAll(RegExp(r'<li[^>]*>', caseSensitive: false), '• ')
        .replaceAll(RegExp(r'</li>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'<h1[^>]*>', caseSensitive: false), '\n# ')
        .replaceAll(RegExp(r'<h2[^>]*>', caseSensitive: false), '\n## ')
        .replaceAll(RegExp(r'<h3[^>]*>', caseSensitive: false), '\n### ')
        .replaceAll(RegExp(r'<h[4-6][^>]*>', caseSensitive: false), '\n#### ')
        .replaceAll(RegExp(r'</h[1-6]>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'<strong[^>]*>|<b[^>]*>', caseSensitive: false), '**')
        .replaceAll(RegExp(r'</strong>|</b>', caseSensitive: false), '**')
        .replaceAll(RegExp(r'<em[^>]*>|<i[^>]*>', caseSensitive: false), '_')
        .replaceAll(RegExp(r'</em>|</i>', caseSensitive: false), '_')
        .replaceAll(RegExp(r'<[^>]+>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll(RegExp(r'\n{3,}'), '\n\n');

    // 2. Limpiar whitespace al inicio de cada línea (tabs/espacios extra
    //    rompen el reconocimiento de **bold** en Markdown)
    final lines = result.split('\n').map((line) => line.trimLeft()).toList();
    return lines.join('\n').trim();
  }

  // ── RENDERIZADOR DE BLOQUE INDIVIDUAL ─────────────────────────────────────
  Widget _buildHtmlBlock(Map<String, String> block) {
    final type = block['type'] ?? '';

    // ── TEXTO / MARKDOWN ────────────────────────────────────────────────
    if (type == 'text') {
      final content = block['content'] ?? '';
      if (content.isEmpty) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: MarkdownBody(
          data: content,
          selectable: true,
          styleSheet: _markdownStyleSheet(),
          onTapLink: (text, href, title) {
            if (href != null) _openUrl(href);
          },
        ),
      );
    }

    // ── IMAGEN ──────────────────────────────────────────────────────────
    if (type == 'image') {
      final url = block['url'] ?? '';
      final alt = block['alt'] ?? '';
      if (url.isEmpty) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: GestureDetector(
          onTap: () => _openUrl(url),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Image.network(
                  url,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Container(
                    height: 100,
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(10),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.broken_image_outlined, color: Colors.white38, size: 32),
                        SizedBox(height: 8),
                        Text('No se pudo cargar imagen',
                            style: TextStyle(color: Colors.white38, fontSize: 12)),
                      ],
                    ),
                  ),
                  loadingBuilder: (_, child, progress) {
                    if (progress == null) return child;
                    return Container(
                      height: 120,
                      alignment: Alignment.center,
                      child: CircularProgressIndicator(
                        value: progress.expectedTotalBytes != null
                            ? progress.cumulativeBytesLoaded / progress.expectedTotalBytes!
                            : null,
                        color: AppTheme.primaryBlue,
                        strokeWidth: 2,
                      ),
                    );
                  },
                ),
                if (alt.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    color: Colors.black.withAlpha(60),
                    child: Text(
                      alt,
                      style: const TextStyle(color: Colors.white54, fontSize: 11),
                      textAlign: TextAlign.center,
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
    }

    // ── VIDEO (YouTube inline / iframe genérico) ────────────────────────────────
    if (type == 'video') {
      final url = block['url'] ?? '';
      final videoId = block['videoId'] ?? '';
      if (url.isEmpty) return const SizedBox.shrink();

      // YouTube: reproducir inline
      if (videoId.isNotEmpty) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: YoutubePlayerCard(videoId: videoId),
        );
      }

      // No-YouTube: thumbnail + abrir en navegador
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: GestureDetector(
          onTap: () => _openUrl(url),
          child: Container(
            height: 120,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              color: Colors.black54,
              border: Border.all(color: Colors.white.withAlpha(20)),
            ),
            child: const Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.videocam_outlined, color: Colors.white54, size: 32),
                  SizedBox(width: 12),
                  Text('Ver video externo',
                      style: TextStyle(color: Colors.white54, fontSize: 14)),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return const SizedBox.shrink();
  }

  // ── MARKDOWN STYLESHEET CENTRALIZADO ─────────────────────────────────────

  MarkdownStyleSheet _markdownStyleSheet() => MarkdownStyleSheet(
        p: const TextStyle(color: Colors.white, fontSize: 15, height: 1.6),
        h1: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
        h2: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.bold),
        h3: const TextStyle(color: Colors.white70, fontSize: 17, fontWeight: FontWeight.w600),
        h4: const TextStyle(color: Colors.white70, fontSize: 15, fontWeight: FontWeight.w600),
        strong: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        em: const TextStyle(color: Colors.white70, fontStyle: FontStyle.italic),
        listBullet: const TextStyle(color: AppTheme.primaryBlue),
        code: TextStyle(
          color: Colors.greenAccent,
          backgroundColor: Colors.white.withAlpha(13),
          fontFamily: 'monospace',
          fontSize: 13,
        ),
        blockquote: const TextStyle(color: Colors.white60, fontStyle: FontStyle.italic),
        blockquoteDecoration: BoxDecoration(
          border: Border(left: BorderSide(color: AppTheme.primaryBlue, width: 4)),
          color: AppTheme.primaryBlue.withAlpha(20),
        ),
        horizontalRuleDecoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.white.withAlpha(30))),
        ),
        tableHead: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        tableBody: const TextStyle(color: Colors.white70),
        tableBorder: TableBorder.all(color: Colors.white24),
        a: TextStyle(color: AppTheme.primaryBlue, decoration: TextDecoration.underline),
      );

  // ── CONTENIDO RICO (MARKDOWN / HTML con imágenes y videos nativos) ─────────

  Widget _buildRichContent(CourseSession session) {
    // Caso 1: Markdown nativo (fuente preferida)
    if (session.contentMarkdown?.isNotEmpty == true) {
      return GlassCard(
        padding: const EdgeInsets.all(20),
        child: MarkdownBody(
          data: session.contentMarkdown!,
          selectable: true,
          styleSheet: _markdownStyleSheet(),
          onTapLink: (text, href, title) {
            if (href != null) _openUrl(href);
          },
        ),
      ).animate().fadeIn(delay: 150.ms);
    }

    // Caso 2: HTML — parsear en bloques (texto + imágenes + videos)
    if (session.contentHtml?.isNotEmpty == true) {
      final blocks = _parseHtmlBlocks(session.contentHtml!);
      if (blocks.isEmpty) return const SizedBox.shrink();
      return GlassCard(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ...blocks.map(_buildHtmlBlock),
          ],
        ),
      ).animate().fadeIn(delay: 150.ms);
    }

    // Caso 3: Solo descripción de texto plano
    if (session.description?.isNotEmpty == true) {
      return GlassCard(
        padding: const EdgeInsets.all(20),
        child: Text(
          session.description!,
          style: const TextStyle(color: Colors.white, fontSize: 15, height: 1.6),
        ),
      ).animate().fadeIn(delay: 150.ms);
    }

    return const SizedBox.shrink();
  }

  // ── RECURSOS (JSONB del campo resources) ─────────────────────────────────

  Widget _buildResourceCard(Map<String, dynamic> resource) {
    final title = resource['title'] as String? ?? 'Recurso';
    final type = resource['type'] as String? ?? 'link';
    final url = resource['url'] as String? ?? '';

    final youtubeId = url.isNotEmpty ? _extractYoutubeId(url) : null;

    final (icon, color) = switch (type) {
      'video' => (MdiIcons.playCircle, Colors.redAccent),
      'image' => (MdiIcons.image, Colors.blueAccent),
      'document' => (MdiIcons.filePdfBox, Colors.orangeAccent),
      'interactive' => (MdiIcons.gamepadVariant, Colors.purpleAccent),
      _ => (MdiIcons.linkVariant, Colors.tealAccent),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withAlpha(20)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Player inline si es YouTube ───────────────────────────────────
          if (youtubeId != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: YoutubePlayerCard(videoId: youtubeId),
              ),
            )
          // ── Recurso no-video clicable ─────────────────────────────────────
          else if (url.isNotEmpty)
            InkWell(
              onTap: () => _openUrl(url),
              child: Container(
                height: 56,
                color: Colors.white.withAlpha(5),
                alignment: Alignment.center,
                child: const Icon(Icons.open_in_new, color: Colors.white38),
              ),
            ),
          // ── Título e icono ────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(icon, color: color, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                ),
                if (url.isNotEmpty && youtubeId == null)
                  const Icon(Icons.open_in_new, color: Colors.white38, size: 16),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.05);
  }

  // ── MATERIALES DE BD ──────────────────────────────────────────────────────

  Widget _buildMaterialsSection() {
    if (_loadingMaterials) {
      return const Center(child: Padding(
        padding: EdgeInsets.all(16),
        child: CircularProgressIndicator(color: AppTheme.primaryBlue, strokeWidth: 2),
      ));
    }
    if (_materials.isEmpty) return const SizedBox();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('📎 Materiales'),
        const SizedBox(height: 12),
        ..._materials.map(_buildMaterialTile),
      ],
    );
  }

  Widget _buildMaterialTile(CourseMaterial material) {
    final (icon, color) = switch (material.kind) {
      'pdf' => (MdiIcons.filePdfBox, Colors.redAccent),
      'video' => (MdiIcons.playBoxOutline, Colors.blueAccent),
      'link' => (MdiIcons.linkVariant, Colors.tealAccent),
      'markdown' => (MdiIcons.fileDocumentOutline, Colors.white70),
      _ => (MdiIcons.fileOutline, Colors.white54),
    };

    final url = material.url ?? '';
    final youtubeId = url.isNotEmpty ? _extractYoutubeId(url) : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withAlpha(13)),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: url.isNotEmpty ? () => _openUrl(url) : null,
        borderRadius: BorderRadius.circular(14),
        child: Column(
          children: [
            if (youtubeId != null)
              Stack(
                alignment: Alignment.center,
                children: [
                  Image.network(
                    _youtubeThumbnail(youtubeId)!,
                    height: 160,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox(),
                  ),
                  Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    child: const Icon(Icons.play_arrow, color: Colors.white, size: 28),
                  ),
                ],
              ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withAlpha(30),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              title: Text(material.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
              subtitle: material.category != null
                  ? Text(material.category!, style: const TextStyle(fontSize: 11, color: Colors.white38))
                  : null,
              trailing: url.isNotEmpty
                  ? const Icon(Icons.open_in_new, color: Colors.white24, size: 16)
                  : null,
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 100.ms);
  }

  // ── GOOGLE MEET ───────────────────────────────────────────────────────────

  Widget _buildMeetCard(String link) => GlassCard(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(MdiIcons.videoOutline, color: Colors.greenAccent, size: 32),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Clase en vivo',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  Text('Sesión de Google Meet disponible',
                      style: TextStyle(color: Colors.white54, fontSize: 12)),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: () => _openUrl(link),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.greenAccent,
                foregroundColor: Colors.black,
              ),
              child: const Text('Unirse', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ).animate().fadeIn(delay: 300.ms);

  // ── BOTÓN COMPLETAR ───────────────────────────────────────────────────────

  Widget _buildCompleteButton() => SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton.icon(
          onPressed: _markingComplete ? null : _markAsCompleted,
          icon: _markingComplete
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.check_circle_outline, size: 20),
          label: Text(_markingComplete ? 'Guardando...' : 'Marcar como completada'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.greenAccent,
            foregroundColor: Colors.black,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
        ),
      ).animate().fadeIn(delay: 400.ms);

  Widget _buildCompletedBadge() => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.greenAccent.withAlpha(20),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.greenAccent.withAlpha(80)),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle, color: Colors.greenAccent),
            SizedBox(width: 8),
            Text('Sesión completada 🎉',
                style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 15)),
          ],
        ),
      ).animate().fadeIn(delay: 400.ms);
}
