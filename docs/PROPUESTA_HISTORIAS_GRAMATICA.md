# Propuesta: Mini historias y Gramática

**Estado:** fase A (piloto G1) implementada · fases B–D pendientes · **Versión:** 0.2 · octubre de 2026
**Implementación:** ver `docs/DECISIONES.md` (D-19 a D-23) y la guía de autoría `docs/CONTENIDO.md`.
**Alcance:** amplía la versión 1 descrita en `docs/ESPECIFICACION.pdf`; cuando se apruebe, cada decisión se registrará en `docs/DECISIONES.md`.

---

## 1. Objetivo formal

> Que el estudiante **comprenda** y luego **use con corrección** cada tema gramatical de las lecciones 13–16 y de sus apuntes de clase, leyendo mini historias escritas casi por completo con el vocabulario que ya conoce, enlazadas a explicaciones de gramática breves y diseñadas con estrategias de aprendizaje probadas.

El objetivo se mide por tema, con dos umbrales:

| Umbral | Qué significa | Cómo se mide en la app | Criterio de logro |
|---|---|---|---|
| **Comprensión** | Reconoce la forma y entiende lo que comunica | Preguntas de comprensión y tareas de «encuentra la forma» sobre una historia **no leída antes** | ≥ 80 % de aciertos |
| **Dominio** | La produce correctamente en contexto guiado | Huecos y transformaciones corregidos con `checkAnswer` | ≥ 80 % de aciertos en dos sesiones de días distintos |

Restricciones que se mantienen de la versión 1:
- Las historias son **contenido escrito de antemano** y revisado (la especificación excluye generar contenido con IA dentro de la app).
- Leer historias **no modifica la programación FSRS**, igual que la práctica libre (sección 7.9).
- Las historias son **originales**: no se copian textos del libro (tienen derechos de autor); se reutilizan su vocabulario, sus temas y sus situaciones comunicativas.

---

## 2. Análisis de los textos de referencia

### 2.1 Mapa de temas gramaticales

La página «Selbsteinschätzung — Das kann ich!» del Arbeitsbuch fija los objetivos gramaticales de cada lección; los apuntes de clase añaden cinco temas más.

| ID | Tema | Fuente | Qué se aprende | Palabras clave del CSV |
|---|---|---|---|---|
| **G1** | Preposiciones locales + dativo («Wo?») | L13 | an, auf, hinter, in, neben, über, unter, vor, zwischen + dem/der/den…-n; contracciones im, am | 9 preposiciones + 63 palabras de ciudad (Ampel, Brücke, Dom, Post…) |
| **G2** | Posesivos sein / ihr + genitivo con nombres | L14 | sein/seine/seinen ↔ ihr/ihre/ihren; «Ottos Haus» = «das Haus von Otto» | 43 palabras de vivienda (Balkon, Garten, Küche…) |
| **G3** | Pronombres en dativo | L15 | mir, dir, ihm, ihr, uns, euch, ihnen/Ihnen | expresiones «Das gefällt mir», «Ich danke dir» |
| **G4** | Verbos con dativo | L15 (+L16) | gefallen, gehören, helfen, danken, fehlen, passen | 6 verbos |
| **G5** | Preposiciones temporales | L16 | vor/nach/in + dativo, für + acusativo («in einer Stunde», «vor einem Monat», «für eine Woche») | 23 palabras de tiempo y citas (Termin, Woche, verschieben…) |
| **G6** | mögen / möchten | Clase 2 | gustar ↔ querer de forma educada; conjugación | 21 palabras |
| **G7** | Verbos separables (presente) | Clase 3 | prefijo al final de la frase; preguntas | 20 verbos separables en el CSV |
| **G8** | Perfekt con haben | Clase 7 | haben + participio al final; ge-…-t / ge-…-en | 80 verbos con haben |
| **G9** | Perfekt con sein | Clase 10 | movimiento y cambio de estado; bleiben, sein, passieren | 26 verbos con sein |
| **G10** | Posesivos: todas las personas | M4 Clase 4 | mein, dein, unser, euer→eure, Ihr; nominativo y acusativo | 6 posesivos |

Los objetivos **comunicativos** (pedir y dar direcciones, pedir ayuda, concertar y aplazar citas, reaccionar a disculpas) no se tratan como temas aparte: se integran como diálogos dentro de las historias de G1 y G5. La **pronunciación** de M4 Clase 4 (ch, sch, sp/st, v, w, ei, eu) no necesita historias: se propone un modo de lectura en voz alta con audio en la página de gramática.

### 2.2 Dependencias entre temas

```
G6 mögen/möchten ─┐
G7 separables ────┼─► G8 Perfekt haben ─► G9 Perfekt sein          (repaso A1.1 · apuntes de clase)
                  │
G1 dativo local ──┼─► G5 preposiciones temporales                   (L13 → L16)
                  └─► G3 pronombres dativo ◄─► G4 verbos con dativo (L15)
G10 posesivos ────► G2 sein / ihr + genitivo                        (L14)
```

Orden recomendado: seguir las lecciones (G1 → G2 → G3/G4 → G5) e intercalar los temas de los apuntes de clase (G6–G10) como una línea de repaso, porque la L16 ya usa Perfekt («Ich hatte Probleme…») y verbos separables (absagen, ausmachen).

### 2.3 Dificultad para un hispanohablante (análisis contrastivo)

| Tema | Transferencia desde el español | Trampa típica | Dificultad |
|---|---|---|---|
| G1 | El español no tiene casos | «neben der Dom» (no cambia el artículo) | **Alta** |
| G2 | «su» sirve para él y para ella | «Anna liebt sein Hund» (debe ser *ihren*) | **Alta** |
| G3 | me / te / le / nos se parecen | ihr (a ella) ≠ ihr (ustedes) | Media |
| G4 | gefallen ≈ gustar (transferencia positiva) | «Ich helfe dich» (el español usa acusativo: «te ayudo») | Media |
| G5 | — | «in einer Stunde» = *dentro de* una hora; «vor» = *hace* | Media |
| G6 | gustar / querer | «Ich mag eine Pizza» (pedido → *möchte*) | Baja |
| G7 | No existe en español | dejar el prefijo junto al verbo | **Alta** |
| G8 | «he comido» ≈ «ich habe gegessen» | participio al lado de haben, no al final | Media |
| G9 | El español usa siempre «haber» | «Ich habe gegangen» | **Alta** |
| G10 | mi / tu / nuestro | «euere» en lugar de *eure* | Media |

### 2.4 ¿Cuántas mini historias necesita cada tema?

**Supuestos** (aproximaciones de la literatura sobre lectura extensiva y frecuencia en la adquisición; se calibrarán con los datos reales de la app, ver § 7):

- **Encuentros con cada forma:** unos 6 para **comprender** y unos 10 para **dominarla** en contexto.
- **Densidad:** una historia A1.2 de 80–150 palabras admite unas **8 apariciones naturales** de la estructura meta.
- **Formas por tema (F):** las celdas que hay que aprender (p. ej. en G1: dem, der, den…-n, einem, einer, im, am = 7).
- **Multiplicador de dificultad (M):** baja ×0,8 · media ×1,0 · alta ×1,25 (tabla 2.3).

> **Historias = ⌈ F × encuentros ÷ 8 × M ⌉** (mínimo 2 para comprensión y 3 para dominio)

**Control léxico:** cada historia lleva 8 palabras clave destacadas y recicla unas 15 conocidas. Como cada palabra activa (nivel A y B) debe aparecer en al menos 3 historias, cada lección necesita un mínimo de historias por vocabulario. La última columna confirma que lo cubren las historias de sus temas.

| Tema | F | Dificultad | Historias para **comprensión** | Historias para **dominio** | Mínimo léxico de la lección |
|---|---|---|---|---|---|
| G1 Dativo local | 7 | Alta | 7 | **11** | L13: 11 ✔ |
| G2 sein/ihr + genitivo | 7 | Alta | 7 | **11** | L14: 11 ✔ |
| G3 + G4 Dativo (pronombres y verbos)¹ | 7 + 6 | Media | 6 | **10** | L15: 7 ✔ |
| G5 Preposiciones temporales | 7 | Media | 6 | **9** | L16: 9 ✔ |
| G6 mögen/möchten | 4 | Baja | 3 | **4** | |
| G7 Verbos separables | 4 | Alta | 4 | **7** | |
| G8 Perfekt con haben | 5 | Media | 4 | **7** | Clases: 25 ✔ (suman 32) |
| G9 Perfekt con sein | 4 | Alta | 4 | **7** | |
| G10 Posesivos (todas las personas) | 5 | Media | 4 | **7** | |
| Repaso acumulado (L13–16 y clases)² | — | — | 2 | **2** | |
| **Total** | | | **47** | **75** | |

¹ G3 y G4 comparten historias: casi todo verbo con dativo lleva un pronombre en dativo («Das gefällt **mir**»). Por separado sumarían 17; juntos bastan 10.
² Una historia de repaso por bloque mezcla todos los temas; sirve también como prueba de comprensión «no vista antes».

**Lectura de la tabla:** con unas **47 historias** el estudiante debería **comprender** todos los temas; con unas **75**, **dominarlos**. Por cada tema eso son de 3 a 11 historias, según cuántas formas tiene y cuánto choca con el español.

### 2.5 Distribución de las historias de un tema (las cuatro fases)

Cada tema avanza en cuatro fases. En G1, con 11 historias:

| Fase | % | G1 | Qué cambia en la historia |
|---|---|---|---|
| **1. Entdecken** (descubrir) | 20 % | 2 | La forma meta aparece muy a menudo y **resaltada**; glosas visibles; tarea «encuentra las formas» |
| **2. Üben** (practicar) | 45 % | 5 | El resaltado se **desvanece** progresivamente; preguntas que obligan a fijarse en la forma (input estructurado) |
| **3. Kontrast** (contrastar) | 20 % | 2 | Aparece la **trampa del español** o el contraste con lo anterior (nominativo ↔ dativo) |
| **4. Anwenden** (aplicar) | 15 % | 2 | Historia incompleta: el estudiante completa huecos y escribe el final (producción guiada) |

El umbral de **comprensión** coincide con terminar *Entdecken* y la primera mitad de *Üben*.

---

## 3. Concepción de las funcionalidades

### 3.1 Mini historias (dentro de «Estudiar»)

**Dónde:** nueva pestaña **Historias** en `/estudiar/historias`, junto a la sesión de tarjetas. El panel sugiere «Tu próxima historia» cuando terminas los repasos del día.

**Anatomía de una historia:**

| Elemento | Detalle |
|---|---|
| Cabecera | título en alemán, tema (G1…), fase, lección, duración estimada (2–4 min) |
| Texto | 80–150 palabras; personajes recurrentes; sustantivos con el color de género; **palabras clave** subrayadas (al tocarlas se abre la ficha); **forma gramatical** resaltada según la fase (se puede activar o desactivar) |
| Audio | lectura con la voz alemana del navegador, frase a frase |
| Después de leer | 3–4 preguntas *richtig / falsch* · 1 tarea «toca todas las formas en dativo» · 1–2 huecos tomados del texto (corregidos con `checkAnswer`) · en las fases 3–4, ordenar una frase (reutiliza el componente de verbos separables) |
| Cierre | «Lo que acabas de practicar» con enlace al tema de Gramática; botón «añadir las palabras nuevas a mis tarjetas» |

**Desbloqueo y personalización** (usa datos que la app ya tiene):
- Una historia está **lista para ti** cuando al menos el **90 %** de sus palabras con contenido son de tarjetas que ya introdujiste. Las demás palabras clave aparecen glosadas. Esto aplica la regla de que un texto se comprende sin ayuda cuando se conoce el 95–98 % de sus palabras.
- Se respeta el orden de fases y las dependencias del § 2.2.
- **Espaciado:** releer una historia no puntúa para el dominio el mismo día; la prueba de comprensión siempre usa una historia nueva.

**Elenco recurrente (lectura en serie):** los mismos personajes y el mismo pueblo en todas las historias. Así el lector solo descifra la gramática, no un mundo nuevo cada vez. Propuesta: **Lucía**, estudiante de Tarija recién llegada a **Lindenau** (pueblo ficticio); **Herr Weber**, su vecino; **Frau Öztürk**, dueña del Café Linde; **Jonas**, compañero del curso de alemán. Las lecciones encajan como una temporada: L13 Lucía se orienta en la ciudad · L14 busca piso · L15 descubre su barrio · L16 problemas en el hotel y citas.

### 3.2 Gramática (sección nueva, enlazada con las historias)

**Dónde:** nuevo enlace **Gramática** (`/gramatica`) con los 10 temas en un mapa visual con las dependencias del § 2.2 y el progreso (comprensión / dominio).

**Página de un tema** (`/gramatica/[tema]`), siempre con la misma estructura:

1. **En una frase:** la regla mínima («Wo? → dativo: der → dem, die → der, das → dem»).
2. **Tabla visual** con los colores de género de la app (der azul, die rojo, das verde, plural gris): el cambio de caso se ve como un cambio dentro del mismo color.
3. **Imagen o esquema:** p. ej. el cubo y el cilindro del Lernwortschatz para las preposiciones (doble codificación).
4. **Trampa del español:** el error típico del § 2.3, con el ejemplo mal y bien.
5. **Gancho mnemotécnico:** p. ej. «Wo? dem, der, dem, den -n — *¿dónde?* pide dativo»; «Perfekt con sein = me *muevo* o *cambio*».
6. **Tres ejemplos resueltos** sacados de las historias del tema, con enlace a cada una.
7. **Mini ejercicios** en dos pasos: primero **comprensión** (elegir el significado o la forma), luego **producción** (escribir), con la corrección existente.
8. **Historias del tema** ordenadas por fase, con el estado de cada una.

### 3.3 Estrategias de aprendizaje y dónde se aplican

| Estrategia | Fundamento | Dónde se aplica |
|---|---|---|
| Input comprensible | Se aprende de textos que casi se entienden del todo | Desbloqueo con ≥ 90 % de palabras conocidas |
| Resaltado de la forma (*input enhancement*) | Hacer visible la forma ayuda a notarla | Resaltado que se desvanece de la fase 1 a la 4 |
| Input estructurado (*processing instruction*) | Primero interpretar la forma, después producirla | Preguntas que solo se aciertan fijándose en la forma (¿*seinen* o *ihren* Garten?: ¿de quién es?) |
| Descubrimiento guiado | Deducir la regla mejora el recuerdo | Fase *Entdecken*: «toca las formas» antes de leer la regla |
| Análisis contrastivo | Prevenir la interferencia del español | Bloque «Trampa del español» y fase *Kontrast* |
| Lectura en serie | Contexto familiar = más atención para la gramática | Elenco recurrente en Lindenau |
| Bloques léxicos (*chunks*) | Frases hechas antes que reglas | «in der Nähe», «um die Ecke», «Das gefällt mir», «Hast du Lust?» |
| Práctica de recuperación y espaciado | Recordar fortalece más que releer | Pruebas con historias nuevas, sin puntuar dos veces el mismo día; vocabulario en FSRS |
| Doble codificación y mnemotecnia | Imagen + palabra se recuerdan mejor | Esquemas de preposiciones; ganchos por tema |
| Retroalimentación específica | Corregir el error concreto | `checkAnswer` y sus pistas (artículo, auxiliar, umlaut) |

---

## 4. Ejemplo: historia G1 · fase *Entdecken* (1 de 11)

**Lucía sucht das Café Linde** — Tema G1 · Lección 13 · ~110 palabras
*(en la app: sustantivos con color de género; formas en dativo resaltadas; palabras clave subrayadas)*

> Lucía ist neu in Lindenau. Heute sucht sie das Café Linde. Sie steht **an der** Ampel und fragt eine Frau: „Entschuldigung, wo ist das Café Linde?" Die Frau ist sehr nett: „Das Café ist **in der** Stadtmitte, **neben dem** Dom. Gehen Sie hier geradeaus und **an der** Ampel biegen Sie links ab." Lucía geht geradeaus. Aber **vor dem** Bahnhof ist sie nicht sicher. Ein Mann hilft ihr: „Das Café? Es ist **zwischen dem** Dom und **der** Post." Endlich! Das Café Linde ist **hinter einem** Park. Lucía trinkt einen Kaffee **am** Fenster. Sie ist glücklich.

- **Palabras clave:** Ampel, Entschuldigung, nett, Stadtmitte, Dom, geradeaus, ab|biegen, links, Bahnhof, sicher, Post.
- **Formas meta:** 9 apariciones de dativo (an der ×2, in der, neben dem, vor dem, zwischen dem… der, hinter einem, am).
- **Repaso de otros temas:** *biegen … ab* (G7), *hilft ihr* (adelanto de G3/G4).
- **Después de leer:**
  - *Richtig oder falsch?* «Das Café ist neben der Post.» → **falsch** (está entre el Dom y la Post).
  - Toca las 9 expresiones con dativo.
  - Hueco: «Das Café ist {{neben}} dem Dom.» — «Lucía trinkt einen Kaffee {{am}} Fenster.»

---

## 5. Diseño técnico (encaja con la arquitectura actual)

### 5.1 El contenido como datos versionados

Como el vocabulario, el contenido vive en archivos de texto revisables con git y se carga con la semilla idempotente:

```
data/gramatica/G1-dativo-local.md      # frontmatter: id, título, lecciones, dependencias, regla, trampas, ganchos
data/historias/G1-01-cafe-linde.md      # frontmatter: id, tema, fase, orden, palabras clave, preguntas
```

Marcado mínimo dentro del texto:
- `[[Ampel]]` → palabra clave (debe existir en `vocabulario.csv`).
- `{dat:neben dem}` → forma meta del tema (para resaltarla y contarla).
- `{{am}}` → hueco del ejercicio (el mismo formato que ya usan las tarjetas cloze).

**Validador `pnpm content:validate`**, del mismo estilo que `vocab:validate`, para garantizar la calidad antes de publicar:
- cada `[[palabra]]` existe en el catálogo;
- la historia cumple su densidad (≥ 6 formas meta) y su longitud (80–150 palabras);
- ≥ 95 % de las palabras pertenecen al catálogo, a sus formas flexionadas declaradas o a una lista de palabras funcionales;
- cada palabra activa de la lección aparece en ≥ 3 historias (el control léxico del § 2.4);
- las preguntas tienen respuesta y los huecos tienen exactamente un `{{…}}`.

### 5.2 Módulos y modelo de datos

Dos módulos nuevos que respetan las reglas de dependencia (la UI no toca Prisma; la lógica pura sin E/S):

| Módulo | Responsabilidad |
|---|---|
| `grammar` | Temas, dependencias, progreso por tema (comprensión / dominio) |
| `reading` | Historias, cálculo de cobertura léxica (puro), desbloqueo, intentos de ejercicios |

```prisma
model GrammarTopic {
  id          String   @id            // "G1"
  slug        String   @unique
  title       String
  lessonNumbers Int[]
  prerequisites String[]
  sortOrder   Int
  content     Json                     // regla, tabla, trampas, ganchos, ejemplos
  stories     Story[]
}

model Story {
  id        String   @id               // "G1-01"
  topicId   String
  topic     GrammarTopic @relation(fields: [topicId], references: [id])
  phase     StoryPhase                 // DISCOVER | PRACTICE | CONTRAST | APPLY
  sortOrder Int
  title     String
  body      String                     // texto con marcado
  keywords  String[]                   // lemas del catálogo
  exercises Json
}

model StoryAttempt {                   // nunca toca Card ni ReviewLog
  id        String   @id @default(cuid())
  userId    String
  storyId   String
  score     Float                      // 0..1
  isProbe   Boolean                    // prueba de comprensión con historia no vista
  studyDay  String
  createdAt DateTime @default(now())
  @@index([userId, storyId])
}
```

El dominio de un tema se calcula a partir de `StoryAttempt`, nunca se guarda a mano. Las rutas nuevas son `/estudiar/historias`, `/estudiar/historias/[id]`, `/gramatica` y `/gramatica/[tema]`; además `GET /api/reading/next`, `POST /api/reading/attempt` y `GET /api/grammar/progress`.

---

## 6. Plan por fases

| Fase | Entregables | Hecho cuando… |
|---|---|---|
| **A. Piloto G1** | Formato de archivos, validador, módulo `reading` mínimo, 11 historias de G1, página de Gramática de G1 | El validador pasa; el estudiante lee las 11 historias y la prueba de comprensión da ≥ 80 % |
| B. Lecciones 13–16 | Temas G2–G5 (≈ 30 historias) y mapa de Gramática | Cobertura léxica ✔ en L13–L16; e2e: leer, responder y ver el progreso |
| C. Apuntes de clase | Temas G6–G10 (≈ 32 historias), lectura en voz alta de pronunciación | Validador ✔; repaso acumulado disponible |
| D. Calibración | Ajuste de los supuestos del § 2.4 con datos reales | Informe: historias reales hasta comprensión/dominio por tema |

Se recomienda **empezar por el piloto G1**: valida el formato, las estrategias y el modelo de cantidades con 11 historias antes de escribir las otras ~64.

## 7. Cómo se comprobarán las cifras

Las cantidades del § 2.4 son una **hipótesis inicial** a partir de supuestos razonables, no un resultado medido. La app registrará en cada `StoryAttempt` cuántas historias necesitó el estudiante hasta alcanzar el 80 % en cada tema. Tras el piloto, se ajustarán los supuestos (encuentros, densidad o multiplicador) y se recalculará la tabla.

## 8. Decisiones abiertas

1. ¿Apruebas el **elenco y el pueblo ficticio** (Lucía en Lindenau) o prefieres otros personajes o lugares (p. ej. relacionados con Bolivia)?
2. ¿El **orden** por lecciones con los temas de clase intercalados (§ 2.2), o primero los temas de los apuntes?
3. ¿Quién **revisa** el contenido: tú, tu profesor o ambos? (Propuesta: la historia se publica solo tras marcarla «revisada» en su archivo.)
4. ¿Leer historias debe **adelantar** la introducción de sus palabras clave en FSRS, o mantener las historias totalmente separadas de la programación?
