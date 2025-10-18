# README: Asistente de IA (RAG) en EduSpark

## 1. Resumen Ejecutivo
Este documento define el alcance para el desarrollo de un Producto Mínimo Viable (MVP) que integrará un Asistente de IA Interactivo dentro de la plataforma EduSpark. El objetivo es evolucionar más allá del frontend simulado, implementando una funcionalidad de backend real que permita a los estudiantes "chatear" con los materiales de un curso específico.

Utilizaremos una arquitectura basada en RAG (Retrieval-Augmented Generation), orquestada por n8n y potenciada por la API de Google Gemini, para proporcionar respuestas precisas y basadas en el contenido oficial del curso.

## 2. Objetivos del MVP
- **Validar la Arquitectura Técnica**: Probar la viabilidad de usar n8n como orquestador para funcionalidades de IA complejas, conectando el frontend de React, una base de datos vectorial y la API de Gemini.
- **Proporcionar Valor al Usuario Final**: Entregar una primera versión funcional del Asistente de IA que resuelva dudas de los estudiantes basándose en un conjunto de documentos de un curso de prueba.
- **Establecer una Base Escalable**: Crear los cimientos (workflows de n8n, esquema de base de datos) que puedan ser reutilizados y expandidos para todos los cursos de la plataforma en el futuro.

## 3. Estructura de este Directorio

Este directorio contiene la documentación central para el desarrollo e integración de la funcionalidad de IA en EduSpark.

- **`agent.md`**: Define las reglas, el alcance y las directrices que el asistente de desarrollo de IA debe seguir. Actúa como la "constitución" del proyecto.
- **`project_status.md`**: Es nuestro documento de control. Proporciona un resumen en tiempo real del progreso del proyecto, detallando las fases y tareas completadas y pendientes.
- **`flujos_criticos.md`**: Describe en detalle la arquitectura y los workflows de n8n que son el corazón del sistema RAG.
- **`workflow_ingesta.md`**: Contiene la guía detallada y el JSON para implementar el workflow de ingesta de contenido en n8n.
- **`workflow_consulta.md`**: Contiene la guía detallada y el JSON para implementar el workflow de consulta de alumnos en n8n.
- **`nomenclatura_standar.md`**: Establece las convenciones de nombres para componentes, servicios, tablas y workflows para mantener la consistencia del código.
- **`schema_actual.md`**: Detalla el esquema de la base de datos en Supabase, incluyendo tablas, columnas y funciones necesarias para el almacenamiento y búsqueda de vectores.