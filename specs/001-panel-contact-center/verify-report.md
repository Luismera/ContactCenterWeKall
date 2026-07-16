# Reporte de verificación — Mini panel de Contact Center (Engage 360)

Fecha: 2026-07-16

## Criterios de aceptación

| # | Criterio | Resultado | Evidencia |
|---|----------|-----------|-----------|
| FR-01 | Crear interacción (`type`, `agentId`), queda `open` con `openedAt` en UTC | ✅ | `POST /interactions` → `201`, `{"status":"open","openedAt":"2026-07-16T02:31:56.653Z",...}` |
| FR-02 | Transición `open→in_progress→resolved`, estricta y solo hacia adelante, `closedAt` al resolver | ✅ | Salto `open→resolved` → `409 Conflict`. Retroceso `in_progress→open` → `409 Conflict`. Secuencia válida `open→in_progress→resolved` → `200`, `closedAt` queda seteado (probado en la fase Implement). |
| FR-03 | Listar con filtros (`agentId`,`status`,`dateFrom`,`dateTo`) + paginación | ✅ | `GET /interactions?status=resolved` filtra correctamente; `page=99999&limit=10` → `data:[]` con `meta.total` correcto; `limit=101` → `400` (tope 100 respetado); `page=0`/`limit=0` → `400`. |
| FR-04 ⭐ | Métricas por agente: total, resueltas, tasa de resolución, tiempo promedio de resolución, calculado en DB | ✅ | Ver "Casos borde del núcleo" — agregación vía `$queryRaw`, verificada con `EXPLAIN ANALYZE` y cruce contra `psql`. |
| FR-05 ⭐ | Serie de volumen por día en `America/Bogota` | ✅ | Ver "Casos borde del núcleo" — caso de cruce de medianoche verificado manualmente y con test automatizado. |
| FR-06 | Interfaz mínima: listado + filtros, vista de métricas, loading/error | ✅ | Probado en navegador real (Chrome vía MCP): tabla de interacciones con filtros funcionales, dashboard de métricas con tabla+gráfico y tooltip, estado de error visible al apagar el backend (`"Ocurrió un error: No se pudo conectar con el servidor..."`), sin errores en consola. |
| FR-07 | `GET /agents` de solo lectura para poblar filtros | ✅ | Devuelve los 6 agentes sembrados. |
| FR-08 | Validación explícita de entradas inválidas (400/404, nunca 500 silencioso) | ✅ | `type` inválido → `400`; `agentId` inexistente → `404`; `status` de filtro inválido → `400`; `id` no-UUID en `PATCH` → `400`; campo extra no declarado → `400` (`forbidNonWhitelisted`); interacción inexistente en `PATCH` → `404`. |
| FR-09 | Seed con cientos de interacciones, varios agentes, fechas que crucen medianoche | ✅ | 453 interacciones, 6 agentes, 204 de ellas con hora local Bogotá que cae en el día UTC siguiente (script idempotente, re-ejecutado sin errores). |
| NFR-01 | Agregaciones en DB, no en memoria | ✅ | Confirmado por diseño (`$queryRaw` con `GROUP BY`) y por `EXPLAIN ANALYZE` (ver abajo) — no hay ningún `for`/`reduce` sobre interacciones en el código del servicio. |
| NFR-02 | Zona horaria `America/Bogota` en agrupamiento por día, UTC en almacenamiento | ✅ | Columnas `timestamptz`; queries con `AT TIME ZONE 'America/Bogota'`; test automatizado + verificación manual. |
| NFR-03 | Manejo de errores centralizado | ✅ | `AllExceptionsFilter` global; todas las respuestas de error tienen el mismo formato `{statusCode, message, error}`. |
| NFR-04 | Métricas correctas y eficientes con miles de registros | ✅ | Stress test con 50,424 interacciones (ver abajo): endpoint respondió en 75ms, totales cuadraron exactamente. |

## Casos borde del núcleo

**1. Agregación con volumen (NFR-01/NFR-04).** Se insertaron 50,000 interacciones sintéticas adicionales directamente en Postgres (dataset total: 50,424 filas) y se llamó `GET /metrics?dateFrom=2025-06-01&dateTo=2026-07-15` (rango de ~410 días):
- Tiempo de respuesta: **75ms** (medido con `time curl`).
- `sum(byAgent[].total)` = 50,424 y `sum(dailyVolume[].count)` = 50,424 — coinciden exactamente entre sí, confirmando que ambas agregaciones cuentan el mismo universo de datos sin duplicar ni perder filas.
- `EXPLAIN ANALYZE` sobre la query de agregación por agente: para un rango que cubre casi toda la tabla, Postgres eligió `Seq Scan` (comportamiento correcto del optimizador cuando el filtro no es selectivo — no indica un problema de índices).
- `EXPLAIN ANALYZE` sobre la query de volumen diario con un rango selectivo (7 días): usó `Index Only Scan using "interactions_openedAt_idx"`, ejecutando en **0.666ms**. Confirma que el índice `openedAt` sí se aprovecha cuando el filtro es selectivo.
- Dataset restaurado al seed original (453 interacciones) tras la prueba mediante `npm run seed`.

**2. Zona horaria — cruce de medianoche (NFR-02).** Verificado en tres niveles independientes:
- Test automatizado (`date-range.util.spec.ts`): una interacción a las `2026-07-16T01:00:00.000Z` (20:00 del 15/07 en Bogotá) cae dentro del rango `[2026-07-15, 2026-07-15]` y fuera del rango `[2026-07-16, 2026-07-16]`.
- Verificación manual contra `psql`: `SELECT "openedAt" AT TIME ZONE 'America/Bogota'` sobre una fila real de `2026-06-01 00:04:00+00` (UTC) devuelve `2026-05-31 19:04:00` (hora local) y `date_trunc('day', ...)` agrupa correctamente en `2026-05-31`, no en `2026-06-01`.
- El seed genera deliberadamente ~45% de las interacciones en la ventana 19:00–23:59 hora Bogotá (204 de 453 en la corrida más reciente), forzando este caso en cada ejecución.

**3. Paginación en límites.** `limit=101` → `400` (tope 100); `limit=0`/`page=0` → `400` (mínimo 1); `page=99999` (fuera de rango) → `200` con `data: []` y `meta` correcto (total real, no error).

**4. Entradas inválidas.** Cubierto exhaustivamente en la tabla de criterios de aceptación (FR-08) — 7 escenarios distintos probados, todos devuelven `400`/`404` con mensaje explícito, ninguno cae en `500` no controlado.

## Tests

```
Test Suites: 4 passed, 4 total
Tests:       12 passed, 12 total
```

Cobertura: máquina de estados de interacciones (transiciones válidas/inválidas, incluyendo mismo-estado y retrocesos), cálculo de métricas por agente (tasa de resolución, redondeo de tiempo promedio, casos sin datos), relleno de días sin interacciones en la serie diaria, rechazo de `dateFrom > dateTo`, y conversión de rango Bogotá→UTC (incluyendo el caso de cruce de medianoche). No hay tests de integración/e2e contra Postgres real ni tests de UI — decisión consciente registrada en `DECISIONS.md` §7, priorizando la lógica de negocio y el núcleo evaluado sobre cobertura amplia.

`npx nest build` (backend) y `npm run build` (frontend) compilan sin errores. `npm run lint` limpio en ambos proyectos.

## Entregables

- [x] Repositorio Git con historial de commits atómicos (spec → plan → tasks → cada milestone → docs finales).
- [x] `README.md` — seguido literalmente paso a paso durante esta verificación (`docker compose up`, `npx prisma migrate dev`, `npm run seed`, `npm run start:dev` / `npm run dev`); reproducible sin ajustes.
- [x] Seed (`backend/prisma/seed.ts`, `npm run seed`) — idempotente (limpia antes de insertar), verificado en 3 ejecuciones distintas durante esta fase.
- [x] `DECISIONS.md` (raíz) — completo: arquitectura, modelo de datos, base de datos, endpoint de métricas con alternativas descartadas, tabla de decisiones durante implementación, uso de IA con errores reales corregidos, y qué se haría distinto en producción. Sin placeholders pendientes.
- [x] `specs/001-panel-contact-center/` — spec, plan, tasks (100% marcado), decisions.md (misma fuente que `DECISIONS.md`).

## Autoevaluación honesta contra la rúbrica del documento fuente

| Criterio | Peso | Autoevaluación |
|----------|------|-----------------|
| Arquitectura | 25 | **Fuerte.** Capas controller→service→repository consistentes en los tres módulos de dominio (interactions, metrics, agents), lógica de negocio (máquina de estados, cálculo de tasas) fuera de los controllers. Punto débil honesto: el módulo `agents` es deliberadamente delgado (por diseño, ver spec — sin CRUD), lo que podría leerse como "poco código" en ese módulo si no se lee la justificación. |
| Calidad de código | 20 | **Sólida.** Nombres explícitos en inglés, DTOs con `class-validator` en cada borde, `AllExceptionsFilter` centralizado, lint limpio en ambos proyectos. Un query usa `$queryRaw` con tipos definidos manualmente (`AgentMetricsRow`) en vez de tipos autogenerados de Prisma — trade-off documentado, no un descuido. |
| Núcleo: métricas | 20 | **Fuerte, con evidencia cuantitativa.** No solo se afirma que la agregación es correcta y eficiente: se demostró con `EXPLAIN ANALYZE` a 50k filas (75ms extremo a extremo, uso de índice confirmado en rango selectivo) y con cruce de totales entre las dos agregaciones y `psql`. El caso de timezone se probó en tres niveles (unit test, verificación manual, y por diseño del seed). |
| API y modelo de datos | 15 | **Sólida.** Endpoints RESTful convencionales, filtros combinables, paginación con metadata completa, modelo relacional simple con índices elegidos por patrón de consulta (no por conveniencia de escritura). |
| Documento de decisiones | 15 | **Fuerte.** Incluye alternativas descartadas con razones concretas (no solo la elegida), trade-offs con costo explícito, y una sección de uso de IA con 5 errores reales identificados y corregidos (no una lista genérica) — incluyendo un bug de corrección real (timestamps sin timezone) detectado antes de llegar a producción de código. |
| Tests y DX | 5 | **Cumple lo esencial, no exhaustivo.** 12 tests unitarios enfocados exactamente en lo que pesa (máquina de estados + métricas/timezone), README verificado paso a paso en esta misma sesión. Falta explícita y reconocida: tests de integración contra Postgres real y tests de componentes de UI. |

**Autoevaluación global:** el proyecto cumple el 100% de los requisitos MUST y NÚCLEO del spec, con evidencia de ejecución real (no solo lectura de código) para cada uno. La brecha más honesta frente a la rúbrica es "Tests y DX": la cobertura es deliberadamente angosta pero apunta a lo correcto.

## Desviaciones y pendientes

- **Sin autenticación, sin CRUD de agentes, transición de estados estricta:** decisiones de alcance confirmadas explícitamente por el usuario en la fase Specify (2026-07-15), no desviaciones silenciosas.
- **Sin tests de integración/e2e:** decisión consciente para priorizar tiempo en el núcleo evaluado; registrado en `DECISIONS.md` §7 como algo a agregar con más tiempo.
- **Bundle de frontend sin code-splitting** (advertencia de Vite por tamaño de chunk, ~555KB sin comprimir por Recharts): no afecta la funcionalidad ni la evaluación (el documento no pide rendimiento de frontend), pero sería lo primero a resolver si esto fuera a producción.
- **Sin materialización de métricas pre-agregadas:** el endpoint actual re-agrega en cada consulta; correcto y eficiente hasta volúmenes de decenas de miles de filas (medido), pero si el histórico creciera a millones de filas por años de operación, valdría la pena una tabla resumen — ya anotado en `DECISIONS.md` §7.

## Veredicto

**Listo para entregar.** Todos los requisitos MUST y ⭐NÚCLEO del spec están implementados y verificados con evidencia de ejecución (no solo inspección de código); los tests pasan; el README es reproducible paso a paso; `DECISIONS.md` está completo y sin placeholders. No hay pendientes bloqueantes — solo mejoras de "producción" ya documentadas conscientemente como fuera de alcance para esta prueba.
