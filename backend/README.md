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

## PDF Report Upload and Download

Unity can upload therapeutic session PDFs with multipart/form-data to:

- `POST /upload-pdf`

Expected field name:

- `pdf` (single file)

Uploaded files are persisted to:

- `backend/uploads/reports`

Metadata is saved to MongoDB collection:

- `reportuploads`

### Additional Environment Variables

- `PDF_MAX_FILE_SIZE_BYTES` (optional, default `10485760` = 10 MB)
- `PUBLIC_API_BASE_URL` (optional, used to build absolute `fileUrl` and `downloadUrl`)

Example:

```bash
PDF_MAX_FILE_SIZE_BYTES=10485760
PUBLIC_API_BASE_URL=http://localhost:5000
```

### Endpoints

- `POST /upload-pdf` - Upload one PDF session report
- `GET /api/reports/uploads` - List uploaded PDF reports
- `GET /api/reports/uploads/:reportId/download` - Download PDF by report ID

### Example Upload (curl)

```bash
curl -X POST http://localhost:5000/upload-pdf \
	-H "Content-Type: multipart/form-data" \
	-F "pdf=@C:/path/to/session-report.pdf"
```

### Example Success Response

```json
{
	"status": "success",
	"message": "PDF report uploaded successfully",
	"fileUrl": "http://localhost:5000/uploads/reports/7a0cc5be-bdb8-42af-859f-14f637ee41a6-session-report.pdf",
	"downloadUrl": "http://localhost:5000/api/reports/uploads/7a0cc5be-bdb8-42af-859f-14f637ee41a6/download",
	"reportId": "7a0cc5be-bdb8-42af-859f-14f637ee41a6",
	"uploadedAt": "2026-05-25T10:15:30.120Z"
}
```

### Example Error Responses

Missing file:

```json
{
	"error": "Error",
	"message": "Missing file. Upload a PDF using multipart/form-data field \"pdf\"."
}
```

Invalid file type:

```json
{
	"error": "Invalid File Type",
	"message": "Invalid file type. Only PDF files are allowed."
}
```

File too large:

```json
{
	"error": "File Too Large",
	"message": "The uploaded file exceeds the size limit"
}
```

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

Picture Room notes:

- Therapist description is sent as prompt lines for the picture prompts used in that scene.

Intensity sent to Unity is normalized to a 0.0-1.0 float. `0` stays `0.0`.

Scale mapping:

- Scene Builder `1-5` maps to `1=0.0, 2=0.25, 3=0.5, 4=0.75, 5=1.0`
- Session form `1-10` maps to `1=0.0, 10=1.0` with linear values in between

Each path uses the same linear formula against its own max level before the `/build-scene` request is sent.
