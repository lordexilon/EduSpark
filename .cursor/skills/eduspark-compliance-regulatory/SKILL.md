---
name: eduspark-compliance-regulatory
description: >-
  Aplica lógica regulatoria EduSpark para educación superior paraguaya (Ley
  4995/13), estándares ANEAES/CONES y modelo de créditos: fórmula 1-2 (horas
  independientes vs sincrónicas), unidad de crédito (25 h totales), residencia
  de datos y PII/biometría según normativa paraguaya, zona horaria
  America/Asuncion, y entidades estudiante/evidencia con campos de auditoría.
  Usar al modelar créditos, horarios, matrículas, trazabilidad de actividades o
  cumplimiento CONES en productos EduSpark.
---

# EduSpark: cumplimiento y lógica regulatoria (Paraguay)

## Rol

Actuar como referencia técnica alineada a **Ley 4995/13** y exigencias de **acreditación ANEAES / CONES**. No sustituye dictamen legal institucional: ante duda normativa, remitir a compliance jurídico del establecimiento.

## Reglas críticas

### 1. Fórmula 1-2 (carga independiente vs sincrónica)

Al calcular o validar créditos u horas por actividad:

- Definir explícitamente horas **sincrónicas** y **independientes** (y **asíncronas** si el modelo las discrimina).
- **Validación obligatoria:** `horas_independientes >= 2 × horas_sincrónicas`.
- Si `horas_independientes < 2 × horas_sincrónicas` → se considera **incumplimiento** respecto al criterio CONES manejado en EduSpark y debe exponerse al usuario/sistema:

  `⚠️ NON-COMPLIANCE: Insufficient independent workload for CONES standards.`

Implementar esta comprobación en reglas de negocio, checks de UI, migraciones o reportes donde se definan cargas horarias.

### 2. Unidad de crédito

- **1 crédito académico = 25 horas totales** de trabajo del estudiante.
- Horas totales = **sincrónicas + asíncronas + independientes** (según el desglose que use el módulo; la suma debe cuadrar con el modelo de 25 h/crédito que defina el curso o la normativa interna institucional documentada).

### 3. Residencia de datos y privacidad

- **PII** y **hashes biométricos** deben tratarse según **normativa paraguaya de protección de datos personales** (minimización, finalidad, retención documentada, medidas técnicas y de acceso).
- No exponer PII/biometría en logs públicos, URLs o respuestas API sin necesidad; cifrado y control de acceso acorde al riesgo.

### 4. Zona horaria

- Toda lógica de **agenda, plazos, reportes temporales y auditoría con timestamp** debe usar **`America/Asuncion`** por defecto o de forma explícita en configuración (evitar `UTC` silencioso como única referencia para reglas académicas).

## Requisitos de entidades (EduSpark)

| Entidad | Campos / comportamiento |
|---------|-------------------------|
| **Estudiante** | Incluir `biometric_hash`, `national_id`, `last_geo_location` en el modelo de datos cuando el producto esté en alcance de cumplimiento EduSpark descrito aquí (tipos, índices y RLS acordes a sensibilidad). |
| **Evidencia (actividad de aprendizaje)** | Cada actividad debe poder generar o asociar un **`trace_hash`** para **auditoría** (integridad / trazabilidad de la evidencia entregada o registrada). |

## Checklist rápida

- [ ] Validación 1-2 aplicada donde se carguen o sumen horas sincrónicas/independientes.
- [ ] Totales por crédito coherentes con 25 h y desglose documentado.
- [ ] Zona horaria `America/Asuncion` en scheduling y reportes académicos.
- [ ] PII y `biometric_hash` con políticas de acceso y almacenamiento acordes a PY.
- [ ] Actividades con cadena de auditoría vía `trace_hash` donde corresponda.

## Relación con otros skills

- **Moodle / ANEAES (arquitectura de curso):** `.cursor/skills/moodle-architect-paraguay-aneaes/SKILL.md` — complementar diseño de plataforma con esta lógica de créditos y evidencias.
- **UX estudiantil:** `.cursor/skills/edtech-ux-ui-web-flutter/SKILL.md` — sin contradecir requisitos de datos sensibles (mostrar mínimo necesario).
