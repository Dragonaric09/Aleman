# Sistema de diseño «Cuaderno»

Wortschatz SRS se ve como un cuaderno de vocabulario alemán bien cuidado: papel cálido, tinta oscura, un único acento dorado y una serif editorial reservada para el alemán. La interfaz se aparta para que la palabra sea la protagonista.

## Principios
1. **La palabra primero.** El lema alemán se compone en serif grande; todo lo demás es sans pequeño y sereno.
2. **Color con significado.** Los únicos colores saturados son los del género y los de la corrección. El resto es tinta, papel y dorado.
3. **El color nunca va solo.** El género siempre se acompaña del artículo escrito; la corrección, de icono y texto.
4. **Calma.** Sin sombras duras ni animaciones llamativas: transiciones de 150–250 ms, elevaciones suaves de papel.

## Tokens

### Color (definidos en `src/app/globals.css`, claro / oscuro)
| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--paper` | `#F7F4EE` | `#111214` | fondo de página |
| `--surface` | `#FFFDF9` | `#191A1D` | tarjetas |
| `--surface-2` | `#F0ECE3` | `#212226` | bandas, campos inactivos |
| `--ink` | `#1C1B19` | `#ECE7DD` | texto principal |
| `--ink-2` | `#55524B` | `#B4AEA3` | texto secundario (≥ 4.5:1) |
| `--line` | `#E3DDD1` | `#2E2F33` | bordes y separadores decorativos |
| `--field-border` | `#8F8676` | `#717278` | borde de campos y casillas (≥ 3:1) |
| `--accent` | `#8A5E0F` | `#E2B04F` | dorado: foco, enlaces, acento |
| `--accent-ink` | `#FFFDF9` | `#1A1405` | texto sobre dorado |
| `--ok` / `--ok-bg` | `#166534` / `#E8F3EA` | `#7BD69A` / `#13261A` | CORRECT |
| `--almost` / `--almost-bg` | `#8A4B00` / `#FBF0DC` | `#F2BE6B` / `#2A2010` | ALMOST |
| `--bad` / `--bad-bg` | `#A11B1B` / `#FBE9E7` | `#F29B93` / `#2C1514` | WRONG |

**Género (fijos, sección 2):** der `#2563EB`, die `#DC2626`, das `#16A34A`, plural `#6B7280`.
Se usan como color de identidad (punto, borde, subrayado del lema). Para que el artículo escrito cumpla AA, su texto usa un tono más profundo del mismo matiz en claro (`#1D4ED8`, `#B91C1C`, `#15803D`, `#4B5563`) y uno más luminoso en oscuro (`#93B4FF`, `#FF9C9C`, `#7EE2A3`, `#B6BCC6`).

### Tipografía
| Rol | Fuente | Uso |
|---|---|---|
| `--font-serif` | Fraunces (variable, óptico) | lemas alemanes, títulos de página, cifras grandes |
| `--font-sans` | Geist | interfaz |
| `--font-mono` | Geist Mono | atajos de teclado, código |

Escala: 12 · 14 · 16 (base) · 18 · 22 · 28 · 36 · 48 (lema en estudio). Interlineado 1.5 en texto, 1.1 en lemas.

### Espaciado, bordes, sombras, movimiento
- Espaciado: escala de 4 px de Tailwind; gutter lateral de 16 px en móvil, 24 px en escritorio.
- Radios: `--radius-sm` 8 px (chips), `--radius` 12 px (campos, botones), `--radius-lg` 18 px (tarjetas).
- Sombras: `--shadow-paper` (1 px de línea + sombra difusa muy suave); `--shadow-lift` para la tarjeta de estudio.
- Movimiento: 150 ms (hover, foco), 250 ms (entrada de retroalimentación); `ease-out`. Se respeta `prefers-reduced-motion`.
- Foco: anillo dorado de 2 px con separación de 2 px, siempre visible con teclado.

## Componentes

| Componente | Descripción | Variantes / estados | Accesibilidad |
|---|---|---|---|
| `Button` | Acción | `primary` (tinta), `accent` (dorado), `secondary` (contorno), `ghost`, `danger`; tamaños `sm`/`md`/`lg`; `disabled`, `loading` | `<button>` nativo, foco visible, `aria-busy` al cargar |
| `Input` / `Textarea` / `Select` | Campos | normal, foco, error (`aria-invalid`), deshabilitado | siempre con `Label`; mensaje de error enlazado con `aria-describedby` |
| `Card` | Superficie de papel | `flat`, `raised` | — |
| `GenderBadge` | Artículo con color de género | `der`/`die`/`das`/`plural`; tamaños `sm`/`md` | el artículo es texto real; el color es redundante |
| `WordDisplay` | Lema alemán compuesto en serif con artículo y subrayado de género | `size`: `md`, `lg`, `xl` | `lang="de"` |
| `UmlautBar` | Botones ä ö ü ß Ä Ö Ü que insertan en el cursor | — | cada botón con `aria-label` («Insertar ä»); Alt+a/o/u/s |
| `RatingBar` | Botones 1–4 con intervalo de la vista previa | sugerido resaltado con anillo dorado | teclas 1–4 y Enter; `aria-keyshortcuts` |
| `AnswerFeedback` | Panel de corrección | CORRECT / ALMOST / WRONG / SELF_GRADED | `role="status"`, icono + texto, diff carácter a carácter |
| `StatCard` | Cifra destacada | con icono, con tendencia | cifra en serif tabular |

| `StoryText` | Texto de una historia en tres modos: leer (palabras clave subrayadas con el color de su género, punteadas si aún no están en tus tarjetas, glosa emergente; formas meta resaltadas en dorado), encontrar formas (cada palabra es un botón conmutable) y revisión (encontradas en verde, no encontradas con borde discontinuo, de más tachadas) | modo, resaltado activable | `lang="de"`, botones con `aria-pressed`, glosas con Radix Popover |
| `StoryReader` | Flujo leer → ejercicios → resultado | fases Entdecken / Üben / Kontrast / Anwenden | `role="radiogroup"` en richtig/falsch; resultados con icono + texto |
| `PrepositionsDiagram` | Caja y pelota para las 9 preposiciones (doble codificación) | — | cada panel `role="img"` con nombre «auf: sobre (con contacto)» |
| `StudyTabs` | Pestañas «Tarjetas / Historias» dentro de Estudiar | — | `aria-current="page"` |

### Patrones
- **Navegación:** cabecera fija con marca, enlaces y conmutador de tema; en móvil, menú en panel lateral (Radix Dialog).
- **Pantalla de estudio:** columna centrada de máx. 640 px; barra de progreso fina dorada; tarjeta elevada; campo grande con autofocus; retroalimentación debajo; calificación al pie.
- **Formularios:** etiquetas arriba, ayuda en `--ink-2`, errores en `--bad` con icono.
- **Tablas:** en móvil se convierten en lista de tarjetas.
