# Diagrama ER – Esquema de EduSpark

```mermaid
erDiagram
    CARRERA ||--o{ MATERIA : "tiene"
    MATERIA ||--o{ CURSO : "se cursa en"
    CURSO   ||--o{ UNIDAD : "contiene (course_units)"
    UNIDAD  ||--o{ SESION : "contiene (sessions)"
    CURSO   ||--o{ SESION : "tiene (directo)"
```

**Leyenda**
- `||--o{` = relación uno‑a‑muchos.
- `UNIDAD` corresponde a la tabla `course_units`.
- `SESION` corresponde a la tabla `sessions`.
- Las claves foráneas se añaden en `add_foreign_keys.sql`.
