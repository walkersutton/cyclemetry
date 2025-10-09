# Cyclemetry Docker Deployment Guide

This guide explains how to deploy Cyclemetry using Docker and Docker Compose.

## Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)

## Quick Start

### Development Mode

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Access the application**:
   - Frontend: http://localhost
   - Backend API: http://localhost:3001

3. **View logs**:
   ```bash
   # All services
   docker-compose logs -f

   # Specific service
   docker-compose logs -f frontend
   docker-compose logs -f backend
   ```

4. **Stop services**:
   ```bash
   docker-compose down
   ```

### Production Deployment

1. **Build optimized images**:
   ```bash
   docker-compose build --no-cache
   ```

2. **Start in detached mode**:
   ```bash
   docker-compose up -d
   ```

3. **Monitor health**:
   ```bash
   docker-compose ps
   ```

## Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ HTTP :80
         ▼
┌─────────────────┐
│  Nginx (Frontend)│
│  React App      │
└────────┬────────┘
         │ API Proxy
         ▼
┌─────────────────┐
│  Flask Backend  │
│  Python :3001   │
└─────────────────┘
```

## Services

### Frontend (cyclemetry-frontend)
- **Base Image**: nginx:alpine
- **Port**: 80
- **Build**: Multi-stage (Node.js build → Nginx serve)
- **Features**:
  - Gzip compression
  - Static file caching
  - API proxy to backend
  - React Router support

### Backend (cyclemetry-backend)
- **Base Image**: python:3.11-slim
- **Port**: 3001
- **Features**:
  - Flask REST API
  - GPX file processing
  - Video rendering
  - Health check endpoint

## Volume Mounts

- `./backend/tmp` → Container tmp files (generated images/videos)
- `./backend/uploads` → User-uploaded GPX files
- `./backend/templates` → Template JSON files
- `./backend/demo.gpxinit` → Demo GPX file (read-only)

## Environment Variables

### Backend
- `FLASK_ENV`: Environment (production/development)
- `PYTHONUNBUFFERED`: Enable Python logging

### Frontend
- `REACT_APP_API_URL`: Backend API URL

## Health Checks

Both services include health checks:

- **Frontend**: `wget http://localhost/health`
- **Backend**: `curl http://localhost:3001/api/health`

Health checks run every 30 seconds with 3 retries.

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Port already in use
```bash
# Change ports in docker-compose.yml
ports:
  - "8080:80"  # Frontend
  - "3002:3001"  # Backend
```

### Permission issues
```bash
# Fix file permissions
chmod -R 755 backend/tmp backend/uploads
```

### Clear everything and restart
```bash
docker-compose down -v
docker-compose up --build -d
```

## Scaling

### Horizontal Scaling (Multiple Backend Instances)
```bash
docker-compose up -d --scale backend=3
```

Add load balancing in nginx.conf:
```nginx
upstream backend_servers {
    server backend:3001;
    server backend:3002;
    server backend:3003;
}
```

## Maintenance

### Update application
```bash
git pull
docker-compose build
docker-compose up -d
```

### Backup data
```bash
# Backup uploads
tar -czf uploads-backup.tar.gz backend/uploads/

# Backup templates
tar -czf templates-backup.tar.gz backend/templates/
```

### Clean old images
```bash
docker image prune -a
```

## Development vs Production

### Development
```bash
# Use local code with hot-reload
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
# Use optimized builds
docker-compose up -d
```

## Security Best Practices

1. **Use secrets for sensitive data**:
   ```yaml
   secrets:
     api_key:
       file: ./secrets/api_key.txt
   ```

2. **Run as non-root user** (add to Dockerfiles):
   ```dockerfile
   RUN adduser -D appuser
   USER appuser
   ```

3. **Limit container resources**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

4. **Use specific image tags** (not :latest)

## Monitoring

### Check resource usage
```bash
docker stats
```

### Inspect containers
```bash
docker inspect cyclemetry-backend
docker inspect cyclemetry-frontend
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Build and push
  run: |
    docker-compose build
    docker-compose push

- name: Deploy
  run: |
    docker-compose up -d
```

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify health: `docker-compose ps`
3. Review this guide
4. Open GitHub issue

## License

See main repository LICENSE file.
