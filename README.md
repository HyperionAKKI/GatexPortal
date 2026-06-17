# GateX Registration Portal

GateX Registration Portal is a school-first registration and evidence capture system built with:

- `server/`: Node.js + Express APIs
- `public/`: static frontend with vanilla JS modules
- `prisma/`: Prisma schema for PostgreSQL

The app now supports:

- official GateX branding and responsive frontend
- sector-aware flows, with school-specific terminology when `school` is selected
- admin login, role-gated admin routes, and sector -> client -> data filtering
- CSV, XLS, and XLSX bulk import
- single-port production hosting through Express
- EC2-friendly deployment with Docker support

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
copy .env.example .env
```

3. For frontend-only/demo-friendly local work, keep:

```env
USE_MOCK_SERVICES=true
SERVE_STATIC_FRONTEND=true
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:4000
```

4. Start backend:

```bash
npm run dev
```

5. Start frontend static server in another terminal:

```bash
npm run dev:client
```

6. Open:

- frontend: `http://localhost:3000`
- backend health: `http://localhost:4000/api/health`

## Production mode

In production, Express serves the frontend from `public/`, so one Node process can serve both UI and API.

Set these minimum values in `.env`:

```env
NODE_ENV=production
SERVE_STATIC_FRONTEND=true
USE_MOCK_SERVICES=false
PORT=4000
FRONTEND_URL=http://your-domain-or-ip
CORS_ORIGINS=http://your-domain-or-ip,https://your-domain
JWT_SECRET=replace_with_long_secret
ADMIN_EMAIL=admin@gatex.local
ADMIN_PASSWORD=replace_with_secure_password
OTHERS_PIN=replace_with_secure_pin
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=...
```

Start production server:

```bash
npm run start:prod
```

## Prisma

Validate schema:

```bash
npm run check
```

Push schema to database:

```bash
npx prisma db push
```

## Bulk import

Admin bulk import accepts:

- `.csv`
- `.xls`
- `.xlsx`

Minimum required column:

- `name`

The import route is:

- `POST /api/admin/upload-import`

Required form fields:

- `sector`
- `clientId`
- `category`
- `file`

## Docker

Build and run:

```bash
docker compose up --build -d
```

App URL:

- `http://localhost:4000`

## AWS EC2 deployment

Recommended stack:

- Ubuntu EC2 instance
- security group allowing `22`, `80`, and optionally `4000`
- PostgreSQL, Redis, and S3 credentials supplied through `.env`
- optional Nginx reverse proxy in front of Node

### Simple EC2 steps

1. SSH into the instance.
2. Install Docker and Docker Compose plugin.
3. Clone this repository.
4. Create `.env` from `.env.example`.
5. Set production values.
6. Run:

```bash
docker compose up --build -d
```

7. Verify:

```bash
curl http://localhost:4000/api/health
```

### Nginx reverse proxy example

Proxy `80` to `4000` so users visit standard HTTP:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

If you use Nginx or an AWS load balancer, set:

```env
TRUST_PROXY=true
```

## Admin access

Admin UI now requires login.

Demo credentials when using `?demo=true`:

- email: `admin@gatex.demo`
- password: `gatex-demo`

Real credentials come from:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Notes

- The official logo is bundled at `public/assets/gatex-logo.png`.
- Object uploads are supported in the UI and sent after registration creation when backend upload is available.
- If backend services are unavailable, the frontend still falls back gracefully for demo behavior rather than breaking the UI.
