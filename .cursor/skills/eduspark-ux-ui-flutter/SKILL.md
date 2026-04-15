---
name: eduspark-ux-ui-flutter
description: >-
  Guía UX/UI y Flutter para EduSpark: Material 3, carga cognitiva (máx. 5
  elementos por pantalla), skeletons para conectividad débil, WCAG 2.1 y alto
  contraste, i18n obligatorio español (es) y guaraní (gn) por Ley de Lenguas,
  tipografía sans legible, offline-first con Hive/SQLite, UI de proctoring con
  overlay de cámara y modo bajo consumo de datos. Usar al implementar o revisar
  la app móvil EduSpark, evaluaciones con biometría visual o pantallas rurales
  con datos limitados.
---

# EduSpark: UX/UI y Flutter

## Rol

Definir e implementar interfaz Flutter alineada a **EduSpark** y normativa lingüística paraguaya, sin sacrificar accesibilidad ni rendimiento en redes lentas.

## Lenguaje de diseño

| Tema | Directriz |
|------|-----------|
| **Material 3** | Usar componentes y theming **Material 3** (`useMaterial3: true`, `ColorScheme` / `ThemeData` M3). |
| **Carga cognitiva** | Máximo **5 elementos interactivos o bloques principales** por pantalla (listas: paginar, agrupar o usar bottom sheet). |
| **Conectividad** | En 3G/4G o latencia alta, priorizar **skeleton loaders** y placeholders ligeros hasta confirmar datos. |
| **Accesibilidad** | **WCAG 2.1**: contraste elevado (uso exterior), foco visible, `Semantics` en controles críticos, tamaños de toque adecuados. |

## Bilingüismo (Ley de Lenguas)

- **i18n obligatorio:** toda cadena visible debe existir en **`es`** y **`gn`** (mismo key, dos locales; sin texto hardcodeado en widgets).
- **Tipografía:** sans limpia y legible en layouts bilingües — por defecto **Roboto** (coherente con Material) o **Inter** si el proyecto ya lo integra; evitar display decorativos para cuerpo de UI.

## Flutter: producto

| Funcionalidad | Directriz |
|---------------|-----------|
| **Offline-first** | **Hive** o **SQLite** para cache de cursos y assets críticos; colas de sincronización claras. |
| **Proctoring** | Exámenes con validación biométrica: **overlay de cámara** (preview acotada, indicadores de estado, permisos explícitos, sin grabar más de lo necesario según política del producto). |
| **Modo bajo datos** | Opción de usuario para **desactivar imágenes/videos no esenciales** (thumbnails, hero media, autoplay); texto y SVG prioritarios. |

## Relación con otros skills

- **`edtech-ux-ui-web-flutter`:** `.cursor/skills/edtech-ux-ui-web-flutter/SKILL.md` — principios generales EdTech web/Flutter (bottom nav, gestos, push). Este skill **prioriza EduSpark**: **es/gn**, Material 3, proctoring y modo rural.
- **`eduspark-compliance-regulatory`:** `.cursor/skills/eduspark-compliance-regulatory/SKILL.md` — PII, biometría, `trace_hash` — al construir flujos de examen y almacenamiento de evidencias.

## Checklist rápida

- [ ] Pantalla respeta ≤5 bloques/acciones principales o está dividida.
- [ ] Strings solo vía i18n con claves en `es` y `gn`.
- [ ] Tema Material 3 y contraste revisado.
- [ ] Carga con skeleton en listas/detalles cuando la red es débil.
- [ ] Modo bajo datos y cache offline considerados donde aplique el flujo.
