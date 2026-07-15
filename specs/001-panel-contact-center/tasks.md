# Tasks 001 — Mini panel de Contact Center (Engage 360)

**Fecha:** 2026-07-15 · **Estado:** aprobado (2026-07-15)
**Plan:** `plan.md` (aprobado 2026-07-15)

## Milestone 1 — Proyecto base + modelo de datos + seed

- [x] **T-01** [S] Setup backend NestJS + TypeScript (estructura de módulos `interactions`, `metrics`, `agents`, `common`) `[Plan §1]`
- [x] **T-02** [S] Setup Prisma + PostgreSQL (docker-compose local), schema inicial `[Plan §3]`
- [x] **T-03** [M] Definir modelo `Agent`/`Interaction` en `schema.prisma` con enums `type`/`status` e índices (`agentId+openedAt`, `status`, `openedAt`) `[Plan §3]`
- [x] **T-04** [S] Migración inicial (`prisma migrate dev`) `[Plan §3]`
- [x] **T-05** [M] Script de seed: 5-8 agentes, 300-500 interacciones, mezcla de tipos/estados, timestamps que crucen medianoche COT `[FR-09]`

## Milestone 2 — API de interacciones (CRUD de lectura + ciclo de vida)

- [x] **T-10** [M] `POST /interactions` con DTO validado (`type`, `agentId`), 404 si agente no existe `[FR-01, FR-08]`
- [x] **T-11** ⭐ [M] `PATCH /interactions/:id/status` con máquina de estados estricta y solo hacia adelante (`abierta→en_progreso→resuelta`), 409 en transición inválida, registra `closedAt` al resolver `[FR-02]`
- [x] **T-12** [M] `GET /interactions` con filtros (`agentId`, `status`, `dateFrom`, `dateTo`) + paginación (`page`/`limit`) + metadata de paginación `[FR-03]`
- [x] **T-13** [S] `GET /agents` de solo lectura (para poblar filtros) `[FR-07]`
- [x] **T-14** [S] Exception filter global + formato estándar de error `[FR-08]`

## Milestone 3 — Endpoint de métricas (núcleo)

- [x] **T-20** ⭐ [L] Query de agregación por agente (`$queryRaw`): total, resueltas, tasa de resolución, tiempo promedio de resolución — calculado en DB `[FR-04]`
- [x] **T-21** ⭐ [L] Query de serie de volumen por día con `date_trunc(... AT TIME ZONE 'America/Bogota')` `[FR-05]`
- [x] **T-22** ⭐ [M] Conversión de `dateFrom`/`dateTo` (fechas locales Bogotá) a límites UTC antes de consultar `[FR-05, NFR-02]`
- [x] **T-23** [S] `GET /metrics?dateFrom&dateTo` que combina T-20 + T-21 en una respuesta `[FR-04, FR-05]`
- [x] **T-24** ⭐ [M] Unit tests: cálculo de métricas + caso borde de cruce de medianoche COT `[NFR-01, NFR-02]`
- [x] **T-25** [S] Unit tests: máquina de estados (transiciones válidas/inválidas) `[FR-02]`

## Milestone 4 — Frontend mínimo

- [ ] **T-30** [S] Setup React + TypeScript + Tailwind, cliente HTTP tipado `[Plan §2]`
- [ ] **T-31** [M] Vista de listado de interacciones: tabla + filtros (agente, estado, rango fechas) + paginación, estados de carga/error `[FR-06]`
- [ ] **T-32** [M] Vista de métricas: tabla por agente + gráfico simple de volumen por día, estados de carga/error `[FR-06]`

## Entregables

- [ ] **T-90** Seed ejecutable documentado (`npm run seed`) `[FR-09]`
- [ ] **T-91** README: instalación, cómo levantar (backend+frontend+DB), cómo probar, lista de endpoints
- [ ] **T-92** `decisions.md` completo: actualizar §5 con decisiones tomadas durante implementación, completar §6 (uso de IA) con casos reales, revisar §7

## Plan de recorte (si el tiempo se acaba)

1. Recortar primero: gráfico de volumen en frontend → sustituir por tabla simple (sigue cumpliendo FR-06).
2. Luego: tests de la máquina de estados (T-25) — mantener siempre T-24 (timezone), es lo más evaluado.
3. Luego: paginación avanzada en frontend (dejar solo next/prev simple).
4. Nunca recortar: T-11 (máquina de estados), T-20/T-21/T-22 (núcleo de métricas + timezone), T-92 (decisions.md) — son los de mayor peso en la rúbrica.

## Ideas fuera de alcance (aparecidas durante implementación)

- CRUD de agentes, autenticación, gestión de turnos — confirmadas fuera de alcance en spec.md §11. No implementar salvo que el usuario cambie de decisión.
