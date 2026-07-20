import os
import json
from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from prompt import SYSTEM_INSTRUCTION

class InsightBase(BaseModel):
    classification: str = Field(
        default="Missing Information",
        description="Must be exactly one of: 'Confirmed Fact', 'Client Reported', 'AI Inference', 'Missing Information'"
    )
    confidence: int = Field(default=0)
    evidence: str = Field(default="")
    day: str = Field(default="")
    speaker: str = Field(default="")
    reasoning: str = Field(default="")
    evidence_used: list[str] = Field(default_factory=list)
    evidence_count: int = Field(default=0)

class StringInsight(InsightBase):
    value: str = Field(default="")

class ListInsight(InsightBase):
    value: list[str] = Field(default_factory=list)

class PrioritizedRisks(BaseModel):
    critical: list[str] = Field(default_factory=list)
    high: list[str] = Field(default_factory=list)
    medium: list[str] = Field(default_factory=list)
    low: list[str] = Field(default_factory=list)

class RiskInsight(InsightBase):
    value: PrioritizedRisks = Field(default_factory=PrioritizedRisks)

class ExecutiveSummary(BaseModel):
    overall_health_status: str = Field(default="Missing Information")
    risk_level: str = Field(default="Unknown", description="One of: 'Low', 'Moderate', 'High', 'Critical', 'Unknown'")
    overall_engagement: str = Field(default="Unknown", description="One of: 'Poor', 'Moderate', 'Good', 'Unknown'")
    main_concerns: list[str] = Field(default_factory=list)
    coach_focus_this_week: str = Field(default="Missing Information")

class CoachInsights(BaseModel):
    top_observations: list[str] = Field(default_factory=list)
    top_risks: list[str] = Field(default_factory=list)
    top_wins: list[str] = Field(default_factory=list)
    immediate_next_action: str = Field(default="Missing Information")
    follow_up_questions: list[str] = Field(default_factory=list)

class TrendSummary(BaseModel):
    sleep: str = Field(default="Unknown", description="One of: 'Improving', 'Stable', 'Declining', 'Mixed', 'Unknown'")
    nutrition: str = Field(default="Unknown", description="One of: 'Improving', 'Stable', 'Declining', 'Mixed', 'Unknown'")
    stress: str = Field(default="Unknown", description="One of: 'Improving', 'Stable', 'Declining', 'Mixed', 'Unknown'")
    activity: str = Field(default="Unknown", description="One of: 'Improving', 'Stable', 'Declining', 'Mixed', 'Unknown'")

class DashboardReport(BaseModel):
    executive_summary: ExecutiveSummary = Field(default_factory=ExecutiveSummary)
    trend_summary: TrendSummary = Field(default_factory=TrendSummary)
    weekly_summary: StringInsight = Field(default_factory=StringInsight)
    nutrition_adherence: StringInsight = Field(default_factory=StringInsight)
    exercise_steps: StringInsight = Field(default_factory=StringInsight)
    sleep: StringInsight = Field(default_factory=StringInsight)
    water_intake: StringInsight = Field(default_factory=StringInsight)
    symptoms: ListInsight = Field(default_factory=ListInsight)
    stress: StringInsight = Field(default_factory=StringInsight)
    engagement_level: StringInsight = Field(default_factory=StringInsight)
    key_barriers: ListInsight = Field(default_factory=ListInsight)
    pending_actions: ListInsight = Field(default_factory=ListInsight)
    risk_flags: RiskInsight = Field(default_factory=RiskInsight)
    recommended_next_action: StringInsight = Field(default_factory=StringInsight)
    coach_insights: CoachInsights = Field(default_factory=CoachInsights)

def analyze_conversation(text: str) -> str:
    """Analyzes a client-coach conversation using Gemini API and returns a structured JSON string."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in the environment.")
    
    try:
        client = genai.Client(api_key=api_key)
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[SYSTEM_INSTRUCTION, text],
            config={
                'response_mime_type': 'application/json',
                'response_schema': DashboardReport,
                'temperature': 0.0,
            }
        )
        
        # Robust string cleaning in case Gemini still returns markdown
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        
        return raw_text.strip()
    except Exception as e:
        # Fallback to an empty schema if generation completely fails
        try:
            return DashboardReport().model_dump_json()
        except:
            raise Exception(f"Failed to analyze conversation and fallback failed: {str(e)}")
