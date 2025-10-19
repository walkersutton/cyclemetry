FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including ffmpeg for video rendering
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock ./

# Install Python dependencies using uv
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p tmp uploads

# Expose port
EXPOSE 3001

# Set environment variables
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

# Run the application using uv
CMD ["uv", "run", "app.py"]
