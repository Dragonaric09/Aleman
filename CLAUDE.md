# Wortschatz SRS — guía para Claude Code

## Fuente de verdad
- La especificación es docs/ESPECIFICACION.pdf. Si algo no está claro, elige la opción más
  simple compatible con ella y regístrala en docs/DECISIONES.md. No inventes funciones fuera
  del alcance de la versión 1.

## Arquitectura (no negociable)
- Monolito modular en una sola app Next.js. Nada de microservicios, Redis ni colas.
- UI -> módulos (src/modules/*/index.ts) -> infraestructura (src/server). Nunca al revés.
- Componentes y páginas NO importan Prisma. Todo repositorio recibe userId primero.
- Lógica pura sin E/S y con `now` inyectado. ts-fsrs solo se importa en srs/fsrs-scheduler.ts.
- Operaciones multi-tabla dentro de prisma.$transaction.

## Convenciones
- Código, identificadores y BD en inglés; UI, errores al usuario y docs en español.
- TypeScript strict, sin `any` implícito. Validación con Zod en todas las entradas.
- Commits pequeños y convencionales. Una fase = una rama o un bloque de commits.
- Cambios de esquema SIEMPRE con `pnpm db:migrate` (nunca editar migraciones aplicadas).

## Antes de dar una fase por terminada
1. pnpm check
2. pnpm test && pnpm test:int (con docker compose -f docker-compose.test.yml up -d)
3. pnpm test:e2e cuando la fase toca UI
4. docker compose up --build y comprobar /api/health

## Vocabulario
- Los .docx de materiales/clases: en este repositorio son Word reales; se extrae word/document.xml.
- Los PDF tienen OCR ruidoso: corrige (Caf6 -> Café, lch -> Ich) y, si dudas, mira la página como imagen.
- Nunca guardes un sustantivo sin género. Anota toda duda en data/REVISION.md.

## Historias y Gramática
- Contenido en data/gramatica/*.yml y data/historias/*.md (guía: docs/CONTENIDO.md). Valida con `pnpm content:validate`.
- Historias originales (nunca copiar el libro), elenco fijo en Lindenau, cobertura léxica ≥ 95 %.
- Leer historias NUNCA modifica Card ni ReviewLog (no afecta FSRS).

## Pedagogía (no romper)
- Producción (español -> alemán) exige escribir antes de ver la respuesta.
- Orden de nuevas: A★ -> A -> B -> C. Máx. 1 tarjeta por palabra al día.
- Colores de género: der #2563EB, die #DC2626, das #16A34A, siempre junto al artículo escrito.
