# Legal Eye API (ISA AMBIENTAL)

**Legal Eye API** es una API REST desarrollada en **Node.js** y  **Express** . Este documento proporciona una guía rápida para configurar, ejecutar y entender el proyecto.

---

## Requisitos Previos

* [Node.js](https://nodejs.org/) (v16 o superior)
* [npm](https://www.npmjs.com/) (viene incluido con Node.js)
* [Git](https://git-scm.com/) (opcional, para clonar el repositorio)

---

## Instalación

1. **Clonar el repositorio** (si tienes Git instalado):

   ```
   git clone https://github.com/itisaambiental/Legal_Eye_Api.git
   cd LegalEye_Api
   ```
2. **Instalar dependencias** :

```
   npm install
```

   Esto instalará todas las dependencias necesarias listadas en el archivo `package.json`.

---

## Estructura del Proyecto

A continuación se detalla la estructura del proyecto:

```
.
├── src/                   # Código fuente del proyecto
│   ├── app.js             # Configuración principal de la aplicación Express
│   ├── index.js           # Punto de entrada de la aplicación
│   ├── config/            # Configuraciones globales (base de datos, variables de entorno, etc.)
│   ├── controllers/       # Controladores para manejar la lógica de las rutas
│   ├── database/          # Esquema de la base de datos
│   ├── middlewares/       # Middlewares para la aplicación
│   ├── models/            # Modelos de datos
│   ├── queues/            # Configuración y manejo de colas (si aplica)
│   ├── repositories/      # Capa de acceso a datos (interacción con la base de datos)
│   ├── routes/            # Definición de las rutas de la API
│   ├── schemas/           # Esquemas de validación (Zod)
│   ├── services/          # Lógica de negocio y servicios
│   ├── tests/             # Pruebas unitarias y de integración
│   ├── utils/             # Utilidades y funciones auxiliares
│   └── workers/           # Procesos en segundo plano
├── .env                   # Variables de entorno (crear este archivo)
├── .gitignore             # Archivos y carpetas ignorados por Git
├── babel.config.cjs       # Configuración de Babel para transpilación
├── jest.config.cjs        # Configuración de Jest para pruebas
├── package.json           # Dependencias y scripts del proyecto
├── package-lock.json      # Versiones exactas de las dependencias instaladas
├── README.md              # Este archivo
```

---

## Configuración

1. **Variables de entorno** :
   Crea un archivo `.env` en la raíz del proyecto y agrega las siguientes variables:

```
   # Configuración General
   PORT=                       # Puerto en el que correrá la aplicación (ejemplo: 3000)
   JWT_SECRET=                 # Llave secreta para generar y verificar tokens JWT
   JWT_EXPIRATION=             # Tiempo de expiración de los tokens JWT (ejemplo: 7d para 7 días)

   # Base de Datos
   DB_PORT=                    # Puerto de conexión a la base de datos
   HOST_DATABASE=              # Dirección del host de la base de datos
   USER_DATABASE=              # Usuario para acceder a la base de datos
   PASSWORD_DATABASE=          # Contraseña para el usuario de la base de datos
   DATABASE=                   # Nombre de la base de datos en producción
   DATABASE_DEV=               # Nombre de la base de datos en desarrollo
   DATABASE_TEST=              # Nombre de la base de datos para pruebas

   # Correo Electrónico
   EMAIL_USER=                 # Dirección de correo electrónico para enviar notificaciones (ejemplo: it@isaambiental.com)
   EMAIL_HOST=                 # Host del servidor SMTP para envío de correos
   EMAIL_PASS=                 # Contraseña para el correo configurado en EMAIL_USER
   AWS_USER_EMAIL=             # Usuario de AWS para servicios de correo electrónico

   # Redis
   REDIS_PASS_TEST=            # Contraseña para el servidor Redis en el entorno de pruebas
   REDIS_USER_TEST=            # Usuario para acceder al servidor Redis en el entorno de pruebas
   REDIS_HOST_TEST=            # Dirección del host del servidor Redis en el entorno de pruebas
   REDIS_PORT_TEST=            # Puerto del servidor Redis en el entorno de pruebas
   REDIS_PASS_DEV=             # Contraseña para el servidor Redis en el entorno de desarrollo
   REDIS_USER_DEV=             # Usuario para acceder al servidor Redis en el entorno de desarrollo
   REDIS_HOST_DEV=             # Dirección del host del servidor Redis en el entorno de desarrollo
   REDIS_PORT_DEV=             # Puerto del servidor Redis en el entorno de desarrollo

   # AWS S3
   AWS_ACCESS_KEY_ID=          # Clave de acceso de AWS (para integrar servicios como S3)
   AWS_SECRET_ACCESS_KEY=      # Llave secreta de AWS
   AWS_REGION=                 # Región de AWS para los servicios utilizados (ejemplo: us-east-2)
   S3_BUCKET_NAME=             # Nombre del bucket S3 para almacenamiento

   # Administración
   ADMIN_GMAIL=                # Correo electrónico del administrador
   ADMIN_ROLE=                 # ID del rol del administrador (ejemplo: 1 para superadministrador)
   ADMIN_NAME=                 # Nombre del administrador
   ADMIN_PASSWORD_TEST=        # Contraseña de administrador para entorno de pruebas

   # APIs Externas
   MICROSOFT_GRAPH_API=        # URL base de la API de Microsoft Graph
   OPENAI_API_KEY=             # Clave de API de OpenAI para procesamiento de IA
   ORGANIZATION_ID=            # ID de la organización en OpenAI
   PROJECT_ID=                 # ID del proyecto en OpenAI

   # Concurrencia
   CONCURRENCY_EXTRACT_ARTICLES= # Número máximo de procesos concurrentes para extracción de artículos
```

---

## Ejecución

1. **Iniciar el servidor en desarrollo** :

```
   npm run dev
```

   Esto iniciará el servidor usando `nodemon`, que reiniciará automáticamente el servidor cuando detecte cambios en los archivos.

1. **Iniciar el servidor en producción** :

```
   npm start
```

   Esto iniciará el servidor en modo producción.

---

## Pruebas

Para ejecutar las pruebas:

```
npm test
```

---

## Licencia

Este proyecto es privado y propiedad de  **ISA AMBIENTAL** . No está disponible bajo ninguna licencia de código abierto.
