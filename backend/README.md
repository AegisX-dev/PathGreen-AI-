# Pathway Streaming Engine Backend

Python package for real-time fleet emissions monitoring using Pathway.

## Structure

```
backend/
├── main.py              # Entry point + WebSocket server
├── schema.py            # Pathway table schemas
├── transforms.py        # Emission calculations + anomaly detection
├── rag.py               # Document Store for BS-VI regulations
├── llm_handler.py       # Gemini query handler
├── data/
│   ├── routes/          # CSV route data for replay
│   └── regulations/     # BS-VI PDF documents
├── Dockerfile
└── requirements.txt
```

## Running Locally

```bash
# Set environment variables
export GEMINI_API_KEY=your_key_here

# Install dependencies
pip install -r requirements.txt

# Run the pipeline
python main.py
```

## Docker

```bash
docker build -t pathgreen-engine .
docker run -p 8080:8080 -e GEMINI_API_KEY=$GEMINI_API_KEY pathgreen-engine
```
