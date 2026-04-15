---
name: edtech-ux-ui-web-flutter
description: >-
  Aplica principios de UX/UI EdTech en web (Moodle o front custom) y Flutter:
  microaprendizaje, indicadores de progreso, WCAG 2.1, bajo ancho de banda,
  skeleton loaders, modo offline (Hive/SQLite), gestos, push con deep links y
  bottom nav estándar. Usar al diseñar o implementar interfaces de estudiante,
  dashboards, flujos de curso, foros/calificaciones o apps móviles educativas.
---

# EdTech UX/UI (Web y Flutter)

## Rol

Actuar como especialista UX/UI para productos de aprendizaje: priorizar claridad, progreso visible, accesibilidad y rendimiento en redes débiles.

## Principios de aprendizaje (obligatorios)

1. **Microaprendizaje:** Fragmentar contenido en unidades cortas. En listas visibles, máximo **3–5 ítems** por pantalla o sección antes de paginar o agrupar.
2. **Progreso visible:** Incluir **barra de progreso** o **indicador de pasos** (stepper). El estudiante debe ver dónde está y cuánto falta.
3. **Accesibilidad (WCAG 2.1):** Contraste alto (lectura exterior / caminar); textos escalables; foco visible; etiquetas para **lectores de pantalla** (`Semantics` en Flutter, HTML/ARIA en web); estados de error comprensibles sin depender solo del color.
4. **Bajo ancho de banda:** Priorizar **texto y SVG** sobre imágenes pesadas; lazy-load donde aplique; en Flutter, patrones **offline-first** (cache local antes de red).

## Web (Moodle o front custom)

| Área | Directriz |
|------|-----------|
| **Dashboard** | Tarjetas claras: **Próximas entregas** y **Último curso accedido** (o “Continuar”). |
| **Navegación** | Cabecera **sticky** donde tenga sentido; botón **Volver arriba** en páginas largas. |
| **Interacción** | **Skeleton loaders** durante carga de listas y detalle para mejorar percepción de velocidad. |

## Flutter (requisitos)

| Área | Directriz |
|------|-----------|
| **Offline** | **Hive** o **SQLite** para cache local de materiales del curso (metadatos + contenido ligero); sincronización explícita y manejo de conflictos cuando el producto lo requiera. |
| **Gestos** | Deslizar para completar lección (donde el flujo lo permita); **pull-to-refresh** en listas. |
| **Push** | Notificaciones con **deep link** a respuesta de foro concreta o actualización de calificación. |
| **Bottom navigation** | Cuatro destinos: **Inicio**, **Mis cursos**, **Notificaciones**, **Perfil** (iconos + etiquetas accesibles). |

## Checklist rápida (antes de dar por cerrada una UI)

- [ ] Listas principales respetan 3–5 ítems visibles o están paginadas/agrupadas.
- [ ] Hay indicador de progreso o pasos en flujos multi-paso.
- [ ] Contraste y lectores de pantalla revisados en componentes clave.
- [ ] Carga con skeleton (web) o equivalente no bloqueante (shimmer/placeholder en Flutter).
- [ ] Flutter: estrategia offline + refresh; push con ruta parametrizada si aplica.

## Cuándo profundizar

Si el usuario trabaja **Moodle en Paraguay / ANEAES**, combinar con `.cursor/skills/moodle-architect-paraguay-aneaes/SKILL.md` en este repositorio.
