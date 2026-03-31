# VIS Frontend

Frontend React + TypeScript + Vite para VIS.

## Requisitos

- Node.js 20 o superior
- Backend VIS disponible por URL

## Variables de entorno

Crear un archivo `.env` local si queres correrlo fuera de este repo:

```env
VITE_API_BASE_URL=http://localhost:8080
```

En produccion, por ejemplo en Netlify:

```env
VITE_API_BASE_URL=https://tu-backend.onrender.com
```

## Desarrollo local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy en Netlify

Configuracion recomendada:

- Base directory: vacio si este frontend esta en un repo propio
- Build command: `npm run build`
- Publish directory: `dist`

Variable obligatoria:

- `VITE_API_BASE_URL`
