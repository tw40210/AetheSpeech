"""
One-shot script: creates all tables and seeds topics + questions.
Run: python init_db.py
Optional: python init_db.py --input-json path/to/seed.json
"""

import argparse
import asyncio
import json
import uuid

from sqlalchemy import select

from core.database import AsyncSessionLocal, async_engine, Base
from core.topic_labels import ensure_default_unclear_label
import models  # noqa: F401 — registers all ORM models

from models.topic import Topic, Question


SEED_DATA = [
    {
        "name": "Business Report",
        "description": (
            "Practice presenting structured business updates using the WWAD framework."
        ),
        "labels": [
            {"key": "WWAD", "name": "What we are doing"},
            {"key": "WWSDI", "name": "Why we should do it"},
            {"key": "WWHD", "name": "What we have done"},
            {"key": "NS", "name": "Next step"},
        ],
        "questions": [
            {
                "text": "Describe the main initiative your team is currently working on.",
                "context": "Focus on the project goal and the team responsible.",
            },
            {
                "text": "Why is this initiative strategically important for the company?",
                "context": "Link to business objectives or competitive advantage.",
            },
            {
                "text": "What key milestones has your team completed so far?",
                "context": "Mention measurable outcomes if possible.",
            },
            {
                "text": "What is your team planning to deliver in the next sprint or quarter?",
                "context": "Be specific about timelines and owners.",
            },
            {
                "text": "What risks are you currently managing and how?",
                "context": "Describe mitigation strategies.",
            },
            {
                "text": "How does your project contribute to revenue or cost savings?",
                "context": "Use numbers or estimates if available.",
            },
            {
                "text": "What dependencies or blockers does your team have right now?",
                "context": "Name the teams or resources you are waiting on.",
            },
            {
                "text": "How are you measuring the success of this initiative?",
                "context": "List the KPIs or OKRs you are tracking.",
            },
            {
                "text": "What have you learned from recent setbacks or experiments?",
                "context": "Frame as constructive learnings.",
            },
            {
                "text": "What support do you need from leadership to move forward?",
                "context": "Be specific — budget, headcount, decision, visibility.",
            },
            {
                "text": "Summarise the current status of the project in two sentences.",
                "context": "Imagine you have 30 seconds in an elevator with the CEO.",
            },
            {
                "text": "How does your team's work connect to the company's Q3 goals?",
                "context": "Reference a specific strategic pillar if you can.",
            },
        ],
    },
    {
        "name": "Product Pitch",
        "description": "Practice pitching a product idea or feature to stakeholders.",
        "labels": [
            {"key": "PROBLEM", "name": "Problem statement"},
            {"key": "SOLUTION", "name": "Proposed solution"},
            {"key": "VALUE", "name": "Value proposition"},
            {"key": "PLAN", "name": "Execution plan"},
        ],
        "questions": [
            {
                "text": "What problem does your product or feature solve?",
                "context": "Describe the pain point from the user's perspective.",
            },
            {
                "text": "Who is the target user and what is the scale of the problem?",
                "context": "Include market size or affected user count if known.",
            },
            {
                "text": "What is your proposed solution and how does it work?",
                "context": "Give a simple, jargon-free description.",
            },
            {
                "text": "Why is your solution better than existing alternatives?",
                "context": "Compare to competitors or workarounds.",
            },
            {
                "text": "What is the go-to-market strategy?",
                "context": "How will you reach the first 100 customers?",
            },
            {
                "text": "What does the MVP look like and when can it ship?",
                "context": "Describe the minimum feature set and timeline.",
            },
            {
                "text": "What is the business model — how will this generate revenue?",
                "context": "Pricing, monetisation strategy, or cost savings.",
            },
            {
                "text": "What are the biggest technical and market risks?",
                "context": "Be honest — investors appreciate realism.",
            },
            {
                "text": "What metrics will you track to validate success?",
                "context": "Name 2-3 north-star metrics.",
            },
            {
                "text": "What resources are you asking for to build this?",
                "context": "Budget, headcount, timeline.",
            },
        ],
    },
    {
        "name": "Self Introduction",
        "description": "Practice introducing yourself in professional settings.",
        "labels": [
            {"key": "BACKGROUND", "name": "Professional background"},
            {"key": "SKILLS", "name": "Key skills and expertise"},
            {"key": "ACHIEVEMENT", "name": "Notable achievements"},
            {"key": "GOAL", "name": "Future goals"},
        ],
        "questions": [
            {
                "text": "Tell me about yourself and your professional background.",
                "context": "Keep it under 2 minutes — highlight the most relevant parts.",
            },
            {
                "text": "What are your top three professional strengths?",
                "context": "Back each one with a brief example.",
            },
            {
                "text": "Describe your most significant professional achievement.",
                "context": "Use the STAR method if it helps.",
            },
            {
                "text": "Why are you interested in this role or organisation?",
                "context": "Connect your goals to the company's mission.",
            },
            {
                "text": "Where do you see yourself in five years?",
                "context": "Be ambitious but realistic.",
            },
            {
                "text": "What motivates you in your work?",
                "context": "Be authentic — avoid generic answers.",
            },
            {
                "text": "Describe a challenge you overcame and what you learned.",
                "context": "Focus on the growth, not just the problem.",
            },
            {
                "text": "What unique value do you bring to a team?",
                "context": "Think about soft and hard skills together.",
            },
            {
                "text": "What are you currently learning or working to improve?",
                "context": "Shows self-awareness and growth mindset.",
            },
            {
                "text": "How would a former colleague describe your working style?",
                "context": "Be specific — use real adjectives, not buzzwords.",
            },
        ],
    },
]


def _load_seed_data(input_json: str | None) -> list:
    if input_json is None:
        return SEED_DATA
    with open(input_json, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("JSON seed file must be a list of topic objects")
    return data


async def seed(seed_data: list | None = None):
    rows = seed_data if seed_data is not None else SEED_DATA
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        for topic_data in rows:
            labels = ensure_default_unclear_label(topic_data.get("labels"))
            # Idempotent — skip if already exists
            result = await db.execute(
                select(Topic).where(
                    Topic.name == topic_data["name"],
                    Topic.user_id == None,  # noqa: E711 — only check public topics
                )
            )
            existing_topic = result.scalar_one_or_none()
            if existing_topic:
                updated_labels = ensure_default_unclear_label(existing_topic.labels)
                if updated_labels != (existing_topic.labels or []):
                    existing_topic.labels = updated_labels
                    print(
                        f"  Topic '{topic_data['name']}' already exists — added UNCLEAR label"
                    )
                else:
                    print(f"  Topic '{topic_data['name']}' already exists — skipping")
                continue

            topic = Topic(
                id=uuid.uuid4(),
                name=topic_data["name"],
                description=topic_data["description"],
                labels=labels,
            )
            db.add(topic)
            await db.flush()

            for q_data in topic_data["questions"]:
                db.add(
                    Question(
                        id=uuid.uuid4(),
                        topic_id=topic.id,
                        text=q_data["text"],
                        context=q_data.get("context"),
                    )
                )

            print(
                f"  Seeded topic '{topic_data['name']}' "
                f"with {len(topic_data['questions'])} questions"
            )

        await db.commit()
    print("Database initialisation complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create tables and seed topics + questions.")
    parser.add_argument(
        "--input-json",
        dest="input_json",
        metavar="PATH",
        help="JSON file to use as seed data instead of built-in SEED_DATA",
    )
    args = parser.parse_args()
    seed_rows = _load_seed_data(args.input_json)
    asyncio.run(seed(seed_rows))
