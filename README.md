# Wortschatz SRS

Aplicación web personal para aprender el vocabulario alemán de **Menschen A1.2 (lecciones 13–16)** y de tus apuntes de clase con dos técnicas respaldadas por la investigación: **recuperación activa** (escribes la respuesta antes de verla) y **repaso espaciado** (FSRS programa cada repaso justo antes de que olvides la palabra).

A diferencia de Anki, conoce la gramática alemana: exige artículo y plural en los sustantivos, trata verbos separables e irregulares, colorea el género (**der** azul, **die** rojo, **das** verde, siempre con el artículo escrito) y avisa de los falsos amigos.

## Puesta en marcha (Docker)

Requisitos: Docker con Compose v2.

```bash
cp .env.example .env
```

Edita `.env` y cambia al menos `POSTGRES_PASSWORD` (y la misma clave dentro de `DATABASE_URL`). Luego:

```bash
docker compose up --build
```

En unos minutos la app está en <http://localhost:3000> (`APP_PORT` cambia el puerto). El servicio `migrate` aplica las migraciones y carga el catálogo de `data/vocabulario.csv` antes de arrancar la app. Comprueba la salud con <http://localhost:3000/api/health>.

- **Registro:** crea tu cuenta en `/registro`. Para cerrarlo después, pon `ALLOW_REGISTRATION=false`.
- **Usuario de demostración (opcional):** define `SEED_DEMO_EMAIL` y `SEED_DEMO_PASSWORD` (mín. 10 caracteres) antes del primer arranque.
- **Persistencia:** `docker compose down` conserva los datos en el volumen `pgdata`. **`docker compose down -v` los borra.**

### Copias de seguridad de la base de datos

```bash
scripts/backup.sh
```

Guarda `backups/deutsch_AAAA-MM-DD_HHMM.sql.gz`. Para restaurar (pide escribir RESTAURAR):

```bash
scripts/restore.sh backups/deutsch_2026-10-07_0900.sql.gz
```

Además, cada usuario puede descargar su propia copia JSON en **Importar / exportar**.

## Uso diario

| Página | Para qué |
|---|---|
| **Panel** (`/`) | Nuevas disponibles, repasos pendientes, racha, progreso por nivel y previsión de 7 días |
| **Estudiar** | Sesión con corrección inmediata, diff carácter a carácter, audio y calificación 1–4 |
| **Practicar** | Drill der/die/das y repaso por lección **sin afectar** la programación |
| **Vocabulario** | Buscar y filtrar, ver fichas, crear palabras propias, «crear copia propia» de una global |
| **Rebeldes** | Tarjetas que olvidas a menudo, con espacio para tu truco (mnemotecnia) |
| **Estadísticas** | Racha, heatmap de 90 días, repasos por día, retención real, previsión de 30 días |
| **Importar / exportar** | CSV (con vista previa y errores por fila), CSV para Anki, copia JSON y restauración |
| **Ajustes** | Carga diaria, retención, inicio del día, tipos de tarjeta, voz y contraseña |

**Atajos en la sesión de estudio:** Enter comprobar / confirmar la sugerida · 1–4 calificar · Espacio revelar (reconocimiento) · U deshacer · P audio · E abrir ficha · Alt+a/o/u/s para ä ö ü ß · ? lista de atajos.

Reglas de carga por defecto: 12 nuevas al día (5–30); si los repasos pendientes superan 120 no entran nuevas; retención deseada 0,90; el día de estudio empieza a las 04:00 de tu zona horaria. Todo se ajusta en `/ajustes`.

## Desarrollo

Requisitos: Node.js 22+, pnpm (vía `corepack`), Docker.

```bash
corepack enable
pnpm install
docker compose -f docker-compose.dev.yml up -d
```

Crea `.env.local` con la URL de la base de desarrollo (los scripts `db:*`, `pnpm dev` y los tests la leen; `.env` queda para Docker):

```
DATABASE_URL=postgresql://deutsch:deutsch@localhost:5432/deutsch_dev?schema=public
TEST_DATABASE_URL=postgresql://test:test@localhost:5433/deutsch_test?schema=public
```

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Si los puertos 5432/5433 están ocupados: `DEV_DB_PORT=55432 docker compose -f docker-compose.dev.yml up -d` (y ajusta `.env.local`).

### Scripts

| Script | Acción |
|---|---|
| `pnpm dev` | Next.js en modo desarrollo |
| `pnpm build` / `pnpm start` | Compilación standalone / servidor de producción |
| `pnpm check` | `tsc --noEmit`, ESLint (con reglas de arquitectura) y Prettier |
| `pnpm test` | Pruebas unitarias (Vitest) |
| `pnpm test:int` | Integración contra `db_test` (`docker compose -f docker-compose.test.yml up -d`) |
| `pnpm test:e2e` | Playwright contra la app en marcha (`E2E_BASE_URL`, `PW_CHANNEL=chrome` para usar Chrome instalado) |
| `pnpm db:migrate` / `db:seed` / `db:studio` | Migraciones, semilla idempotente, Prisma Studio |
| `pnpm vocab:validate` | Valida `data/vocabulario.csv` con el esquema de importación |

### Arquitectura

Monolito modular: una sola app Next.js 15 (App Router) + PostgreSQL 16 vía Prisma 6.

```
src/app          páginas, Server Actions y Route Handlers (/api)
src/modules      auth · vocabulary · srs · study · stats · transfer · settings
src/server       Prisma, logger (pino), reloj inyectable, entorno (Zod)
```

- La UI solo habla con los módulos (`index.ts`, o `shared.ts` para código puro de cliente); nunca importa Prisma. ESLint lo hace cumplir.
- La lógica pura (corrección de respuestas, cola diaria, prioridad, día de estudio, racha) no hace E/S y recibe `now` inyectado.
- `ts-fsrs` solo se importa en `src/modules/srs/fsrs-scheduler.ts`, detrás de la interfaz `Scheduler`.
- Todo repositorio filtra por `userId`; las operaciones multi-tabla van en transacciones.

### Documentación

- `docs/ESPECIFICACION.pdf` — especificación completa (fuente de verdad)
- `docs/DECISIONES.md` — decisiones tomadas durante la implementación
- `docs/DISENO.md` — sistema de diseño «Cuaderno» (tokens y componentes)
- `docs/ACCESIBILIDAD.md` — auditoría WCAG 2.1 AA
- `data/REVISION.md` — dudas de la extracción del vocabulario **(revísalas)**

## Vocabulario

`data/vocabulario.csv` (481 palabras) y `data/lecciones.csv` se extrajeron del Kursbuch y Arbeitsbuch (lecciones 13–16, páginas «Lernwortschatz») y de cinco apuntes de clase. Para añadir lecciones, agrega filas con el mismo formato y ejecuta `pnpm vocab:validate` y `pnpm db:seed` (o importa un CSV desde la app como palabras propias).
