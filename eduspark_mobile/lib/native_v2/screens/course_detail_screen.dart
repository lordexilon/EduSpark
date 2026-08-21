import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:material_design_icons_flutter/material_design_icons_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app_theme.dart';
import '../widgets/glass_card.dart';
import '../widgets/youtube_player_card.dart';
import '../../services/course_detail_service.dart';
import 'session_detail_screen.dart';

/// Pantalla nativa de detalle de curso — replica CourseViewPage.tsx
/// con UX móvil premium y datos reales de Supabase.
class CourseDetailScreen extends StatefulWidget {
  final int courseId;
  final String courseTitle;

  const CourseDetailScreen({
    super.key,
    required this.courseId,
    required this.courseTitle,
  });

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  CourseDetailData? _data;
  bool _isLoading = true;
  String? _error;

  // Estado local de expansión de unidades
  final Set<String> _expandedUnits = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) throw Exception('Usuario no autenticado');
      final data = await CourseDetailService.loadCourse(widget.courseId, userId);
      // Pre-expandir la primera unidad incompleta
      if (data.units.isNotEmpty) {
        final firstPending = data.units.firstWhere(
          (u) => !data.completedUnitIds.contains(u.id),
          orElse: () => data.units.first,
        );
        _expandedUnits.add(firstPending.id);
      }
      if (mounted) setState(() { _data = data; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  // ── Lógica de disponibilidad (idéntica a CourseViewPage.tsx) ─────────────

  bool _isUnitAvailable(CourseUnit unit) {
    final data = _data!;
    final now = DateTime.now();

    if (unit.availableFrom != null && unit.availableUntil != null) {
      return now.isAfter(DateTime.parse(unit.availableFrom!)) &&
          now.isBefore(DateTime.parse(unit.availableUntil!));
    }
    if (unit.availableFrom != null) return now.isAfter(DateTime.parse(unit.availableFrom!));
    if (unit.availableUntil != null) return now.isBefore(DateTime.parse(unit.availableUntil!));

    // Fechas del curso como fallback
    if (data.course.startDate != null && data.course.endDate != null) {
      final today = DateUtils.dateOnly(now);
      final start = DateUtils.dateOnly(DateTime.parse(data.course.startDate!));
      final end = DateUtils.dateOnly(DateTime.parse(data.course.endDate!));
      if (today.isBefore(start) || today.isAfter(end)) return false;
    }

    // Progresión: unidades anteriores deben estar completadas
    final ordered = List<CourseUnit>.from(data.units)
      ..sort((a, b) {
        final na = a.number ?? 0, nb = b.number ?? 0;
        if (na != nb) return na.compareTo(nb);
        return (a.orderIndex ?? 0).compareTo(b.orderIndex ?? 0);
      });
    final myIndex = ordered.indexWhere((u) => u.id == unit.id);
    if (myIndex > 0) {
      for (int i = 0; i < myIndex; i++) {
        if (!data.completedUnitIds.contains(ordered[i].id)) return false;
      }
    }
    return true;
  }

  bool _isSessionAvailable(CourseSession session) {
    final data = _data!;
    final now = DateTime.now();

    // Si la unidad padre está bloqueada, la sesión también lo está
    if (session.unitId != null) {
      final parent = data.units.where((u) => u.id == session.unitId).firstOrNull;
      if (parent != null && !_isUnitAvailable(parent)) return false;
    }

    // Fechas explícitas toman precedencia
    if (session.availableFrom != null && session.availableUntil != null) {
      return now.isAfter(DateTime.parse(session.availableFrom!)) &&
          now.isBefore(DateTime.parse(session.availableUntil!));
    }
    if (session.availableFrom != null) return now.isAfter(DateTime.parse(session.availableFrom!));
    if (session.availableUntil != null) return now.isBefore(DateTime.parse(session.availableUntil!));

    // Sin fechas explícitas: la sesión está disponible si la unidad lo está
    return true;
  }

  bool _isQuizAvailable(CourseAssessment quiz) {
    final data = _data!;
    final now = DateTime.now();

    if (quiz.availableFrom != null && quiz.availableUntil != null) {
      final ok = now.isAfter(DateTime.parse(quiz.availableFrom!)) &&
          now.isBefore(DateTime.parse(quiz.availableUntil!));
      if (!ok) return false;
    }

    // Examen final: requiere 75% de avance
    if (quiz.isFinalExam && quiz.assessmentType == 'exam') {
      return data.completionPercentage >= 75.0;
    }

    // Quiz de unidad sin sesión: requiere todas las sesiones completadas
    if (quiz.unitId != null && quiz.sessionId == null) {
      final unitSessions = data.sessionsByUnit[quiz.unitId] ?? [];
      if (unitSessions.isNotEmpty) {
        return unitSessions.every((s) => data.completedSessionIds.contains(s.id));
      }
    }
    return true;
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBg,
      body: _isLoading
          ? _buildLoading()
          : _error != null
              ? _buildError()
              : _buildContent(),
      floatingActionButton: _data != null ? _buildTutorFAB() : null,
    );
  }

  Widget _buildLoading() => const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: AppTheme.primaryBlue),
            SizedBox(height: 16),
            Text('Cargando curso...', style: TextStyle(color: Colors.white54)),
          ],
        ),
      );

  Widget _buildError() => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(MdiIcons.alertCircle, color: Colors.redAccent, size: 48),
              const SizedBox(height: 16),
              const Text('Error al cargar el curso',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(_error ?? '', textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white54, fontSize: 12)),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loadData,
                icon: const Icon(Icons.refresh),
                label: const Text('Reintentar'),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryBlue),
              ),
            ],
          ),
        ),
      );

  Widget _buildContent() {
    final data = _data!;
    return NestedScrollView(
      headerSliverBuilder: (context, innerBoxIsScrolled) => [
        _buildSliverAppBar(data),
        SliverPersistentHeader(
          pinned: true,
          delegate: _TabBarDelegate(
            TabBar(
              controller: _tabController,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white54,
              indicatorColor: AppTheme.primaryBlue,
              indicatorWeight: 3,
              tabs: const [
                Tab(text: 'Módulos'),
                Tab(text: 'Materiales'),
                Tab(text: 'Evaluaciones'),
              ],
            ),
          ),
        ),
      ],
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildModulesTab(data),
          _buildMaterialsTab(data),
          _buildQuizzesTab(data),
        ],
      ),
    );
  }

  // ── SLIVER APP BAR ────────────────────────────────────────────────────────

  Widget _buildSliverAppBar(CourseDetailData data) {
    final pct = data.completionPercentage / 100.0;
    return SliverAppBar(
      expandedHeight: 200,
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
              colors: [Color(0xFF1A237E), AppTheme.primaryBlue, Color(0xFF0F172A)],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 56, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Row(
                    children: [
                      if (data.enrollmentStatus == 'active')
                        _buildBadge('En Progreso', AppTheme.primaryBlue),
                      const SizedBox(width: 8),
                      _buildBadge('✨ IA Habilitada', AppTheme.primaryPurple),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    data.course.title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: pct,
                            backgroundColor: Colors.white.withAlpha(30),
                            valueColor: AlwaysStoppedAnimation<Color>(
                              pct >= 0.75 ? Colors.greenAccent : AppTheme.primaryBlue,
                            ),
                            minHeight: 8,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '${data.completionPercentage.toInt()}%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        title: Text(
          data.course.title,
          style: const TextStyle(fontSize: 14, color: Colors.white),
          overflow: TextOverflow.ellipsis,
        ),
        titlePadding: const EdgeInsets.only(left: 56, bottom: 16),
        collapseMode: CollapseMode.parallax,
      ),
    );
  }

  Widget _buildBadge(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withAlpha(40),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withAlpha(100)),
        ),
        child: Text(text,
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
      );

  // ── SCORE CARD ────────────────────────────────────────────────────────────

  Widget _buildScoreCard(CourseDetailData data) {
    final totalSessions =
        data.sessionsByUnit.values.expand((l) => l).length;
    final totalQuizzes = data.quizzesByUnit.values.expand((l) => l).length +
        data.generalQuizzes.length +
        (data.finalExam != null ? 1 : 0);

    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Tu Progreso',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white70)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildMetric('Unidades',
                  data.completedUnitIds.length, data.units.length, MdiIcons.bookOpenPageVariant, AppTheme.primaryBlue)),
              const SizedBox(width: 12),
              Expanded(child: _buildMetric('Sesiones',
                  data.completedSessionIds.length, totalSessions, MdiIcons.playCircle, AppTheme.primaryPurple)),
              const SizedBox(width: 12),
              Expanded(child: _buildMetric('Evaluaciones',
                  data.completedQuizIds.length, totalQuizzes, MdiIcons.clipboardCheck, Colors.orangeAccent)),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  Widget _buildMetric(String label, int done, int total, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(height: 4),
        Text('$done/$total',
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
        Text(label,
            style: const TextStyle(color: Colors.white54, fontSize: 11),
            textAlign: TextAlign.center),
      ],
    );
  }

  // ── TAB MÓDULOS ───────────────────────────────────────────────────────────

  Widget _buildModulesTab(CourseDetailData data) {
    final ordered = List<CourseUnit>.from(data.units)
      ..sort((a, b) {
        final na = a.number ?? 0, nb = b.number ?? 0;
        if (na != nb) return na.compareTo(nb);
        return (a.orderIndex ?? 0).compareTo(b.orderIndex ?? 0);
      });

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppTheme.primaryBlue,
      backgroundColor: AppTheme.darkCard,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildScoreCard(data),
          const SizedBox(height: 16),
          ...ordered.map((unit) => _buildUnitTile(unit, data)),
          _buildFinalExamBanner(data),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildUnitTile(CourseUnit unit, CourseDetailData data) {
    final isCompleted = data.completedUnitIds.contains(unit.id);
    final isAvailable = _isUnitAvailable(unit);
    final sessions = data.sessionsByUnit[unit.id] ?? [];
    final quizzes = data.quizzesByUnit[unit.id] ?? [];
    final unitMaterials = data.materials.where((m) => m.unitId == unit.id && m.sessionId == null).toList();
    final isExpanded = _expandedUnits.contains(unit.id);

    Color accentColor;
    IconData statusIcon;
    if (isCompleted) {
      accentColor = Colors.greenAccent;
      statusIcon = MdiIcons.checkCircle;
    } else if (!isAvailable) {
      accentColor = Colors.white24;
      statusIcon = MdiIcons.lock;
    } else {
      accentColor = AppTheme.primaryBlue;
      statusIcon = MdiIcons.circleOutline;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isCompleted
              ? Colors.greenAccent.withAlpha(60)
              : isAvailable
                  ? AppTheme.primaryBlue.withAlpha(40)
                  : Colors.white.withAlpha(13),
        ),
      ),
      child: Column(
        children: [
          // Header de la unidad
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: isAvailable
                ? () => setState(() {
                      if (isExpanded) {
                        _expandedUnits.remove(unit.id);
                      } else {
                        _expandedUnits.add(unit.id);
                      }
                    })
                : null,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: accentColor.withAlpha(30),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(statusIcon, color: accentColor, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          unit.number != null ? 'Unidad ${unit.number}' : 'Unidad',
                          style: TextStyle(
                              color: accentColor, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          unit.title,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: isAvailable ? Colors.white : Colors.white38,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!isAvailable)
                    const Text('Bloqueada',
                        style: TextStyle(color: Colors.white38, fontSize: 11))
                  else ...[
                    Text(
                      '${sessions.length} ses · ${quizzes.length} quiz',
                      style: const TextStyle(color: Colors.white38, fontSize: 11),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                      color: Colors.white38,
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Contenido expandido
          if (isExpanded && isAvailable) ...[
            const Divider(color: Colors.white12, height: 1),
            
            if (sessions.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Row(
                  children: [
                    Icon(Icons.route, color: AppTheme.primaryBlue, size: 18),
                    SizedBox(width: 8),
                    Text('Ruta de Sesiones', 
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13)),
                  ],
                ),
              ),
              ...sessions.asMap().entries.map((e) => _buildSessionTile(e.value, data, e.key, sessions.length)),
            ],
            ...quizzes.map((q) => _buildQuizTile(q, data)),
            
            // Renderizar materiales de la unidad (Recursos Adicionales)
            if (unitMaterials.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Row(
                  children: [
                    Icon(Icons.folder_open, color: Colors.orangeAccent, size: 18),
                    SizedBox(width: 8),
                    Text('Recursos Adicionales', 
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13)),
                  ],
                ),
              ),
              ...unitMaterials.map((m) => _buildUnitMaterialTile(m)),
              const SizedBox(height: 8),
            ],

            if (!isCompleted && sessions.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: null, // TODO: marcar unidad como completada
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Marcar unidad completada'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.greenAccent,
                      side: const BorderSide(color: Colors.greenAccent, width: 1),
                    ),
                  ),
                ),
              ),
          ],
        ],
      ),
    ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.05);
  }

  Widget _buildUnitMaterialTile(CourseMaterial material) {
    final (icon, color) = switch (material.kind) {
      'pdf' => (MdiIcons.filePdfBox, Colors.redAccent),
      'video' => (MdiIcons.playBoxOutline, Colors.blueAccent),
      'link' => (MdiIcons.linkVariant, Colors.tealAccent),
      'markdown' => (MdiIcons.fileDocumentOutline, Colors.white70),
      _ => (MdiIcons.fileOutline, Colors.white54),
    };

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 0),
      leading: Icon(icon, color: color, size: 20),
      title: Text(
        material.title,
        style: const TextStyle(fontSize: 14, color: Colors.white),
      ),
      subtitle: material.kind == 'video'
          ? const Text('Video', style: TextStyle(fontSize: 10, color: Colors.white38))
          : (material.category != null ? Text(material.category!, style: const TextStyle(fontSize: 10, color: Colors.white38)) : null),
      trailing: const Icon(Icons.open_in_new, color: Colors.white24, size: 16),
      onTap: () async {
        if (material.url != null && material.url!.isNotEmpty) {
           final youtubeId = YoutubeUtils.extractYoutubeId(material.url!);
           if (youtubeId != null) {
             showDialog(
               context: context,
               builder: (_) => Dialog(
                 backgroundColor: Colors.transparent,
                 insetPadding: const EdgeInsets.all(16),
                 child: Stack(
                   alignment: Alignment.topRight,
                   clipBehavior: Clip.none,
                   children: [
                     ClipRRect(
                       borderRadius: BorderRadius.circular(14),
                       child: YoutubePlayerCard(videoId: youtubeId),
                     ),
                     Positioned(
                       top: 4,
                       right: 4,
                       child: Container(
                         decoration: const BoxDecoration(
                           color: Colors.black87,
                           shape: BoxShape.circle,
                         ),
                         child: IconButton(
                           icon: const Icon(Icons.close, color: Colors.white, size: 20),
                           onPressed: () => Navigator.pop(context),
                         ),
                       ),
                     ),
                   ],
                 ),
               ),
             );
             return;
           }

           final Uri uri = Uri.parse(material.url!);
           if (await canLaunchUrl(uri)) {
             await launchUrl(uri, mode: LaunchMode.externalApplication);
           }
        }
      },
    );
  }

  Widget _buildSessionTile(CourseSession session, CourseDetailData data, int index, int total) {
    final isCompleted = data.completedSessionIds.contains(session.id);
    final isAvailable = _isSessionAvailable(session);
    final isCurrent = isAvailable && !isCompleted;

    Color nodeColor;
    Color iconColor;
    IconData nodeIcon;

    if (isCompleted) {
      nodeColor = Colors.green.withAlpha(40);
      iconColor = Colors.greenAccent;
      nodeIcon = Icons.check;
    } else if (isCurrent) {
      nodeColor = AppTheme.primaryBlue.withAlpha(40);
      iconColor = AppTheme.primaryBlue;
      nodeIcon = Icons.play_arrow;
    } else {
      nodeColor = AppTheme.darkCard;
      iconColor = Colors.white24;
      nodeIcon = Icons.lock;
    }

    return Stack(
      children: [
        // Línea conectora
        Positioned(
          left: 48, // 20 padding + 16 margen del nodo izq + 12 (mitad del nodo de 24) = 48
          top: index == 0 ? 30 : 0,
          bottom: index == total - 1 ? 30 : 0,
          child: Container(
            width: 2,
            color: Colors.white12,
          ),
        ),
        // Item
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 20),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Nodo
              Container(
                margin: const EdgeInsets.only(left: 4, right: 16),
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: nodeColor,
                  shape: BoxShape.circle,
                  border: Border.all(color: iconColor, width: 2),
                ),
                child: Icon(nodeIcon, size: 14, color: iconColor),
              ),
              // Tarjeta
              Expanded(
                child: InkWell(
                  onTap: isAvailable
                      ? () async {
                          final reloaded = await Navigator.of(context).push<bool>(
                            MaterialPageRoute(
                              builder: (_) => SessionDetailScreen(
                                session: session,
                                courseId: widget.courseId,
                                isCompleted: isCompleted,
                              ),
                            ),
                          );
                          if (reloaded == true && mounted) _loadData();
                        }
                      : null,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isCurrent ? Colors.white.withAlpha(10) : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isCurrent ? AppTheme.primaryBlue.withAlpha(100) : Colors.white12,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'SESIÓN ${index + 1}',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: isCompleted ? Colors.greenAccent : isCurrent ? AppTheme.primaryBlue : Colors.white38,
                              ),
                            ),
                            if (isCompleted)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.greenAccent.withAlpha(30),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text('Completada', style: TextStyle(fontSize: 8, color: Colors.greenAccent, fontWeight: FontWeight.bold)),
                              )
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          session.title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isAvailable ? Colors.white : Colors.white38,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.schedule, size: 12, color: isAvailable ? Colors.white54 : Colors.white24),
                            const SizedBox(width: 4),
                            Text(
                              session.durationMinutes != null ? '${session.durationMinutes} min' : 'Clase interactiva',
                              style: TextStyle(fontSize: 11, color: isAvailable ? Colors.white54 : Colors.white24),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuizTile(CourseAssessment quiz, CourseDetailData data) {
    final isCompleted = data.completedQuizIds.contains(quiz.id);
    final isAvailable = _isQuizAvailable(quiz);

    final icon = switch (quiz.assessmentType) {
      'exam' => MdiIcons.fileDocumentEdit,
      'assignment' => MdiIcons.clipboardText,
      'project' => MdiIcons.folderOpen,
      _ => MdiIcons.helpCircle,
    };

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
      leading: Icon(
        isCompleted ? MdiIcons.checkDecagram : (isAvailable ? icon : MdiIcons.lock),
        color: isCompleted
            ? Colors.greenAccent
            : isAvailable
                ? Colors.orangeAccent
                : Colors.white24,
        size: 20,
      ),
      title: Text(
        quiz.title,
        style: TextStyle(
          fontSize: 14,
          color: isAvailable ? Colors.white : Colors.white38,
        ),
      ),
      subtitle: Text(
        quiz.assessmentType.toUpperCase(),
        style: const TextStyle(fontSize: 10, color: Colors.white38),
      ),
      trailing: isAvailable && !isCompleted
          ? TextButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Evaluación: ${quiz.title}'),
                    duration: const Duration(seconds: 2),
                  ),
                );
              },
              child: const Text('Iniciar', style: TextStyle(color: Colors.orangeAccent)),
            )
          : null,
    );
  }

  Widget _buildFinalExamBanner(CourseDetailData data) {
    final exam = data.finalExam;
    if (exam == null) return const SizedBox();

    final isAvailable = data.completionPercentage >= 75.0;
    final isCompleted = data.completedQuizIds.contains(exam.id);

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isCompleted
              ? [Colors.green.shade900, Colors.green.shade800]
              : isAvailable
                  ? [const Color(0xFF1A237E), AppTheme.primaryBlue.withAlpha(180)]
                  : [AppTheme.darkCard, AppTheme.darkCard],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isCompleted
              ? Colors.greenAccent.withAlpha(80)
              : isAvailable
                  ? AppTheme.primaryBlue.withAlpha(80)
                  : Colors.white12,
        ),
      ),
      child: Row(
        children: [
          Icon(
            isCompleted
                ? MdiIcons.trophyVariant
                : isAvailable
                    ? MdiIcons.fileDocumentEdit
                    : MdiIcons.lockClock,
            color: isCompleted
                ? Colors.amber
                : isAvailable
                    ? Colors.white
                    : Colors.white38,
            size: 36,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🏆 EXAMEN FINAL',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Colors.white70,
                        letterSpacing: 1)),
                const SizedBox(height: 4),
                Text(exam.title,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(
                  isCompleted
                      ? '✅ Completado'
                      : isAvailable
                          ? 'Disponible — ¡Mucho éxito!'
                          : 'Requiere ${75 - data.completionPercentage.toInt()}% más de avance',
                  style: TextStyle(
                    fontSize: 12,
                    color: isAvailable ? Colors.white70 : Colors.white38,
                  ),
                ),
              ],
            ),
          ),
          if (isAvailable && !isCompleted)
            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Iniciando examen final...')),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppTheme.primaryBlue,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              child: const Text('Iniciar', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
        ],
      ),
    ).animate().fadeIn(delay: 300.ms);
  }

  // ── TAB MATERIALES ────────────────────────────────────────────────────────

  Widget _buildMaterialsTab(CourseDetailData data) {
    final mats = data.materials
        .where((m) => m.unitId == null && m.sessionId == null)
        .toList();

    if (mats.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(MdiIcons.folderOpenOutline, size: 48, color: Colors.white24),
            const SizedBox(height: 12),
            const Text('Sin materiales generales',
                style: TextStyle(color: Colors.white38)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: mats.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, i) => _buildMaterialTile(mats[i]),
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

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withAlpha(13)),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withAlpha(30),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        title: Text(material.title, style: const TextStyle(fontSize: 14)),
        subtitle: material.category != null
            ? Text(material.category!, style: const TextStyle(color: Colors.white38, fontSize: 12))
            : null,
        trailing: const Icon(Icons.open_in_new, color: Colors.white24, size: 18),
        onTap: () async {
          if (material.url != null && material.url!.isNotEmpty) {
            final youtubeId = YoutubeUtils.extractYoutubeId(material.url!);
            if (youtubeId != null) {
              showDialog(
                context: context,
                builder: (_) => Dialog(
                  backgroundColor: Colors.transparent,
                  insetPadding: const EdgeInsets.all(16),
                  child: Stack(
                    alignment: Alignment.topRight,
                    clipBehavior: Clip.none,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: YoutubePlayerCard(videoId: youtubeId),
                      ),
                      Positioned(
                        top: 4,
                        right: 4,
                        child: Container(
                          decoration: const BoxDecoration(
                            color: Colors.black87,
                            shape: BoxShape.circle,
                          ),
                          child: IconButton(
                            icon: const Icon(Icons.close, color: Colors.white, size: 20),
                            onPressed: () => Navigator.pop(context),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
              return;
            }

            final Uri uri = Uri.parse(material.url!);
            if (await canLaunchUrl(uri)) {
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            }
          }
        },
      ),
    );
  }

  // ── TAB EVALUACIONES ──────────────────────────────────────────────────────

  Widget _buildQuizzesTab(CourseDetailData data) {
    final allQuizzes = [
      ...data.quizzesByUnit.values.expand((l) => l),
      ...data.generalQuizzes,
    ];

    if (allQuizzes.isEmpty && data.finalExam == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(MdiIcons.clipboardTextOutline, size: 48, color: Colors.white24),
            const SizedBox(height: 12),
            const Text('Sin evaluaciones publicadas',
                style: TextStyle(color: Colors.white38)),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ...allQuizzes.map((q) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _buildQuizCard(q, data),
            )),
        if (data.finalExam != null) _buildFinalExamBanner(data),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildQuizCard(CourseAssessment quiz, CourseDetailData data) {
    final isCompleted = data.completedQuizIds.contains(quiz.id);
    final isAvailable = _isQuizAvailable(quiz);

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCompleted
              ? Colors.greenAccent.withAlpha(60)
              : Colors.white.withAlpha(13),
        ),
      ),
      child: ListTile(
        leading: Icon(
          isCompleted ? MdiIcons.checkDecagram : MdiIcons.clipboardText,
          color: isCompleted ? Colors.greenAccent : Colors.orangeAccent,
        ),
        title: Text(quiz.title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(quiz.assessmentType.toUpperCase(),
            style: const TextStyle(fontSize: 11, color: Colors.white38)),
        trailing: isCompleted
            ? const Icon(Icons.check, color: Colors.greenAccent)
            : isAvailable
                ? ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orangeAccent,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                    child: const Text('Iniciar', style: TextStyle(fontSize: 12)),
                  )
                : const Icon(Icons.lock, color: Colors.white24, size: 18),
      ),
    );
  }

  // ── FAB TUTOR ─────────────────────────────────────────────────────────────

  Widget _buildTutorFAB() => FloatingActionButton.extended(
        onPressed: () {
          // Navegar al tab de Tutor IA en el dashboard
          Navigator.pop(context);
          // TODO: pasar courseId al TutorScreen nativo
        },
        backgroundColor: AppTheme.primaryPurple,
        icon: Icon(MdiIcons.robot),
        label: const Text('Tutor IA'),
      );
}

/// Delegate para el TabBar persistente dentro del NestedScrollView
class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  const _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: AppTheme.darkBg,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => false;
}
