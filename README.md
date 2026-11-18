# Lo que no regresó

Ensayo multimedia de **Santiago Casasbuenas** sobre el sesgo de supervivencia y la sensación de que "ya no hay tanto contenido de IA" en redes sociales. Incluye una prueba interactiva de ocho piezas (¿real o IA?).

Sitio: https://scasasbuenas.github.io/SurvivorshipBias/

## Estructura

- `index.html`: el ensayo completo y la portada.
- `css/style.css`: el sistema visual (cianotipo + lápiz graso).
- `js/quiz-data.js`: **las piezas de la prueba**. Edita este archivo para cambiar imágenes o videos.
- `js/main.js`: la prueba, el avión y los gráficos.
- `assets/fonts/`: fuentes Source Serif 4 y Barlow Condensed (licencia SIL OFL).

## Cómo se lee

1. Portada.
2. La prueba de ocho piezas. El ensayo está cerrado hasta terminarla.
3. Resultados y respuestas.
4. El ensayo se abre sección por sección con el botón "Seguir" al final de cada una. Los gráficos se dibujan al entrar en pantalla.

El avance se guarda solo mientras la pestaña del navegador está abierta. Para empezar de cero (por ejemplo, antes de presentar), cierra la pestaña y abre la página de nuevo.

## Cambiar las piezas de la prueba

Cada pieza en `js/quiz-data.js` tiene:

- `type`: `"image"` o `"video"`
- `src`: la URL de la imagen o el video (puede ser un archivo propio en `assets/quiz/`)
- `answer`: `"ai"` o `"real"`
- `credit` y `source`: el crédito y el enlace a la fuente original

Las piezas externas se cargan desde su servidor original (Britannica Education y Sightengine) y no se copian a este repositorio. Si una no carga, la página muestra el enlace a la fuente.

## Publicar en GitHub Pages

Settings → Pages → Build and deployment → Source: *Deploy from a branch* → Branch: `main` / `(root)`.
