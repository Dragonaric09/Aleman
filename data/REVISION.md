# Revisión humana del vocabulario (Fase 0)

Este archivo reúne las dudas de la extracción. **Revísalo antes de cargar la semilla en uso real.**
Cualquier corrección se hace editando `data/vocabulario.csv` y ejecutando `pnpm vocab:validate`.

## Fuentes procesadas

| Código | Archivo | Observaciones |
|---|---|---|
| KB13–KB16 | `materiales/A1_2_Kursbuch13141516.pdf` (18 págs.) | Escaneo con OCR muy ruidoso (`Caf6`, `lch`, `frnde`). Se leyó con `pdftotext -layout` y se revisaron páginas como imagen. |
| AB13–AB16 | `materiales/Arbeitbuch13141516.pdf` (29 págs.) | Las páginas **Lernwortschatz** (págs. 5, 11, 17 y 29 del PDF) se leyeron como imagen: son la fuente principal de artículos y plurales. |
| AB14 | `materiales/Arbeitsbuch14_extra.pdf` | Ejercicios resueltos de la lección 14 (posesivos, genitivo). Solo confirma palabras ya presentes. |
| CLASE2, CLASE3, CLASE10 | `materiales/clases/M3_Clase_{2,3,10}*.docx` | **Atención:** a diferencia de lo que dice la especificación, son archivos Word reales (ZIP), no Markdown. Se extrajo el texto de `word/document.xml`. |
| CLASE7 | `materiales/clases/M3_Clase_4.docx` | El archivo se llama «Clase 4», pero su título interno es **«Clase 7 – Vorlesung 7»**; por eso se usa el código `CLASE7`. |
| CLASE4 | `materiales/clases/M4_Clase_4.docx` | «Clase 4» del módulo 4: posesivos y listas de pronunciación. |

No existe `materiales/goethe/`: todas las filas llevan `goethe_level` vacío y la etiqueta `goethe-sin-verificar`.
La clasificación A/B/C se hizo por criterio propio (ver abajo).

## Criterios aplicados

- **A**: palabra del Lernwortschatz o de los apuntes que, por experiencia docente, pertenece al vocabulario básico A1/A2.
- **B**: clave para el tema de la lección pero menos frecuente (p. ej. *Jugendherberge*, *Klimaanlage*, *Vermieter*).
- **C**: aparece una sola vez o es muy temática (*Bademantel*, *Werkstatt*, *Eule*) o es lenguaje de instrucciones del libro (etiqueta `instrucciones`).
- **★ (starred)**: palabra A que aparece en **3 o más fuentes** (p. ej. libro + cuaderno + apuntes). Se eligió 3 y no 2 porque casi todo el Lernwortschatz aparece en KB y AB a la vez, y con 2 casi todas las palabras quedarían marcadas.
- Las palabras de los apuntes que también aparecen en el libro se asignaron a la **lección del libro**; el resto, a lecciones virtuales 901–905.
- `frequency_rank` se dejó vacío: no hay una lista de frecuencias en los materiales y no se inventaron valores.

## Dudas que requieren revisión

### Títulos de lecciones
- **Lección 13**: el escaneo empieza en la página 2 de la lección y no muestra el título. Se usó *«Wir suchen das Hotel Maritim.»* (el diálogo menciona el «Maritim»). **Confirmar en el libro.**
- Lecciones 14 («Wie findest du Ottos Haus?»), 15 («In Giesing wohnt das Leben!») y 16 («Wir haben hier ein Problem.») sí aparecen en los escaneos.

### Plurales y género
- **Stock** (*der Stock, die Stockwerke*): el libro da el plural *Stockwerke* (otra palabra). Se guardó `plural_form = Stockwerke` sin sufijo.
- **Balkon**: el libro da *-e* (Balkone); en el uso diario también es común *Balkons*. La tarjeta de plural solo acepta *Balkone*.
- **Urlaub, Lust, Hilfe, Nähe, Post, Polizei, Leben, Wetter**: el Lernwortschatz no indica plural; se marcaron con `no_plural = 1`. *Urlaube*, *Hilfen* existen pero son raros en A1.
- **Föhn**: el libro da *-e / -s*; se guardó *Föhne*.
- **Kaffee**: plural *Kaffees* (tazas de café); es poco usado.
- **Visum**: plural *Visa* (también *Visen*).
- **Leute** y **Nebenkosten** (solo plural) se **excluyeron**: el modelo exige género y plural para los sustantivos, y no tienen singular. Se pueden añadir como expresiones si se desea.

### Verbos
- **schwimmen**: los apuntes de la clase 10 lo ponen con *sein* (*ist geschwommen*). En el sur de Alemania y Austria es así; en el norte también se oye *hat geschwommen*. Se guardó *sein*.
- **möchten**: no tiene Perfekt propio (se usa *hat gewollt*). Se dejó `perfekt` vacío y no se genera tarjeta de formas verbales.
- **spazieren gehen**: se guardó como verbo con espacio (no es separable con barra). Revisar si prefieres *spazieren* solo.
- **sich kümmern** / **sich freuen**: se guardaron con *sich* en el lema; la tercera persona incluye el reflexivo (*kümmert sich*).

### Traducciones
- **Viertel**: se tradujo como «barrio / cuarto (fracción)».
- **Stadtteil / Viertel / Stadtviertel**: se guardaron *Stadtteil* y *Viertel*; *Stadtviertel* se omitió por redundante.
- **sein** y **ihr** como posesivos (tipo `pronoun`): *ihr* tiene también el sentido «ustedes/vosotros» (pronombre personal), que **no** se incluyó para evitar un lema duplicado.
- **Handy**, **Post**, **Stock** y **Termin** se marcaron como falsos amigos. *Rezept* (receta de cocina y médica) no se marcó.

### Exclusiones (según la especificación)
- Nombres propios: Otto, Vanilla, Marlene, Glückstadt, Giesing, Hotel Maritim, Deutschland, Europa, Hamburg, München, Bern.
- Números (eins, zwei, drei, vier…), ya cubiertos.
- Las tablas de pronombres en dativo (*mir, dir, ihm…*) se trabajan con expresiones (*Das gefällt mir.*) en lugar de tarjetas sueltas.
