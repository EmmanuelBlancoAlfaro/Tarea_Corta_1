# Tarea_Corta_1

Tarea Corta 1  - Contenerización de un servicio con Docker

## Justificacion de elección de imagen y Dockerfile

### Selección de la imagen base

Utilizamos node : alpine porque es una imagen base oficial mucho más ligera que la versión completa de Node, lo que aumenta la seguridad porque trae menos herramientsa, y reduce el peso del contenedor.

### Contenido de la imagen

Construimos el dockerfile usando multi-stage build, para poder aprovechar la manera en que Docker va apilando las capas de la imagen y poder aprovechar la caché. También usamos un archivo .dockerignore, para que los archivos de desarrollo, historiales de Git y código innecesario no lleguen a la imagen.
