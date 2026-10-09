# Guía para escribir Gramática e Historias

El contenido vive en archivos de texto versionados con git y se carga con la semilla (`pnpm db:seed`, o el servicio `migrate` en Docker). Antes de publicar, **siempre**:

```bash
pnpm content:validate --verbose
```

## Temas de Gramática — `data/gramatica/G<n>.yml`

| Campo | Obligatorio | Descripción |
|---|---|---|
| `id`, `slug`, `title`, `summary`, `order` | sí | identificador (G1…), URL (`/gramatica/<slug>`), título, resumen, orden |
| `titleDe` | no | título en alemán |
| `lessons`, `prerequisites` | no | lecciones del libro y temas previos (ids) |
| `status` | sí | `available` (con historias y contenido) o `planned` (en preparación) |
| `plannedStories` | no | historias previstas (ver la tabla del § 2.4 de la propuesta) |
| `minTargets` | no | formas meta mínimas por historia (por defecto 6) |
| `targetLabel`, `findPrompt` | no | nombre de la forma meta («preposición + dativo») e instrucción de «encuentra las formas» |
| `content` | si `available` | `rule`, `rulePoints`, `table`, `notes`, `diagram`, `traps`, `mnemonics`, `examples`, `exercises` (ver G1.yml) |

Los ejercicios de la página de un tema son práctica libre (no se guardan): `choice` (comprensión, con `answer` = índice de la opción correcta) y `cloze` (producción, con un hueco `{{…}}`).

## Historias — `data/historias/G<n>-<nn>.md`

```markdown
---
id: G1-03
topic: G1
phase: PRACTICE          # DISCOVER | PRACTICE | CONTRAST | APPLY (no pueden retroceder)
order: 3                 # 1..n sin huecos dentro del tema; se desbloquean en este orden
title: Wo ist mein Handy?
titleEs: ¿Dónde está mi celular?
highlight: true          # resaltar la forma meta al abrir (se desvanece en fases avanzadas)
reviewed: false          # pasa a true cuando el estudiante o el profesor la revisa
exercises:
  find: { prompt: … }    # opcional: tocar las formas meta
  truefalse:             # al menos una
    - statement: Die Tasche ist auf dem Tisch.
      answer: true
      explanation: …     # se muestra si se falla
  cloze:                 # producción: exactamente un hueco {{…}}
    - text: Das Handy war auf {{der}} Treppe.
      es: El celular estaba en la escalera.
  order:                 # producción: ordenar fichas
    - sentence: Die Schuhe sind unter dem Bett.
  write:                 # opcional, no puntúa: el estudiante compara con un modelo
    prompt: …
    model: …
---
Texto de la historia con marcado. Los párrafos se separan con una línea en blanco.
```

### Marcado del texto

| Marcado | Significado |
|---|---|
| `[[Ampel]]` | palabra clave; debe existir en `data/vocabulario.csv` (lema sin barra) |
| `[[biegen#abbiegen]]` | palabra clave cuya forma en el texto difiere del lema |
| `[[Entschuldigen Sie#Entschuldigen Sie, ...]]` | expresión del catálogo |
| `{dat:neben dem}` | forma meta del tema: se resalta y cuenta para «encuentra las formas» |
| `{err:neben der Dom}` | error mostrado a propósito (fase de contraste); tocarlo cuenta como error |

### Reglas que comprueba el validador

- Las palabras clave existen en el catálogo.
- Cada historia tiene entre 80 y 150 palabras y al menos `minTargets` formas meta.
- **Cobertura léxica ≥ 95 %**: las palabras deben estar en el catálogo, en sus formas flexionadas o en `data/historias/_basico.txt` (palabras funcionales, A1.1 básico y el elenco). Con `--verbose` se listan las desconocidas.
- Al menos una pregunta richtig/falsch y un ejercicio de producción; los huecos tienen exactamente un `{{…}}`.
- Orden 1..n sin huecos y fases que no retroceden.
- **Aviso** (no bloquea): palabras activas (A/B) de las lecciones del tema que aparecen en menos de 3 historias.

### Estilo

- **Textos originales**: nunca copiar frases del libro (derechos de autor). Se reutilizan su vocabulario, temas y situaciones.
- Elenco fijo en el pueblo ficticio de **Lindenau**: Lucía (estudiante de Tarija), Herr Weber (vecino), Frau Öztürk (Café Linde), Jonas (compañero del curso).
- Usar solo gramática ya vista o la del tema; en G1 evitar el acusativo de dirección («in die Stadt») y los usos temporales de *am/im* (pueden confundir al buscar formas).
- Marcar como forma meta solo los usos de lugar («Wo?»), no *zum/zur* (dirección).
