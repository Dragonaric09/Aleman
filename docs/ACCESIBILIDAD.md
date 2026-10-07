# Auditoría de accesibilidad (WCAG 2.1 AA)

**Fecha:** 7 de octubre de 2026 · **Alcance:** acceso, panel, estudio, vocabulario, ficha y ajustes, en claro y oscuro.

## Resumen
**Problemas encontrados:** 3 · **Críticos:** 0 · **Mayores:** 2 · **Menores:** 1 — **todos corregidos.**

| # | Problema | Criterio | Gravedad | Corrección |
|---|---|---|---|---|
| 1 | Texto dorado (`--accent`) sobre papel en modo claro: 4,30:1 | 1.4.3 Contraste | 🟡 Mayor | Dorado claro `#9A6A12` → `#8A5E0F` (5,19:1 sobre papel) |
| 2 | Borde de campos y casillas: 1,65:1 | 1.4.11 Contraste no textual | 🟡 Mayor | Nuevo token `--field-border` (`#8F8676` claro, 3,54:1; `#717278` oscuro, 3,63:1) |
| 3 | Conmutador de tema con `role="radio"` sin navegación por flechas | 4.1.2 Nombre, rol, valor | 🟢 Menor | Botones con `aria-pressed` dentro de un `group` |

## Contraste (tras las correcciones)
| Elemento | Claro | Oscuro | Requisito |
|---|---|---|---|
| Texto principal / papel | 15,68 | 15,21 | 4,5 |
| Texto secundario / superficie | 7,67 | 7,89 | 4,5 |
| Dorado / papel | 5,19 | 9,42 | 4,5 |
| Artículo der / superficie | 6,60 | 8,46 | 4,5 |
| Artículo die / superficie | 6,37 | 8,69 | 4,5 |
| Artículo das / superficie | 4,94 | 11,02 | 4,5 |
| Plural / superficie | 7,44 | 9,11 | 4,5 |
| CORRECT / fondo | 6,26 | 9,04 | 4,5 |
| ALMOST / fondo | 6,02 | 9,41 | 4,5 |
| WRONG / fondo | 6,66 | 8,07 | 4,5 |
| Borde de campo / superficie | 3,54 | 3,63 | 3,0 |

Los colores fijos de género (`#2563EB`, `#DC2626`, `#16A34A`) se usan como color de identidad (punto, subrayado, borde); el texto del artículo usa un tono AA del mismo matiz y **siempre** va escrito.

## Teclado
| Elemento | Comportamiento |
|---|---|
| Enlace «Saltar al contenido» | primer elemento enfocable |
| Pantalla de estudio | Enter comprueba/confirma; 1–4 califican; Espacio revela (reconocimiento); U deshace; P audio; E ficha; ? atajos; Alt+a/o/u/s escribe umlauts. Las letras no actúan dentro de un campo |
| Menú y diálogos (Radix) | foco atrapado, Escape cierra y devuelve el foco |
| Fichas de orden de frase | botones nativos (además de arrastrar) |
| Foco | anillo dorado de 2 px visible en todos los controles |

## Lectores de pantalla
- Retroalimentación con `role="status"` y `aria-live="polite"`; errores con `role="alert"`.
- Campos con etiqueta; errores enlazados con `aria-describedby` y `aria-invalid`.
- Lemas alemanes con `lang="de"` (pronunciación correcta del lector).
- Gráficos con `role="img"`, `aria-label` resumido y tabla alternativa («Ver como tabla»).
- Barra de progreso con `role="progressbar"` y valores.

## Pendiente de verificación manual
Prueba con NVDA / VoiceOver reales y zoom al 200 % en navegadores móviles.
