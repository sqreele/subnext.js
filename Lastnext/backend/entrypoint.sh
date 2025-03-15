#!/bin/sh
set -e

echo "Waiting for postgres..."
while ! nc -z $SQL_HOST $SQL_PORT; do
    sleep 0.1
done
echo "PostgreSQL started"

# Make sure we're in the right directory
cd /app/myLubd

echo "Running migrations..."
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --no-input --clear

echo "Starting Gunicorn..."
exec gunicorn myLubd.wsgi:application --bind 0.0.0.0:8000 --workers 3
