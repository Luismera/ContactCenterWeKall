# Mini panel de Contact Center (Engage 360) — WeKall

Prueba técnica full-stack Node: servicio que centraliza la actividad de un equipo de
atención (llamadas y tickets) y expone métricas operativas confiables por agente y
por día, respetando la zona horaria de la operación (Colombia, UTC-5).

Documentación del proceso de diseño: [`specs/001-panel-contact-center/`](specs/001-panel-contact-center/)
(spec, plan, tasks) y [`DECISIONS.md`](DECISIONS.md) (razonamiento y trade-offs).

## Stack

- **Backend:** NestJS + TypeScript, PostgreSQL + Prisma.
- **Frontend:** React + TypeScript + TailwindCSS + Recharts.
- **Infraestructura local:** Docker Compose (Postgres).

## Requisitos previos

- Node.js 20+
- Docker (para levantar Postgres localmente)

## 1. Backend

```bash
cd backend
npm install

# Levanta Postgres local en el puerto 5432
docker compose up -d

# Variables de entorno (ya vienen con defaults funcionales para desarrollo local)
cp .env.example .env

# Migraciones
npx prisma migrate dev

# Datos de ejemplo (agentes + ~400-500 interacciones, incluye casos que cruzan medianoche COT)
npm run seed

# Levantar la API (http://localhost:3000)
npm run start:dev
```

Tests unitarios (lógica de negocio: máquina de estados y cálculo de métricas con timezone):

```bash
npm test
```

## 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env

# http://localhost:5173
npm run dev
```

El frontend espera la API en `http://localhost:3000` (configurable vía `VITE_API_URL` en `frontend/.env`).

## Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/interactions` | Crea una interacción (`{ type: "call"\|"ticket", agentId }`). Queda en estado `open`. |
| `PATCH` | `/interactions/:id/status` | Cambia el estado (`{ status: "in_progress"\|"resolved" }`). Transición estricta y solo hacia adelante: `open → in_progress → resolved`. |
| `GET` | `/interactions` | Lista con filtros `agentId`, `status`, `dateFrom`, `dateTo` y paginación `page`/`limit` (máx. 100). |
| `GET` | `/agents` | Lista de agentes (solo lectura, poblada por el seed). |
| `GET` | `/metrics?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` | Por agente: total, resueltas, tasa de resolución, tiempo promedio de resolución (segundos). Además, serie de volumen diario agrupada en `America/Bogota`. |

Ejemplo rápido:

```bash
curl "http://localhost:3000/metrics?dateFrom=2026-06-01&dateTo=2026-07-15"
```

## Cómo probar manualmente el caso borde de zona horaria

El seed genera interacciones con horas variadas de Bogotá, incluyendo el rango
19:00–23:59 (que cae en el día siguiente en UTC). El endpoint `/metrics` agrupa
`dailyVolume` usando `date_trunc(... AT TIME ZONE 'America/Bogota')`, por lo que
esas interacciones deben aparecer en su día local correcto, no en el día UTC
siguiente. Ver `backend/src/metrics/date-range.util.spec.ts` para el test
automatizado de este caso, y `DECISIONS.md` sección 4 para el detalle de la
verificación manual (conteos cruzados contra `psql`).

## Estructura del repositorio

```
backend/    API NestJS + Prisma (interactions, metrics, agents)
frontend/   React + Tailwind (listado de interacciones, dashboard de métricas)
specs/      Spec-Driven Development: spec.md, plan.md, tasks.md
DECISIONS.md   Documento de decisiones de diseño (entregable de la prueba)
```
