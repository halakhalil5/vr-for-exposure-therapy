# Backend Setup

## Environment Variables
Copy `.env.example` to `.env` and set values:

- `MONGODB_URI`
- `PORT`
- `UNITY_SERVER_URL`
- `CORS_ORIGINS`

Example:

```bash
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080
```

Do not commit secrets. Keep keys in environment variables only.

## Run Server

```bash
cd backend
npm install
npm run dev
```

Server default URL: `http://localhost:5000`

## Run Tests

```bash
cd backend
npm test
```

## Base Environment Mapping (Unity)

Scene builder base environments now normalize to the following Unity keys when `/build-scene` is called:

- Airport -> `airport` (recommended for fear of flying)
- Airplane -> `airplane` (recommended for fear of flying)
- Building (with rooftop) -> `building` (recommended for fear of heights)
- Glass Bridge -> `cliff` (recommended for fear of heights)
- Elevator -> `elevator` (recommended for claustrophobia)
- House (living room) -> `house` (recommended for arachnophobia)
- Picture Room (living room with pictures) -> `picture_room` (recommended for arachnophobia)
