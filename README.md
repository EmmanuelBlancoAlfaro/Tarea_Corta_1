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

## Entidad con estado real db/init.sql

## Script de inicialización

init.sql: Se define la tabla en postgres donde vivira la entidad con estado real, se decidio crear la tabla como user, con las columnas:
    - id: identificador
    - username: nombre del usuario
    - email: correo del usuario
    - created_at: fecha de creación, se coloca en default para que sea la fecha y hora actual.

## Explicación del docker-compose.yml

- Imagen: La imagen elegida fue la postgres:15-alpine, se eligió una versión específica en vez de usar "latest", por si en algun momento una versión más reciente venga con errores y no nos cause problemas. El alpine se uso para que el contenedor pese mucho menos, hace que se descargue y arranque mucho mas rapido.

- ports: Se eligió el puerto 5433:5432 en vez del clasico 5432:5432 por un error que el puerto 5432: desde Node estaba lque la conexion con las enviromentall variables, no se hiciera, por lo que se tuvo que modificar y usar este puerto en cuestión.

- volumes:
  - pgdata:/var/lib/postgresql/data: Definimos este volumen como pgdata y la ruta es donde postgreSQL guarda sus archivos físicos de datos por defecto, entonces podremos ver nuestro volumen usando esa ruta.

- ./db/init.sql:/docker-entrypoint-initdb.d/init.sql: Mapea el archivo init.sql hacia la ruta interna /docker-entrypoint-initdb.d/ del contenedor, con el fin que cuando se inicializa la base de datos, se ejecute el cript en el init.sql, haciendo que se cree de una vez.
    healtcheck:

- test: Ejecuta el comando pg_isready, el cual hace exactamente lo que dice, preguntar si esta listo para aceptar conexiones usando las variables de entorno, esto se hace abriendo una consola en el contenedor con "CMD-SHELL".

- interval: 5s: Le indica a Docker que repita esta prueba de conexión cada 5 segundos.

- timeout: 5s: Establece que si el comando tarda más de 5 segundos en responder, se contabiliza como un intento fallido.

- retries: 5: Define que si la prueba falla 5 veces consecutivas, Docker marcará el contenedor como unhealthy (con errores). En cuanto la prueba pasa, el estado cambia a healthy (saludable).

## Autenticación con JWT y Keycloak

 La API utiliza Keycloak para gestionar la autenticación mediante tokens JWT. El cliente debe enviar el token en el encabezado de la solicitud de la siguiente forma:

  `Authorization: Bearer <token>`

  El middleware `requireAuth` valida que el token exista, que sea válido y que no haya vencido. También comprueba que haya sido firmado con el algoritmo `RS256`, utilizando las claves públicas de Keycloak. Si la validación es correcta, la información del usuario se guarda en `req.user` para que pueda ser utilizada por la API.

## Explicación de endpoints.js

    Librerias o dependencias externas:

        - dotenv: Carga las variables de entorno desde el archivo .env de forma segura, usando una ruta absoluta para evitar problemas de ubicación.

        - pg: Importa el módulo de conexión para PostgreSQ, configurandola instancia del Pool (lo definimos como constante) con las credenciales (usuario, host, base de datos, contraseña y puerto) obtenidas de las variables de entorno.

        - express: Importa el framework web y crea la instancia principal de la aplicación (app), habilitando además el middleware express.json() para que el servidor pueda leer y entender los cuerpos de las peticiones en formato JSON, además que con el app es el que nos permite crear los GETs, POSTs, PUTs, DELETEs.

    Definición de funciones: Vamos a colocar (req, res) => { ... }, ya que es la forma moderna de hacerlo, "req" es la petición del cliente y "res" la respuesta. El async es usado para las consultas asincrónicas con postgreSQL, haciendo que espere la respuesta de postgres antes de continuar, sin bloquear el servidor mientras tanto. 

    Gets:

        - /health: Get para revisar el estado de la app, sin ninguna conexión con la base de datos, por lo que no usamos el async.

        - /ready: Este get su único propósito es revisar la conexión con la base de datos, para lo cual usamos el "await pool.query('SELECT 1');" para comprobar que existe conexión, si todo sale bien respondera con un 200 en el estado, en caso contrario será un 503.

        - /users: El get de users trae un filtro que se realiza con la fecha de creación del usuario, en caso de querer hacer la prueba, asi se veria la consulta: "/users?created_at=2026-09-09", esto nos retornará todos los usuarios creado en esa fecha, pero para lograr esto, revisamos si hay un req o petición del usuario, el cual seria el "created_at = ...", si existe creamos un rango de todo el dia y contruimos el query para la respuesta, en caso que no lo pide se hace un "SELECT *" de los users y ya. Si todo es correcto se retorna un 200, en caso contrario un 500.

        - /users/:id: Este get es igual que el anterior, solo que en vez de una fecha será el ID del user en específico, entonces solo tenemos que modificar el query y ya. En caso que el usuario solicitado no exista se retorna un estado 404, en caso que si exista y todo sea correcto un 200.

    POST:

        - /users: Crear usuario, en este obtendremos un usuario y email de peticion, el cual validaremos que todo este bien y construiremos el query si los datos ingresados son validos. Si todo funciona se retornara un 201, en caso de cualquier otro error un 400.

    PUT:

        - /users/:id: Actualiza un usuario, se deben realizar las mismas validaciones que en el POST, pero necesita mas lógica por si solo se desea actualizar el email o solo el username, para lograr esto se usó un "index" y el fields, para lograrlo usamos la función "${fields.join(', ')}", que gracias a la consulta de si existe username o el email, les colocamos un indice que hace referencia a los datos del value, entonces no habrá problema si solo existe uno o ambos, haciendo que se separen con una "," en caso que existan ambos. Si no existe el usuario que se desea modificar retornara el estado 404, en caso de funciona 200 y en caso de cualquier otro error el estado 400.

    DELETE: 

        - /users/:id: Eliminar un usuario, se va a eliminar un usuario mediante su id. Si todo sale bien retornara el estado 204, en caso contrario un 404 si no existe.

    LISTEN: Este es el que esta escuchando en un puerto para recibir todas las consultas y asi enviarselas a la base de datos.
    