# Tarea_Corta_1

Tarea Corta 1  - Contenerización de un servicio con Docker

## Justificacion de elección de imagen y Dockerfile

### Selección de la imagen base

Utilizamos node : alpine porque es una imagen base oficial mucho más ligera que la versión completa de Node, lo que aumenta la seguridad porque trae menos herramientsa, y reduce el peso del contenedor.

### Contenido de la imagen

Construimos el dockerfile usando multi-stage build, para poder aprovechar la manera en que Docker va apilando las capas de la imagen y poder aprovechar la caché. También usamos un archivo .dockerignore, para que los archivos de desarrollo, historiales de Git y código innecesario no lleguen a la imagen.

- Entidad con estado real db/init.sql:

init.sql: Se define la tabla en postgres donde vivira la entidad con estado real, se decidio crear la tabla como user, con las columnas:
    - id: identificador
    - username: nombre del usuario
    - email: correo del usuario
    - created_at: fecha de creación, se coloca en default para que sea la fecha y hora actual.

- Docker compose docker-compose.yml:

    Imagen: La imagen elegida fue la postgres:15-alpine, se eligió una versión específica en vez de usar "latest", por si en algun momento una versión más reciente venga con errores y no nos cause problemas. El alpine se uso para que el contenedor pese mucho menos, hace que se descargue y arranque mucho mas rapido.

    ports: Se eligió el puerto 5433:5432 en vez del clasico 5432:5432 por un error que el puerto 5432: desde Node estaba lque la conexion con las enviromentall variables, no se hiciera, por lo que se tuvo que modificar y usar este puerto en cuestión.

    volumes: 
        - pgdata:/var/lib/postgresql/data: Definimos este volumen como pgdata y la ruta es donde postgreSQL guarda sus archivos físicos de datos por defecto, entonces podremos ver nuestro volumen usando esa ruta.

        -  ./db/init.sql:/docker-entrypoint-initdb.d/init.sql: Mapea el archivo init.sql hacia la ruta interna /docker-entrypoint-initdb.d/ del contenedor, con el fin que cuando se inicializa la base de datos, se ejecute el cript en el init.sql, haciendo que se cree de una vez.

    healtcheck: 
        - test: Ejecuta el comando pg_isready, el cual hace exactamente lo que dice, preguntar si esta listo para aceptar conexiones usando las variables de entorno, esto se hace abriendo una consola en el contenedor con "CMD-SHELL".
        - interval: 5s: Le indica a Docker que repita esta prueba de conexión cada 5 segundos.
        - timeout: 5s: Establece que si el comando tarda más de 5 segundos en responder, se contabiliza como un intento fallido.
        - retries: 5: Define que si la prueba falla 5 veces consecutivas, Docker marcará el contenedor como unhealthy (con errores). En cuanto la prueba pasa, el estado cambia a healthy (saludable).
