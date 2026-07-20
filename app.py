import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException

load_dotenv()
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from utils import ensure_directories
from file_parser import parse_file
from analyzer import analyze_conversation, DashboardReport

app = FastAPI(title="Client Intelligence Dashboard API")

# Ensure required directories exist
ensure_directories()

# Enable CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files for the frontend
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/")
async def root():
    """Serve the main frontend HTML."""
    return FileResponse("assets/index.html")

@app.post("/api/analyze")
async def api_analyze(file: UploadFile = File(...)):
    """Accepts a TXT or PDF file, parses it, and returns the AI analysis."""
    if not file.filename.endswith(('.txt', '.pdf')):
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported")
    
    # Save the file temporarily
    file_path = os.path.join("uploads", file.filename)
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        # Extract text
        text_content = parse_file(file_path)
        
        # Analyze using Gemini
        json_result_str = analyze_conversation(text_content)
        
        # Parse JSON robustly
        try:
            raw_dict = json.loads(json_result_str)
            # Validate against Pydantic schema to inject any missing default fields
            validated_report = DashboardReport.model_validate(raw_dict)
            result_dict = json.loads(validated_report.model_dump_json())
        except Exception as e:
            print(f"Validation or JSON parsing failed: {e}")
            # Fallback to an empty schema if JSON is completely invalid or fails validation
            result_dict = json.loads(DashboardReport().model_dump_json())
        
        # Optionally save output
        output_path = os.path.join("outputs", f"report_{file.filename}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result_dict, f, indent=2)
            
        return JSONResponse(content=result_dict)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)


