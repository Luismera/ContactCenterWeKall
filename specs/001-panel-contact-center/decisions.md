# Decisiones de diseño — Mini panel de Contact Center (Engage 360)

**Proyecto:** WeKall · Prueba técnica full-stack Node · **Autor:** Luis Mera (con apoyo de Claude Code, flujo SDD de DeltaByte) · **Última actualización:** 2026-07-14

> Registro vivo: se inicia en la fase Plan y se actualiza durante toda la implementación. Razonamiento honesto, no marketing.

## 1. Arquitectura general

**Contexto:** El documento pesa "Arquitectura" con 25%, el mayor criterio individual. Necesitaba una estructura que hiciera obvio dónde vive cada responsabilidad.
**Opciones consideradas:** (A) Express minimalista con carpetas por tipo (routes/controllers/models); (B) NestJS con módulos por dominio (interactions, metrics, agents); (C) arquitectura hexagonal completa (ports/adapters).
**Elección:** B — NestJS, módulos por dominio, capas controller → service → repository.
**Por qué:** Nest impone la separación de capas por convención (decoradores, DI), lo que reduce el riesgo de que la lógica de negocio se filtre al controller. Es el stack default de DeltaByte y da exception filters y pipes de validación listos para el criterio "Calidad de código".
**Trade-offs asumidos:** Más boilerplate inicial que Express plano; para una prueba de 1-2h es más setup, pero se paga en claridad estructural evaluada.

## 2. Modelo de datos

**Contexto:** El dominio son interacciones (llamadas/tickets) atendidas por agentes, con estado y timestamps de apertura/cierre.
**Opciones consideradas:** (A) una sola tabla `Interaction` con `agentId` como FK a una tabla mínima `Agent`; (B) modelar `Agent` con jornada/turnos como entidad aparte; (C) documentos anidados (interacción embebe datos del agente).
**Elección:** A — dos entidades relacionales simples, `Agent 1—N Interaction`.
**Por qué:** Las tres preguntas del líder (totales por agente, tiempo promedio, volumen por día) son todas agregaciones sobre `Interaction` agrupadas por `agentId` o por fecha. Un modelo relacional simple con los índices correctos resuelve las tres sin desnormalizar.
**Trade-offs asumidos:** No se modela jornada/turno del agente (fuera de alcance, ver spec) — si en el futuro se pide "tiempo activo por turno", el modelo actual no lo soporta directamente.

## 3. Base de datos

**Justificación contra criterios:** el proyecto tiene relación fuerte (agente↔interacción) y su núcleo evaluado es reporting/agregación (GROUP BY por agente, por día) con exigencia de corrección — el escenario de referencia para relacional según la tabla de criterios de la constitución.
**Elección:** PostgreSQL + Prisma.
**Alternativa descartada:** MongoDB con aggregation pipeline (`$group` + `$dateToString` con timezone) — técnicamente viable y no se descarta por dogma, pero Postgres con `date_trunc(... AT TIME ZONE ...)` es más directo de auditar y el volumen de datos de una prueba técnica (cientos-miles de filas) no necesita el modelo de documentos ni su flexibilidad de esquema.

## 4. Endpoint de métricas (⭐ punto crítico)

**Cómo se resolvió la agregación:** una query SQL agregada (`$queryRaw` de Prisma) agrupando por `agentId`: `COUNT(*)` para el total, `COUNT(*) FILTER (WHERE status = 'resolved')` para resueltas, `AVG(closed_at - opened_at)` filtrado a resueltas para el tiempo promedio. Todo se calcula en la base de datos, nunca trayendo filas a memoria para sumar en un loop.
**Cómo se resolvió la zona horaria:** la serie de volumen por día agrupa con `date_trunc('day', opened_at AT TIME ZONE 'America/Bogota')`, de forma que una interacción de las 20:00 hora Colombia (01:00 UTC del día siguiente) cae en su día local correcto. El rango de fechas de entrada (`dateFrom`/`dateTo`) se interpreta como fechas locales de Bogotá y se convierte a límites UTC antes de consultar.
**Alternativas descartadas:**
- Traer todo el rango a memoria y agrupar en JS — descartado explícitamente porque es la solución "frágil" que el propio documento señala como antipatrón.
- Guardar un campo adicional `openedAtLocal` precalculado en el insert — descartado porque duplica la fuente de verdad (UTC) y puede desincronizarse si cambia la política de timezone; mejor derivarlo en la query.

## 5. Decisiones durante la implementación

| Fecha | Decisión | Alternativa descartada | Trade-off |
|-------|----------|------------------------|-----------|
| 2026-07-14 | Sin autenticación/login | Login básico con JWT | Fuera de alcance del documento; confirmado por el usuario (2026-07-15) |
| 2026-07-14 | Sin CRUD de agentes (solo seed + GET de lectura) | CRUD completo de agentes | El documento no lo pide; evita "funciones extra" que el documento penaliza; confirmado por el usuario (2026-07-15) |
| 2026-07-14 | Transición de estado estricta y solo hacia adelante | Permitir saltos/retrocesos | Alinea con la cadena `abierta → en_progreso → resuelta` descrita literalmente en el documento; confirmado por el usuario (2026-07-15) |
| 2026-07-15 | Prisma fijado en `6.19.3` (generador clásico `prisma-client-js`) en vez de la `7.8.0` que instala `npm install prisma` por defecto | Usar Prisma 7 (generador `prisma-client` + `prisma.config.ts`) | Prisma 7 es una major muy reciente con cambios de generador y configuración; para un entregable que debe "arrancar con pasos claros" se prioriza la versión 6.x, ampliamente documentada y estable, sobre la última disponible |

## 6. Uso de IA

**En qué me apoyé:** Claude Code (flujo Spec-Driven Development de DeltaByte) para: extracción y clasificación de requisitos del PDF de la prueba técnica, redacción de spec.md/plan.md, y diseño inicial del modelo de datos y la query de agregación con timezone. La implementación de código aún no ha comenzado en esta fase.
**Qué entregó mal o incompleto:** *(se documentará durante Implement, cuando haya código generado por IA que revisar).*
**Qué corregí o validé yo:** Las tres ambigüedades del documento (CRUD de agentes, autenticación, estrictez de transición de estados) se marcaron explícitamente como `[NECESITA ACLARACIÓN]` en vez de asumirlas silenciosamente, y quedan sujetas a decisión del usuario antes de construir.

## 7. Qué haría distinto con más tiempo / en producción

- Autenticación real (JWT o sesión) con roles `agent`/`team_lead`, y scoping de qué agente puede ver qué datos.
- Paginación por cursor en `/interactions` si el volumen creciera a millones de filas.
- Materializar métricas pre-agregadas (tabla resumen por día/agente, refrescada por job) si el rango de consulta creciera a años de histórico y la query en caliente dejara de ser suficiente.
- Tests de integración contra una base Postgres real (actualmente se prioriza unit tests de la lógica de negocio y agregación).
- Modelar jornada/turno de agente si el negocio necesitara métricas de tiempo activo, no solo por interacción.
