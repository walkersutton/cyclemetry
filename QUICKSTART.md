# Cyclemetry - Quick Start Guide

Get up and running in under 2 minutes.

## Option 1: Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed

### Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd cyclemetry

# 2. Start everything
make prod

# 3. Open your browser
open http://localhost
```

That's it! The application is now running.

### Using the App

1. **Load Demo Activity** - Click the green button
2. **Load Community Template** - Click the blue button
3. **See your preview** - Automatically generated
4. **Render video** - Adjust timeline and click "Render Video"

---

## Option 2: Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
python app.py
```

Backend runs on http://localhost:3001

### Frontend Setup

```bash
cd app

# Install dependencies
npm install

# Start development server
npm start
```

Frontend runs on http://localhost:3000

---

## Common Commands

### Docker

```bash
make dev          # Development mode with hot-reload
make prod         # Production mode
make logs         # View all logs
make down         # Stop everything
make clean        # Remove all containers/volumes
```

### Without Docker

```bash
# Backend
cd backend
python app.py

# Frontend (in another terminal)
cd app
npm start
```

---

## First Time Using the App?

Follow the **interactive onboarding guide** that appears when you first load the app. It will walk you through:

1. ✅ Loading an activity (demo or your own GPX)
2. ✅ Selecting a template
3. ✅ Generating your first preview

---

## Troubleshooting

### Docker containers won't start
```bash
make clean
make prod
```

### Port already in use
Edit `docker-compose.yml` to change ports:
```yaml
ports:
  - "8080:80"  # Change 80 to 8080
```

### Can't connect to backend
- Make sure backend is running on port 3001
- Check `docker-compose logs backend`

---

## Next Steps

- **Customize**: Edit templates in the JSON editor
- **Your Data**: Upload your own GPX files
- **Render**: Create full video overlays
- **Deploy**: Use Docker Compose for production

## Learn More

- 📖 [Docker README](./DOCKER_README.md) - Full Docker documentation
- 📊 [Improvements Summary](./IMPROVEMENTS_SUMMARY.md) - What's new
- 🛠️ [Makefile](./Makefile) - All available commands

---

**Need Help?** Open an issue on GitHub

**Ready to Deploy?** See `DOCKER_README.md`
