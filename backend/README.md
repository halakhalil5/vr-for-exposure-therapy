# Backend Setup

## Environment Variables
Copy `.env.example` to `.env` and set values:

- `MONGODB_URI`
- `PORT`
- `UNITY_SERVER_URL`
- `CORS_ORIGINS`
- `OPENROUTER_API_KEY` (required for `POST /api/ai-placement`)
- `OPENAI_API_KEY` (optional for existing `/api/generate-scene` flow)
- `OPENROUTER_HTTP_REFERER` (optional)
- `OPENROUTER_X_TITLE` (optional)

Example:

```bash
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_HTTP_REFERER=http://localhost:5173
OPENROUTER_X_TITLE=VR Exposure Therapy Dashboard
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

## AI Placement Endpoint

`POST /api/ai-placement`

Success response is a JSON array directly (Unity-compatible).
Error response is non-200 with this shape:

```json
{
  "status": "error",
  "error": "concise message"
}
```

Postman-friendly sample request body:

```json
{
  "screenshots": ["<base64 png topdown>", "<base64 png player view>"],
  "objectsToPlace": [
    {
      "id": "spider_1",
      "type": "spider_myoldone",
      "position": { "x": 0, "y": 0, "z": 0 }
    }
  ],
  "sceneInventory": {
    "existingObjects": [
      {
        "name": "Couch",
        "position": { "x": 1.5, "y": 0, "z": 1.0 },
        "bounds": { "x": 2.0, "y": 1.0, "z": 0.9 }
      }
    ],
    "roomBounds": {
      "minX": -4,
      "maxX": 4,
      "minZ": -4,
      "maxZ": 4,
      "floorY": 0,
      "ceilingY": 3
    }
  },
  "intensity": 0.8
}
```

Sample curl test:

```bash
curl -X POST http://localhost:5000/api/ai-placement \
  -H "Content-Type: application/json" \
  -H "HTTP-Referer: http://localhost:5173" \
  -H "X-Title: VR Exposure Therapy Dashboard" \
  -d '{
    "screenshots": ["<base64 png topdown>", "<base64 png player view>"],
    "objectsToPlace": [{"id":"spider_1","type":"spider_myoldone","position":{"x":0,"y":0,"z":0}}],
    "sceneInventory": {
      "existingObjects": [{"name":"Couch","position":{"x":1.5,"y":0,"z":1.0},"bounds":{"x":2.0,"y":1.0,"z":0.9}}],
      "roomBounds": {"minX":-4,"maxX":4,"minZ":-4,"maxZ":4,"floorY":0,"ceilingY":3}
    },
    "intensity": 0.8
  }'
```

Expected success response shape:

```json
[
  {
    "id": "spider_1",
    "type": "spider_myoldone",
    "position": { "x": 0.8, "y": 1.7, "z": 1.9 },
    "rotation": { "x": 0, "y": 180, "z": 0 },
    "surface": "wall",
    "reasoning": "Placed on visible wall away from player path"
  }
]
```

## Extraction Test Route

`POST /api/ai-placement/test-extraction`

Use this helper route to verify parser + placement extraction logic from a mock model output.

## Run Tests

```bash
cd backend
npm test
```
