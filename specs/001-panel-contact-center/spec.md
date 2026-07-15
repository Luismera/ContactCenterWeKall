# Spec 001 — Mini panel de Contact Center (Engage 360)

**Fecha:** 2026-07-14 · **Estado:** aprobado (2026-07-15) · **Fuente:** documento (`docs/PRUEBA-WEKALL-FULL-STACK.pdf`)

## 1. Problema y contexto

WeKall centraliza voz, chat e IA en una plataforma de contact center (Engage 360). Esta prueba técnica pide construir una versión mínima: un servicio que registre la actividad de un equipo de atención (llamadas y tickets) y exponga métricas operativas confiables. La operación es en Colombia (UTC-5). El líder del equipo necesita responder tres preguntas: cuántas interacciones atendió cada agente y cuántas resolvió, cuál es su tiempo promedio de resolución, y cómo se comporta el volumen de interacciones por día en un rango de fechas.

El reto no es la cantidad de funciones sino modelar bien el dominio y que las métricas sigan siendo correctas y eficientes cuando los datos crecen. Es una prueba técnica evaluada con rúbrica de pesos (ver sección 10); el documento de decisiones (`DECISIONS.md`) es un entregable tan importante como el código.

## 2. Objetivos

- Registrar interacciones (llamadas y tickets) asignadas a un agente, con ciclo de vida de estados y timestamps de apertura/cierre.
- Exponer un endpoint de métricas por agente (totales, resueltos, tasa de resolución, tiempo promedio de resolución) correcto y eficiente sobre volúmenes grandes de datos.
- Exponer una serie de volumen de interacciones por día, agrupada en la zona horaria de la operación (America/Bogota, UTC-5), no la del servidor.
- Ofrecer una interfaz mínima que consuma la API con sensatez (listado + filtros, vista de métricas, manejo de carga/error).

## 3. No-objetivos (fuera de alcance)

- Autenticación/login de usuarios (no lo pide el documento; ver aclaración pendiente).
- Gestión de turnos/jornadas de agentes como entidad independiente (el problema solo pide métricas de interacciones, no control horario).
- Soporte de canales distintos a `llamada` y `ticket`.
- Pulido visual del frontend — el documento explícitamente no lo evalúa.
- Funciones adicionales fuera de lo descrito (el documento prefiere alcance acotado bien resuelto antes que cobertura amplia).
- Multi-tenant / múltiples equipos u organizaciones.

## 4. Actores

| Actor | Descripción | Necesidad principal |
|-------|-------------|---------------------|
| Agente | Atiende llamadas y tickets a lo largo de su jornada | Que su actividad quede registrada con estados y timestamps correctos |
| Líder de equipo | Supervisa la operación de contact center | Panel con listado filtrable y métricas confiables por agente y por día |

## 5. User stories

- **US-01** — Como agente (o sistema que registra su actividad), quiero crear una interacción (llamada o ticket) asignada a un agente con timestamp de apertura, para dejar constancia de cada atención iniciada.
- **US-02** — Como agente, quiero cambiar el estado de una interacción (`abierta` → `en_progreso` → `resuelta`) para reflejar su avance, y que al resolverla quede registrado el timestamp de cierre.
- **US-03** — Como líder de equipo, quiero listar interacciones filtrando por agente, estado y rango de fechas, con paginación, para auditar la operación diaria.
- **US-04** — Como líder de equipo, quiero ver por agente el total de interacciones, las resueltas, la tasa de resolución y el tiempo promedio de resolución en un rango de fechas, para evaluar desempeño.
- **US-05** — Como líder de equipo, quiero ver el volumen de interacciones por día dentro de un rango, respetando la hora de Colombia, para detectar patrones de carga reales (una interacción de las 8 p.m. en Cali pertenece a ese día, no al siguiente en UTC).
- **US-06** — Como líder de equipo, quiero una interfaz mínima donde ver el listado de interacciones y las métricas, con estados de carga y error visibles, para no depender de llamar la API directamente.

## 6. Requisitos funcionales

| ID | Requisito | Prioridad | Criterio de aceptación |
|----|-----------|-----------|------------------------|
| FR-01 | Crear interacción (tipo `llamada`/`ticket`, agente asignado, timestamp de apertura) | MUST | POST devuelve 201 con la interacción en estado `abierta` y timestamp de apertura almacenado en UTC |
| FR-02 | Cambiar estado de interacción: `abierta` → `en_progreso` → `resuelta`; al resolver se registra timestamp de cierre | MUST | Transición inválida (salto o retroceso) devuelve error 4xx explícito; resolver registra `closedAt` no nulo |
| FR-03 | Listar interacciones con filtros (agente, estado, rango de fechas) y paginación | MUST | GET soporta `page`/`limit` y filtros combinables; respuesta incluye metadata de paginación (total, page, limit) |
| FR-04 | ⭐NÚCLEO — Endpoint de métricas por agente en un rango de fechas: total interacciones, total resueltas, tasa de resolución, tiempo promedio de resolución | ⭐NÚCLEO | El cálculo se resuelve mediante agregación en base de datos (no cargar todo a memoria); correcto con cientos/miles de registros |
| FR-05 | ⭐NÚCLEO — Serie de volumen de interacciones por día dentro del rango, agrupada en zona horaria America/Bogota (UTC-5) | ⭐NÚCLEO | Una interacción abierta a las 20:00 hora Colombia se cuenta en su día local correspondiente, no en el día UTC siguiente |
| FR-06 | Interfaz mínima: vista de listado con filtros + vista de métricas (tabla o gráfico simple) | MUST | La UI consume la API real, muestra estado de carga (spinner/skeleton) y mensaje de error ante fallo de red o de la API |
| FR-07 | Listado de agentes de solo lectura para poblar filtros de la UI | MUST (implícito) | GET de agentes devuelve los agentes sembrados por el seed |
| FR-08 | Validación explícita de entradas inválidas (tipo, estado, fechas, agente inexistente) | MUST | Entradas inválidas devuelven 400 con mensaje claro; nunca 500 no controlado ni comportamiento silencioso |
| FR-09 | Seed de datos: cientos de interacciones, varios agentes, fechas que crucen medianoche (hora Colombia) | MUST | Script ejecutable que puebla la base y permite que las métricas se vean con datos no triviales |

## 7. Requisitos no funcionales

| ID | Requisito | Detalle |
|----|-----------|---------|
| NFR-01 | Rendimiento | Agregaciones y métricas calculadas EN la base de datos (GROUP BY / pipeline), nunca trayendo todo a memoria para sumar en un loop |
| NFR-02 | Zona horaria | Timestamps almacenados siempre en UTC; agrupamiento "por día" en America/Bogota (UTC-5) |
| NFR-03 | Manejo de errores | Estrategia centralizada y explícita en toda la API (sin camino feliz asumido) |
| NFR-04 | Escalabilidad de datos de prueba | El endpoint de métricas debe seguir siendo correcto y razonablemente eficiente con volúmenes de miles de registros |

## 8. Restricciones impuestas

- Backend en Node.js (JavaScript o TypeScript) — impuesto por el documento.
- Framework, base de datos y ORM/driver: libre elección, pero debe justificarse en `DECISIONS.md`.
- Frontend: libre elección (React, Vue u otro), puede ser sencillo.
- Uso de IA permitido y sin límite, pero debe documentarse (qué generó, qué estuvo mal, qué se corrigió).
- Tiempo estimado por el documento: 1h-2h — orientativo; el propio enunciado prioriza "alcance acotado y bien resuelto" sobre cobertura amplia, así que el tiempo no debe forzar recortes al núcleo evaluado (métricas, timezone).

## 9. Entregables exigidos

- [ ] Repositorio Git con el código, instrucciones de arranque claras y el script de seed.
- [ ] `DECISIONS.md` — arquitectura general, modelo de datos, resolución del endpoint de métricas (agregación + timezone), trade-offs, uso de IA, qué se haría distinto en producción.
- [ ] `README.md` — instalación, cómo levantar, cómo probar, endpoints disponibles.

## 10. Criterios de evaluación/aceptación del proyecto

Rúbrica original del documento fuente (preservada tal cual, pesos sobre 100):

| Criterio | Qué miran | Peso |
|----------|-----------|------|
| Arquitectura | Separación de responsabilidades, claridad estructural, dónde vive cada cosa | 25 |
| Calidad de código | Legibilidad, nombres, manejo de errores, consistencia | 20 |
| Núcleo: métricas | Agregación correcta y eficiente, zona horaria bien resuelta, casos borde | 20 |
| API y modelo de datos | Diseño de endpoints, modelado del dominio, filtros y paginación | 15 |
| Documento de decisiones | Claridad del razonamiento, trade-offs honestos, uso reflexivo de IA | 15 |
| Tests y DX | Pruebas donde aportan, README claro, facilidad para levantarlo | 5 |
| **Total** | | **100** |

Nota del documento fuente: "Un proyecto pequeño, bien pensado y bien explicado supera a uno grande y desordenado."

## 11. Aclaraciones

### Pendientes

*(ninguna)*

### Resueltas

- ¿Los agentes requieren gestión propia (CRUD) o solo lectura/seed? → Decisión del usuario: solo lectura/seed (2026-07-15).
- ¿Se requiere autenticación/login? → Decisión del usuario: no (2026-07-15).
- ¿Transición de estados estricta y solo hacia adelante, o flexible? → Decisión del usuario: estricta y solo hacia adelante (2026-07-15).
