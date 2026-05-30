"""
Pure helper functions for assembling topic generation data.
No LLM calls — just data transformation.
"""

from schemas.topic_generation_schema import LLMGenerateTopicOutput
from schemas.topic_schema import LabelIn, TopicIn


def build_topic_in(
    llm_output: LLMGenerateTopicOutput,
    labels: list[LabelIn],
    topic_name: str,
    topic_description: str | None,
) -> TopicIn:
    """
    Map LLM generate output and user-provided metadata into a validated TopicIn.

    The UNCLEAR label is intentionally NOT added here — it gets appended by
    POST /topics/upload's existing logic, keeping generated topics consistent
    with manually uploaded ones.
    """
    return TopicIn(
        name=topic_name,
        description=topic_description,
        labels=labels,
        questions=llm_output.questions,
    )
