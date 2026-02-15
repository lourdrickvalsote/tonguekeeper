FROM --platform=linux/amd64 runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies (upgrade filelock first — base image version clashes with huggingface_hub)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade filelock huggingface_hub && \
    pip install --no-cache-dir -r requirements.txt

# Download the Whisper large-v3 model at build time (not runtime)
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('Systran/faster-whisper-large-v3', local_dir='/app/models/large-v3')"

# Copy handler
COPY runpod_handler.py .

ENV MODEL_PATH=/app/models/large-v3

CMD ["python", "-u", "/app/runpod_handler.py"]
