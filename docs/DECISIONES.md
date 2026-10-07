# Registro de decisiones (ADR breves)

Decisiones tomadas durante la implementación que la especificación no fijaba o que obligaron a desviarse de ella.

## D-01 · Versiones instaladas
Se instaló la última versión estable de cada línea mayor indicada: Next.js 15.5, React 19, Prisma 6.19, Tailwind CSS 4, TypeScript 5.9, ts-fsrs 5.4, Zod 4, Vitest 5, Playwright 1.63, pnpm 10 (vía corepack). Existen Prisma 7/8 y TypeScript 7, pero se respetaron las mayores de la tabla del stack.

## D-02 · Apuntes de clase: Word real, no Markdown
Los `.docx` de `materiales/clases` son archivos Word (ZIP). Se extrajo el texto de `word/document.xml`. Además, `M3_Clase_4.docx` es internamente la «Clase 7», por eso su código de fuente es `CLASE7`.

## D-03 · Materiales fuera de git
Los PDF y DOCX de `materiales/` (escaneos con derechos de autor) se copian al repositorio pero están en `.gitignore`. El vocabulario extraído vive en `data/`, que sí se versiona.

## D-04 · API de cliente de cada módulo (`shared.ts`)
`index.ts` es la API pública de servidor de cada módulo (puede usar Prisma). Las funciones puras que también necesita el navegador (`checkAnswer`, contenido de tarjetas, tipos, colores de género) se exponen en `src/modules/<modulo>/shared.ts`. ESLint solo permite importar `@/modules/<m>` o `@/modules/<m>/shared` desde fuera del módulo, y prohíbe `@prisma/client`, `@/server/db` y `ts-fsrs` en la UI.

## D-05 · Tarjetas creadas por adelantado y sincronizadas
Las tarjetas (estado NEW) se crean para todas las palabras visibles del usuario según la tabla 7.1 y los tipos activados. Como la semilla nunca toca tarjetas, `syncCards` crea las que falten (`createMany … skipDuplicates`) al construir la cola; una firma en memoria (nº de palabras + última modificación + tipos activados) evita repetir el trabajo.

## D-06 · `newCardsPerDay` cuenta tarjetas nuevas
El límite diario cuenta las tarjetas introducidas (`ReviewLog.isNewCard`), incluidas las secundarias. El primer día coincide con «12 palabras»; después, las secundarias también consumen cupo, lo que mantiene la carga sostenible. `reviewsDoneToday` cuenta solo repasos desde el estado REVIEW.

## D-07 · Hermanas en aprendizaje
Una tarjeta en aprendizaje ya respondida hoy sigue en la cola (es la misma tarjeta), pero las demás tarjetas de esa palabra se omiten. Se añadió `cardsSeenToday` a la entrada de `buildQueue`. También se deduplican repasos de la misma palabra.

## D-08 · Intervalo máximo estricto
ts-fsrs puede programar EASY 1–2 días por encima de `maximum_interval` para mantener EASY > GOOD. El adaptador recorta el intervalo a `maximumIntervalDays`.

## D-09 · Prioridad 7.2 tal cual
Con la fórmula exacta, una palabra A sin ★ pero con rango de frecuencia ≤ 1000 podría superar a una A★ cognada. Con los datos actuales (sin `frequency_rank` y ★ exige ≥ 3 fuentes) el orden A★ → A → B → C se cumple siempre; se mantuvo la fórmula sin modificarla.

## D-10 · Detalles de `checkAnswer`
- Palabras de menos de 4 letras no admiten errores tipográficos (la regla 5 solo define 4..9 y ≥ 10).
- En español, la tolerancia de Levenshtein ≤ 2 solo se aplica si la alternativa tiene al menos 4 letras.
- VERB_FORMS se escribe en dos campos que se envían como «tercera persona / Perfekt»; se acepta el pronombre (`er biegt ab`). Si el auxiliar del Perfekt no coincide, el veredicto es WRONG con la pista del auxiliar.
- SEPARABLE_ORDER exige el orden exacto (sin la puntuación final).

## D-11 · Deshacer en cadena
El contador de «hasta 10 deshacer seguidos» vive en memoria del proceso (como el límite de intentos): se reinicia con cada repaso nuevo. Suficiente en un monolito de una instancia.

## D-12 · «Crear copia propia» oculta la global
Al copiar una palabra global, sus tarjetas se suspenden para no estudiar dos veces la misma palabra; las notas se copian.

## D-13 · Ajuste extra `ttsVoice`
Se añadió `UserSettings.ttsVoice` (nombre de la voz de-DE elegida) porque la sección 8.1 pide elegir la voz en /ajustes.

## D-14 · Puertos de desarrollo configurables
`docker-compose.dev.yml` y `docker-compose.test.yml` usan `DEV_DB_PORT` / `TEST_DB_PORT` (por defecto 5432 / 5433) por si esos puertos ya están ocupados. El `.env` es el de Docker (copiado de `.env.example`); el desarrollo local usa `.env.local`, que leen `pnpm dev`, los scripts `db:*` (vía `scripts/with-env.mjs`) y los tests.

## D-15 · Tests de integración sin `migrate reset`
Prisma bloquea `migrate reset` cuando lo invoca un agente de IA. Como `db_test` es efímera (tmpfs), el setup global usa `prisma migrate deploy` + semilla idempotente, y cada test limpia usuarios y palabras propias.

## D-16 · Atajos de una letra fuera de los campos
Los atajos U, P, E, ? y 1–4 no actúan mientras el foco está en un campo de texto (si no, escribir «unten» o «Plural» dispararía acciones). Como el campo recibe el foco automáticamente en cada tarjeta, deshacer tras calificar se hace con el botón «Deshacer» o pulsando U en la pantalla de corrección. Enter funciona siempre.

## D-17 · Accesibilidad de color
El texto del artículo usa un tono AA del mismo matiz que el color fijo de género (que se reserva para punto, borde y subrayado). Se añadió `--field-border` para que los bordes de los campos cumplan 3:1 y se oscureció el dorado claro. Detalle en `docs/ACCESIBILIDAD.md`.

## D-18 · Cliente de Prisma en la imagen standalone
Con pnpm, el cliente generado vive en `node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client` y Next.js no lo incluía en `.next/standalone` (la app respondía 500 en Docker). Se añadieron esas rutas a `outputFileTracingIncludes` en `next.config.ts`, como prevé la sección 10.1.
