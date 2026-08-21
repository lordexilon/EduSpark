// ignore_for_file: avoid_web_libraries_in_flutter
import 'package:flutter/material.dart';
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

Widget buildWebYoutubePlayer(String videoId) {
  final viewId = 'youtube-web-player-$videoId';
  
  // Register the iframe to flutter web's platformViewRegistry
  // ignore: undefined_prefixed_name
  ui_web.platformViewRegistry.registerViewFactory(viewId, (int id) {
    final iframe = html.IFrameElement()
      ..src = 'https://www.youtube.com/embed/$videoId?autoplay=1&modestbranding=1&rel=0'
      ..style.border = 'none'
      ..allowFullscreen = true
      ..allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    return iframe;
  });

  return HtmlElementView(viewType: viewId);
}
