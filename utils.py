import os
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class Insight(BaseModel):
    category: str
    value: str
    classification: Literal["Confirmed Fact", "Client Reported", "AI Inference", "Missing Information"]
    confidence_score: float
    supporting_evidence: str
    action_recommended: Optional[str] = None

class DashboardReport(BaseModel):
    weekly_client_summary: Insight
    nutrition_adherence: Insight
    exercise_steps: Insight
    sleep: Insight
    water_intake: Insight
    symptoms_stress: Insight
    engagement_level: Insight
    key_barriers: Insight
    pending_actions: Insight
    risk_attention_flags: Insight
    recommended_next_action: Insight

def ensure_directories():
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("outputs", exist_ok=True)
    os.makedirs("assets", exist_ok=True)
