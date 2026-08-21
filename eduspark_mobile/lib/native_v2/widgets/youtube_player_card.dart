import 'package:flutter/material.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';
import 'package:flutter/foundation.dart';
import 'youtube_web/youtube_web_player.dart';

class YoutubeUtils {
  static String? extractYoutubeId(String url) {
    final patterns = [
      RegExp(r'youtube\.com/watch\?v=([a-zA-Z0-9_-]+)'),
      RegExp(r'youtu\.be/([a-zA-Z0-9_-]+)'),
      RegExp(r'youtube\.com/embed/([a-zA-Z0-9_-]+)'),
      RegExp(r'youtube-nocookie\.com/embed/([a-zA-Z0-9_-]+)'),
    ];
    for (final p in patterns) {
      final m = p.firstMatch(url);
      if (m != null) return m.group(1);
    }
    return null;
  }
}

class YoutubePlayerCard extends StatefulWidget {
  final String videoId;
  const YoutubePlayerCard({super.key, required this.videoId});

  @override
  State<YoutubePlayerCard> createState() => _YoutubePlayerCardState();
}

class _YoutubePlayerCardState extends State<YoutubePlayerCard> {
  YoutubePlayerController? _controller;
  bool _playing = false;

  void _startPlaying() {
    if (kIsWeb) {
      setState(() => _playing = true);
      return;
    }

    _controller = YoutubePlayerController.fromVideoId(
      videoId: widget.videoId,
      autoPlay: true,
      params: const YoutubePlayerParams(
        showControls: true,
        showFullscreenButton: true,
        mute: false,
        loop: false,
        color: 'white',
      ),
    );
    setState(() => _playing = true);
  }

  @override
  void dispose() {
    _controller?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_playing) {
      if (kIsWeb) {
        return ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: buildWebYoutubePlayer(widget.videoId),
          ),
        );
      }
      
      if (_controller != null) {
        // ── Player embebido real ──────────────────────────────────────────────
        return ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: YoutubePlayer(
              controller: _controller!,
            ),
          ),
        );
      }
    }

    // ── Thumbnail + botón play ────────────────────────────────────────────
    final thumb = 'https://img.youtube.com/vi/${widget.videoId}/hqdefault.jpg';
    return GestureDetector(
      onTap: _startPlaying,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          color: Colors.black87,
          border: Border.all(color: Colors.white.withAlpha(20)),
        ),
        clipBehavior: Clip.antiAlias,
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Stack(
            fit: StackFit.expand,
            alignment: Alignment.center,
            children: [
              // Thumbnail
              Image.network(
                thumb,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: Colors.black54,
                  child: const Center(
                    child: Icon(Icons.video_library_outlined,
                        color: Colors.white38, size: 48),
                  ),
                ),
              ),
              // Overlay oscuro
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withAlpha(140),
                    ],
                  ),
                ),
              ),
              // Botón play YouTube
              Center(
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(120),
                        blurRadius: 16,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.play_arrow_rounded,
                      color: Colors.white, size: 36),
                ),
              ),
              // Etiqueta YouTube
              Positioned(
                bottom: 10,
                right: 12,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withAlpha(160),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.play_circle_outline,
                          color: Colors.white, size: 13),
                      SizedBox(width: 4),
                      Text('Reproducir',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
