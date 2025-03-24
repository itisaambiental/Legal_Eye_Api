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
PORT=                          # Puerto en el que correrá la aplicación (ejemplo: 3000)
JWT_SECRET=                    # Llave secreta para generar y verificar tokens JWT
JWT_EXPIRATION=                # Tiempo de expiración de los tokens JWT (ejemplo: 7d para 7 días)
APP_URL=                       # URL de la aplicación frontend

# Base de Datos - Producción
DB_PORT=                       # Puerto para la base de datos en producción
DB_HOST=                       # Host de la base de datos en producción
DB_USER=                       # Usuario de la base de datos en producción
DB_PASSWORD=                   # Contraseña de la base de datos en producción
DB_DATABASE=                   # Nombre de la base de datos en producción

# Base de Datos - Desarrollo
DB_PORT_DEV=                   # Puerto para la base de datos en desarrollo
DB_HOST_DEV=                   # Host de la base de datos en desarrollo
DB_USER_DEV=                   # Usuario de la base de datos en desarrollo
DB_PASSWORD_DEV=               # Contraseña de la base de datos en desarrollo
DB_DATABASE_DEV=               # Nombre de la base de datos en desarrollo

# Base de Datos - Pruebas
DB_PORT_TEST=                  # Puerto para la base de datos en entorno de pruebas
DB_HOST_TEST=                  # Host de la base de datos en entorno de pruebas
DB_USER_TEST=                  # Usuario de la base de datos en entorno de pruebas
DB_PASSWORD_TEST=              # Contraseña de la base de datos en entorno de pruebas
DB_DATABASE_TEST=              # Nombre de la base de datos en entorno de pruebas

# Redis - Producción
REDIS_PASS=                    # Contraseña del servidor Redis en producción
REDIS_USER=                    # Usuario para Redis en producción
REDIS_HOST=                    # Host del servidor Redis en producción
REDIS_PORT=                    # Puerto del servidor Redis en producción

# Redis - Desarrollo
REDIS_PASS_DEV=                # Contraseña del servidor Redis en desarrollo
REDIS_USER_DEV=                # Usuario para Redis en desarrollo
REDIS_HOST_DEV=                # Host del servidor Redis en desarrollo
REDIS_PORT_DEV=                # Puerto del servidor Redis en desarrollo

# Redis - Pruebas
REDIS_PASS_TEST=               # Contraseña del servidor Redis en entorno de pruebas
REDIS_USER_TEST=               # Usuario para Redis en entorno de pruebas
REDIS_HOST_TEST=               # Host del servidor Redis en entorno de pruebas
REDIS_PORT_TEST=               # Puerto del servidor Redis en entorno de pruebas

# Correo Electrónico
EMAIL_USER=                    # Dirección de correo para envío de notificaciones
EMAIL_HOST=                    # Host SMTP para el envío de correos
EMAIL_PASS=                    # Contraseña para el EMAIL_USER
AWS_USER_EMAIL=                # Usuario de AWS para servicios relacionados con correo

# AWS S3
AWS_ACCESS_KEY_ID=             # Clave de acceso de AWS
AWS_SECRET_ACCESS_KEY=         # Llave secreta de AWS
AWS_REGION=                    # Región AWS (ejemplo: us-east-1)
S3_BUCKET_NAME=                # Nombre del bucket S3

# Administración
ADMIN_GMAIL=                   # Correo electrónico del administrador
ADMIN_ROLE=                    # ID del rol de administrador
ADMIN_NAME=                    # Nombre del administrador
ADMIN_PASSWORD_TEST=           # Contraseña del administrador para entorno de pruebas

# APIs Externas
MICROSOFT_GRAPH_API=           # URL base de la API de Microsoft Graph
OPENAI_API_KEY=                # Clave de API de OpenAI para procesamiento de IA
ORGANIZATION_ID=               # ID de la organización de OpenAI
PROJECT_ID=                    # ID del proyecto de OpenAI

# Concurrencia
CONCURRENCY_EXTRACT_ARTICLES=  # Máximo número de procesos concurrentes para extracción de artículos
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
