"""
Topic generation wizard API endpoints.

Three synchronous (request-response) LLM-backed endpoints:
  POST /topic-generator/frameworks       — suggest framework labels for a context
  POST /topic-generator/sample-question  — generate or refine a sample question
  POST /topic-generator/generate         — produce a 10-question topic JSON
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_current_user
from models.user import User
from schemas.topic_generation_schema import (
    FrameworkSuggestRequest,
    FrameworkSuggestResponse,
    FrameworkSuggestion,
    GenerateTopicRequest,
    SampleQuestionRequest,
    SampleQuestionResponse,
)
from schemas.topic_schema import TopicIn
from services.topic_generation_runner import (
    run_frameworks_step,
    run_generate_step,
    run_sample_question_step,
)
from services.topic_generation_service import build_topic_in

router = APIRouter(prefix="/topic-generator", tags=["topic-generator"])


@router.post("/frameworks", response_model=FrameworkSuggestResponse)
async def suggest_frameworks(
    req: FrameworkSuggestRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await run_frameworks_step(req.context)
    if result["error"]:
        raise HTTPException(status_code=502, detail=result["error"])
    llm_output = result["output"]
    return FrameworkSuggestResponse(
        suggestions=[
            FrameworkSuggestion(
                key=s.key,
                name=s.name,
                rationale=s.rationale,
                is_preset=s.is_preset,
            )
            for s in llm_output.suggestions
        ]
    )


@router.post("/sample-question", response_model=SampleQuestionResponse)
async def get_sample_question(
    req: SampleQuestionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    labels = [{"key": l.key, "name": l.name} for l in req.labels]
    current_sample = (
        {"text": req.current_sample.text, "context": req.current_sample.context}
        if req.current_sample
        else None
    )
    result = await run_sample_question_step(
        context=req.context,
        labels=labels,
        topic_name=req.topic_name,
        topic_description=req.topic_description,
        current_sample=current_sample,
        user_feedback=req.user_feedback,
    )
    if result["error"]:
        raise HTTPException(status_code=502, detail=result["error"])
    llm_output = result["output"]
    return SampleQuestionResponse(
        text=llm_output.text,
        context=llm_output.context,
        rationale=llm_output.rationale,
    )


@router.post("/generate", response_model=TopicIn)
async def generate_topic(
    req: GenerateTopicRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    labels = [{"key": l.key, "name": l.name} for l in req.labels]
    approved_sample = {
        "text": req.approved_sample.text,
        "context": req.approved_sample.context,
    }
    result = await run_generate_step(
        context=req.context,
        labels=labels,
        topic_name=req.topic_name,
        topic_description=req.topic_description,
        approved_sample=approved_sample,
    )
    if result["error"]:
        raise HTTPException(status_code=502, detail=result["error"])

    return build_topic_in(
        llm_output=result["output"],
        labels=req.labels,
        topic_name=req.topic_name,
        topic_description=req.topic_description,
    )
