# Use an official lightweight Python image
FROM python:3.9-slim

# Set environment variables to prevent Python from buffering logs
ENV PYTHONUNBUFFERED True

# Set the working directory inside the container
WORKDIR /app
# Copy the file that lists the dependencies
COPY requirements.txt .

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code into the container
COPY . .

# This command starts the Gunicorn server.
# It dynamically binds to the port provided by Cloud Run via the $PORT environment variable.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app