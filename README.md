# Client Intelligence Dashboard

A modern AI-powered Dashboard for health coaches to analyze their client conversations.
This application extracts strictly structured information using the Grok (xAI) API.

## Features
- Upload PDF or TXT files of client conversations.
- Automatically generates a structured dashboard containing:
  - Weekly Summaries
  - Nutrition & Exercise Adherence
  - Sleep & Water Intake
  - Symptoms & Stress Levels
  - Engagement Levels & Risk Flags
  - Recommended Next Actions
- Categorizes each insight (Confirmed Fact, Client Reported, AI Inference, Missing Information).
- Provides confidence scores and supporting evidence directly from the text.
- Clean, responsive vanilla CSS UI.

## Setup

1. Install dependencies:
```bash
python -m venv venv
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

2. Run the Server:
```bash
uvicorn app:app --reload
```

3. Open your browser and navigate to:
[http://127.0.0.1:8000](http://127.0.0.1:8000)

4. Enter your **Grok (xAI) API Key** in the UI and click "Save Key". Then you can upload your client conversation files!

## Project Structure
- `app.py`: FastAPI server
- `analyzer.py`: AI communication logic using Grok API
- `prompt.py`: Structured prompt definitions
- `parser.py`: File parsing (PDF/TXT)
- `utils.py`: Pydantic schemas and utility functions
- `assets/`: Frontend HTML, CSS, and JS
