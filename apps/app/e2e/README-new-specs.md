# Specs nuevas de recursos y Aprende

Estas 26 pruebas usan el usuario admin de desarrollo de `fixtures.ts`, esperan la redirección de `login()` antes de navegar y limpian al final los registros creados y sus objetos de Storage. Los nombres de campos se contrastan con `messages/es.json` y `messages/en.json` y con las etiquetas accesibles de los componentes.

## Recursos (12)

1. Crea un enlace bilingüe con acceso por cuenta y confirma que aparece en la lista.
2. Intenta publicar un vídeo sin ID y espera el error de contenido incompleto.
3. Guarda un enlace de YouTube y comprueba que permanece en el editor sin miniatura incrustada.
4. Baja un recurso y comprueba que el orden visible cambia tras recargar.
5. Publica y despublica un recurso y comprueba la etiqueta Borrador.
6. Comprueba 404 para un UUID inexistente y para un ID mal formado.
7. Comprueba que un docente no puede abrir el administrador de recursos.
8. Comprueba axe en escritorio y viewport de 375 px.
9. Adjunta un PDF pequeño, publica la ficha y comprueba que se muestra su tamaño.
10. Rechaza un ZIP y comprueba que no queda adjunto.
11. Simula que el endpoint de subida responde sin guardar el objeto y comprueba que el adjunto se rechaza y el recurso sigue vacío.
12. Sustituye un PDF y comprueba que el nuevo archivo queda asociado.

## Lecciones (14)

1. Crea una lección para niños A1 y confirma su categoría en la lista.
2. Rechaza un slug duplicado y anuncia el error en el campo.
3. Intenta publicar una lección sin bloques y comprueba el error de contenido incompleto.
4. Abre la interactiva Alfabeto y comprueba que su slug es texto y no ofrece eliminar.
5. Comprueba 404 para una lección inexistente y para un ID mal formado.
6. Sube una lección dentro de Adultos A1 y comprueba el orden.
7. Comprueba que la lista inglesa usa nombres de categoría en inglés.
8. Comprueba axe en la página de lecciones.
9. Añade bloques de texto, vídeo y quiz, cambia el orden y publica.
10. Comprueba los textos ingleses en vista previa.
11. Rechaza una respuesta correcta fuera del rango y comprueba el error del campo.
12. Comprueba la confirmación antes de borrar un bloque.
13. Borra el único bloque de una lección publicada y comprueba el error de contenido incompleto.
14. Adjunta una imagen con textos alternativos bilingües y comprueba el alt en la vista previa.

## Cambio de UI

Se añadieron las traducciones ausentes para acceso de recursos y bloques de texto en ambos idiomas. Los selectores de archivo y miniatura tienen nombres accesibles distintos, y el editor conserva lo escrito tras guardar. Las pruebas de movimiento crean pares E2E y comparan su orden relativo; los avisos de validación se buscan dentro de `main`. También se añadió una prueba unitaria que contrasta las claves de traducción de estas páginas con `es.json` y `en.json`. Los detalles de recurso y lección devuelven 404 tanto para UUID inexistentes como para IDs mal formados, validando el formato antes de consultar la base.
