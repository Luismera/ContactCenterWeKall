# Plan 001 — Mini panel de Contact Center (Engage 360)

**Fecha:** 2026-07-14 · **Estado:** aprobado (2026-07-15) · **Spec:** `spec.md` (aprobado 2026-07-15)

## 1. Arquitectura general

Arquitectura en capas, monorepo simple con dos paquetes (`backend/`, `frontend/`):

```
backend/ (NestJS + TypeScript)
  src/
    interactions/
      interactions.controller.ts   → HTTP, DTOs, validación de entrada
      interactions.service.ts      → lógica de negocio (transición de estados, reglas)
      interactions.repository.ts   → acceso a datos (Prisma)
    metrics/
      metrics.controller.ts        → HTTP
      metrics.service.ts           → orquesta queries de agregación
      metrics.repository.ts        → queries de agregación (SQL/Prisma)
    agents/
      agents.controller.ts         → GET solo lectura
      agents.service.ts
    common/
      filters/                     → exception filter global
      pipes/                       → validación (class-validator/Zod)
    prisma/                        → PrismaService, schema.prisma
  prisma/seed.ts                   → script de seed

frontend/ (React + TypeScript + Tailwind)
  src/
    features/interactions/         → listado + filtros
    features/metrics/               → tabla/gráfico de métricas
    api/                            → cliente HTTP tipado
```

Flujo de una petición: `controller` (recibe HTTP, valida DTO) → `service` (reglas de negocio: transición de estados válida, cálculo de tasa de resolución) → `repository`/Prisma (acceso a datos, queries de agregación). La lógica de negocio nunca vive en el controller ni en el repository.

## 2. Stack y justificación

| Componente | Elección | Justificación |
|------------|----------|----------------|
| Backend | NestJS + TypeScript | Stack default de DeltaByte. Da estructura en capas (controller/service/repository) lista, que mapea directamente al criterio "Arquitectura" (25% del peso) y a exception filters centralizados para manejo de errores. |
| Base de datos | PostgreSQL | Contra criterios de constitución: hay relación fuerte agente↔interacción, y el núcleo del proyecto son agregaciones/reporting (GROUP BY por agente, por día) con exigencia explícita de corrección en zona horaria — el caso de uso de referencia para relacional. Mongo también podría resolverlo (aggregation pipeline con `$dateToString` timezone), pero Postgres con `date_trunc(... AT TIME ZONE ...)` es más directo y auditable para este dominio, y el volumen de datos (cientos-miles de filas) no necesita el modelo de documentos. |
| ORM | Prisma | Type-safety end-to-end con TS, migraciones simples, y permite caer a `$queryRaw` para la agregación con timezone que el query builder de Prisma no expresa nativamente. |
| Frontend | React + TypeScript + TailwindCSS | Stack default de DeltaByte. El documento no pide pulido visual, así que Tailwind + componentes simples (tabla + un gráfico de barras ligero) alcanza sin sobre-invertir tiempo. |
| Librería de gráfico | Recharts (o tabla simple si el tiempo aprieta) | Ligera, declarativa, suficiente para una serie de volumen por día. |
| Validación | class-validator + DTOs (Nest) | Estándar de constitución para el borde de la API. |

## 3. Modelo de datos

**Entidad `Agent`**
- `id` (uuid, PK)
- `name` (string)
- `createdAt`

**Entidad `Interaction`**
- `id` (uuid, PK)
- `type` (enum: `call` | `ticket`)
- `status` (enum: `open` | `in_progress` | `resolved`)
- `agentId` (FK → Agent)
- `openedAt` (timestamptz, UTC)
- `closedAt` (timestamptz, UTC, nullable)
- `createdAt`, `updatedAt`

Relación: `Agent 1—N Interaction`. Diseñado desde las dos consultas dominantes: (a) listar/filtrar interacciones por agente+estado+rango de fechas, (b) agregar por agente y por día dentro de un rango — ambas se resuelven con un índice compuesto sobre `(agentId, openedAt)` y uno sobre `(status)`.

Nombres de enum en inglés (`call`/`ticket`/`open`/`in_progress`/`resolved`) siguiendo convención de constitución (código en inglés); el documento usa español (`llamada`/`ticket`/`abierta`/...) solo como texto de negocio — se mapea en el DTO/presentación si hace falta.

### Índices y por qué

- `Interaction(agentId, openedAt)` — soporta filtro por agente + rango de fechas y la agregación de métricas por agente.
- `Interaction(status)` — soporta filtro por estado en el listado.
- `Interaction(openedAt)` — soporta la serie de volumen por día sin filtro de agente.

## 4. Diseño de API

| Método | Ruta | Descripción | Parámetros | Respuesta |
|--------|------|-------------|------------|-----------|
| POST | `/interactions` | Crea una interacción | body: `{ type, agentId }` | 201, interacción creada (`status: open`, `openedAt: now() UTC`) |
| PATCH | `/interactions/:id/status` | Cambia el estado | body: `{ status }` | 200, interacción actualizada; 409 si transición inválida |
| GET | `/interactions` | Lista con filtros y paginación | query: `agentId?, status?, dateFrom?, dateTo?, page=1, limit=20` | 200, `{ data: [...], meta: { total, page, limit } }` |
| GET | `/agents` | Lista agentes (solo lectura) | — | 200, `[{ id, name }]` |
| GET | `/metrics` | Métricas por agente + serie diaria | query: `dateFrom, dateTo` (requeridos) | 200, `{ byAgent: [{ agentId, agentName, total, resolved, resolutionRate, avgResolutionSeconds }], dailyVolume: [{ date, count }] }` |

**Paginación:** offset-based (`page`/`limit`), default `limit=20`, tope máximo `limit=100`. **Errores:** formato estándar `{ statusCode, message, error }` vía exception filter global de Nest; 400 para validación, 404 para recursos inexistentes, 409 para transición de estado inválida.

## 5. Puntos críticos (requisitos ⭐ núcleo)

### Endpoint de métricas con timezone

- **Agregación por agente:** una sola query SQL agrupando por `agentId` con `COUNT(*)`, `COUNT(*) FILTER (WHERE status = 'resolved')`, y `AVG(closed_at - opened_at)` filtrado a resueltas — todo calculado en Postgres, no en memoria. Se ejecuta vía `prisma.$queryRaw` (Prisma `groupBy` no soporta bien la resta de timestamps + filtro condicional en una sola pasada de forma legible).
- **Serie de volumen por día en UTC-5:** `date_trunc('day', opened_at AT TIME ZONE 'America/Bogota')` como clave de agrupamiento, `GROUP BY` esa expresión, `ORDER BY` ascendente. Esto asegura que una interacción de las 20:00 hora Colombia (01:00 UTC del día siguiente) se cuente en su día local correcto, no en el día UTC.
- **Alternativas descartadas:** (1) traer todas las interacciones del rango a memoria y agrupar con JS — descartado porque no escala y es exactamente lo que el documento marca como solución frágil; (2) guardar además un campo `openedAtLocal` calculado en el insert — descartado porque duplica la fuente de verdad y puede desincronizarse; mejor derivar la fecha local en la query.
- **Rango de fechas de entrada:** `dateFrom`/`dateTo` se interpretan como fechas locales (America/Bogota) y se convierten a límites UTC en el service antes de consultar, para que el filtro de "rango de fechas" también respete la zona horaria de la operación.

## 6. Validación y manejo de errores

- DTOs con `class-validator` en cada endpoint de escritura (`CreateInteractionDto`, `UpdateStatusDto`, `MetricsQueryDto`): tipos de enum válidos, `agentId` con formato UUID, fechas ISO válidas y `dateFrom <= dateTo`.
- `agentId` inexistente → 404 explícito (se valida contra la tabla `Agent` antes de crear/filtrar).
- Transición de estado inválida (salto o retroceso) → 409 con mensaje indicando el estado actual y el destino rechazado.
- Exception filter global normaliza cualquier error no controlado a una respuesta 500 con mensaje genérico (nunca stack trace al cliente).

## 7. Seed y datos de prueba

- 5-8 agentes.
- 300-500 interacciones distribuidas en un rango de ~30 días, mezclando `call`/`ticket` y los tres estados (algunas quedan `open`/`in_progress` a propósito para probar que las métricas de resolución no las cuenten como resueltas).
- Timestamps generados de forma que varias interacciones abran entre las 19:00 y 23:59 hora Colombia — para forzar el caso borde de cruce de medianoche UTC y verificar que la serie diaria las agrupe en el día local correcto.
- Script idempotente (`prisma/seed.ts`, ejecutable vía `npm run seed` / `prisma db seed`).

## 8. Estrategia de testing

Prioridad total al núcleo evaluado, no a cobertura:
- Unit tests del cálculo de métricas (tasa de resolución, tiempo promedio) con datos controlados.
- Test específico del caso borde de timezone (interacción a las 20:00 COT cae en el día correcto, no en el UTC+1).
- Unit tests de la máquina de estados (transiciones válidas e inválidas).
- Sin tests de UI ni de infraestructura — no aportan al peso evaluado (5% "Tests y DX") tanto como los de negocio.

## 9. Riesgos y trade-offs

| Decisión | Costo asumido | Por qué vale la pena |
|----------|----------------|------------------------|
| `$queryRaw` para la agregación de métricas en vez de Prisma `groupBy` | Se pierde parte del type-safety automático de Prisma en esa query puntual | Es la única forma legible de expresar `AVG` condicional + `AT TIME ZONE` en una sola query eficiente; se tipa el resultado manualmente |
| Sin autenticación | El panel queda abierto sin control de acceso | Fuera de alcance explícito del documento; agregarlo consumiría tiempo del núcleo evaluado (ver aclaración en spec) |
| Sin CRUD de agentes | No se puede dar de alta un agente nuevo desde la UI | El documento no lo pide; se cubre con seed + GET de solo lectura (ver aclaración en spec) |
| Paginación offset (no cursor) | Menos eficiente que cursor en tablas muy grandes | El volumen esperado (cientos-miles de filas para una prueba técnica) no lo justifica; offset es más simple de implementar y de consumir desde el frontend |

## 10. Aclaraciones

### Pendientes

*(ninguna)*

### Resueltas

Ver `spec.md` sección 11 (mismo gate, modo express): sin CRUD de agentes, sin autenticación, transición de estados estricta y solo hacia adelante — las tres confirmadas por el usuario (2026-07-15).
