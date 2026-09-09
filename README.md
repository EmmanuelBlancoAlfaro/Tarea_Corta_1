# Tarea_Corta_1

Tarea Corta 1  - Contenerización de un servicio con Docker

## Justificacion de elección de imagen y Dockerfile

Esta sección explica las decisiones que tomamos al momento de elegir la imagen para el servicio web, y como se construyo el Dockerfile.

### Selección de la imagen base

Utilizamos node : alpine porque es una imagen base oficial mucho más ligera que la versión completa de Node, lo que aumenta la seguridad porque trae menos herramientsa, y reduce el peso del contenedor.

### Contenido de la imagen

Construimos el dockerfile usando multi-stage build, para poder aprovechar la manera en que Docker va apilando las capas de la imagen y poder aprovechar la caché. También usamos un archivo .dockerignore, para que los archivos de desarrollo, historiales de Git y código innecesario no lleguen a la imagen.

## Documentación de Orquestación y Decisiones Técnicas

Esta sección explica qué partes componen el sistema, cómo se comunican, y las lecciones aprendidas durante el desarrollo.

### Servicios del sistema

El sistema se compone de tres contenedores principales que corren aislados pero conectados a través de una red interna de Docker:

**postgres (Base de Datos):** Utiliza la imagen `postgres:15-alpine`. Almacena la información de la aplicación, y al momento de arrancar ejecuta automáticamente un script de inicialización (`init.sql`) para crear las tablas necesarias.
**http_service (Nuestra API):** Construida a partir de un `Dockerfile` propio utilizando Node.js. Expone los endpoints, se comunica directamente con PostgreSQL por su nombre de servicio interno y valida su propio estado de salud.
**keycloak (Proveedor de Identidad):** Utiliza la imagen oficial de Keycloak para delegar la autenticación y seguridad mediante tokens JWT, evitando escribir sistemas de login propios.

### Funcionamiento General

**Variables de entorno:** Toda credencial o secreto de configuración esta implementado mediante variables de entorno; todo se inyecta mediante un archivo `.env`.
**Persistencia de datos:** Se declaró un volumen (`pgdata`) para la base de datos. Esto garantiza que la información no se pierda si los contenedores son destruidos.
**Arranque ordenado (Healthchecks):** Mediante la condición `service_healthy`, evitamos que la aplicación y Keycloak fallen al arrancar. Ambos servicios esperan a que PostgreSQL responda a sus pruebas de salud interna antes de iniciar.

### Errores que Encontramos y Corregimos

Durante la configuración de este entorno, nos enfrentamos con los siguientes problemas que logramos resolver:

1. **Problemas de sintaxis en el Docker Compose:** Al principio en el docker compose intentamos usar directivas inválidas como `image: build .` en lugar de la estructura correcta de compilación local (`build: .`), lo cual impedía que Docker levantara el servicio de la API.
2. **Falta de comandos en Keycloak:** La imagen de Keycloak se apagaba inmediatamente después de encenderse porque necesitaba el comando explícito `command: ["start-dev"]` para correr en modo de desarrollo local.
3. **Herramientas faltantes en Alpine:** En los chequeos de salud (*healthcheck*) de la API intentamos usar `curl`, pero al utilizar `node:alpine` como imagen base, el sistema operativo ligero no lo traía instalado. Lo solucionamos cambiando la validación por `wget`.
4. **Mapeo de puertos internos vs externos:** Aprendimos a diferenciar correctamente los puertos de red: los contenedores se comunican internamente por sus puertos predeterminados (como el `5432` de Postgres), mientras que los puertos externos (`5433:5432`) se reservaron exclusivamente para la máquina anfitriona.
- Entidad con estado real db/init.sql:

## Script de inicialización

init.sql: Se define la tabla en postgres donde vivira la entidad con estado real, se decidio crear la tabla como user, con las columnas:
    - id: identificador
    - username: nombre del usuario
    - email: correo del usuario
    - created_at: fecha de creación, se coloca en default para que sea la fecha y hora actual.


## Explicación del docker-compose.yml:

- Imagen: La imagen elegida fue la postgres:15-alpine, se eligió una versión específica en vez de usar "latest", por si en algun momento una versión más reciente venga con errores y no nos cause problemas. El alpine se uso para que el contenedor pese mucho menos, hace que se descargue y arranque mucho mas rapido.
- ports: Se eligió el puerto 5433:5432 en vez del clasico 5432:5432 por un error que el puerto 5432: desde Node estaba lque la conexion con las enviromentall variables, no se hiciera, por lo que se tuvo que modificar y usar este puerto en cuestión.
- volumes: 
  - pgdata:/var/lib/postgresql/data: Definimos este volumen como pgdata y la ruta es donde postgreSQL guarda sus archivos físicos de datos por defecto, entonces podremos ver nuestro volumen usando esa ruta.
  -  ./db/init.sql:/docker-entrypoint-initdb.d/init.sql: Mapea el archivo init.sql hacia la ruta interna /docker-entrypoint-initdb.d/ del contenedor, con el fin que cuando se inicializa la base de datos, se ejecute el cript en el init.sql, haciendo que se cree de una vez.
    healtcheck: 
        - test: Ejecuta el comando pg_isready, el cual hace exactamente lo que dice, preguntar si esta listo para aceptar conexiones usando las variables de entorno, esto se hace abriendo una consola en el contenedor con "CMD-SHELL".
        - interval: 5s: Le indica a Docker que repita esta prueba de conexión cada 5 segundos.
        - timeout: 5s: Establece que si el comando tarda más de 5 segundos en responder, se contabiliza como un intento fallido.
        - retries: 5: Define que si la prueba falla 5 veces consecutivas, Docker marcará el contenedor como unhealthy (con errores). En cuanto la prueba pasa, el estado cambia a healthy (saludable).