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
