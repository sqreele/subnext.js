# Use official Python image as base
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY ./src .

# Create user for running the app
RUN adduser --disabled-password --no-create-home django

# Create media and static directories and set permissions
RUN mkdir -p /app/media /app/static \
    && chown -R django:django /app/media /app/static

# Switch to non-root user
USER django

# Run gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "myLubd.wsgi:application"]