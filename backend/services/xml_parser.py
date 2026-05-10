"""
Validates that LLM-produced XML matches required label schema and contains
the same text content as the original transcript.
"""

import re
import xml.etree.ElementTree as ET


def extract_xml_block(text: str) -> str:
    """
    Strip any markdown code fences or leading/trailing text so we end up with
    parseable XML.  The LLM sometimes wraps the answer in ```xml ... ```.
    """
    # Remove code fences
    text = re.sub(r"```(?:xml)?", "", text).strip()
    # If the text doesn't start with '<', try to find the first '<'
    start = text.find("<")
    if start == -1:
        return text
    return text[start:]


def _tokenize_words(text: str) -> list[str]:
    return re.findall(r"\b[\w']+\b", text)


def validate_xml(
    xml_text: str,
    valid_labels: list[str],
    original_text: str | None = None,
    max_word_diff_ratio: float = 0.1,
) -> tuple[bool, str]:
    """
    Returns (is_valid, error_message).

    Rules:
    - Must be parseable XML.
    - Every tag must be one of the valid_labels.
    - The root must not be a dummy wrapper; all children must be label tags.
    - If original_text is provided, XML text content must preserve word count
      within max_word_diff_ratio.
    """
    xml_text = extract_xml_block(xml_text)

    # Wrap in a root so multiple sibling tags are valid
    wrapped = f"<root>{xml_text}</root>"
    try:
        root = ET.fromstring(wrapped)
    except ET.ParseError as exc:
        return False, f"XML parse error: {exc}"

    invalid_tags = [child.tag for child in root if child.tag not in valid_labels]
    if invalid_tags:
        return False, f"Unknown label tags: {invalid_tags}. Allowed: {valid_labels}"

    if original_text is not None:
        extracted_text = " ".join("".join(child.itertext()) for child in root).strip()
        original_count = len(_tokenize_words(original_text))
        extracted_count = len(_tokenize_words(extracted_text))

        if original_count == 0:
            diff_ratio = 0.0 if extracted_count == 0 else 1.0
        else:
            diff_ratio = abs(extracted_count - original_count) / original_count

        if diff_ratio > max_word_diff_ratio:
            return (
                False,
                (
                    "Word count differs too much from original transcript: "
                    f"original={original_count}, labeled={extracted_count}, "
                    f"diff_ratio={diff_ratio:.3f}, max={max_word_diff_ratio:.3f}"
                ),
            )

    return True, ""


def extract_plain_text(xml_text: str) -> str:
    """Extract all text content from an XML string."""
    xml_text = extract_xml_block(xml_text)
    wrapped = f"<root>{xml_text}</root>"
    try:
        root = ET.fromstring(wrapped)
        return " ".join("".join(child.itertext()) for child in root).strip()
    except ET.ParseError:
        return ""


def build_retry_prompt(original_error: str, attempted_xml: str) -> str:
    return (
        f"Your previous XML output was invalid:\n{original_error}\n\n"
        f"Previous attempt:\n{attempted_xml}\n\n"
        "Please fix the XML and return ONLY valid XML with the required label tags. "
        "Do not include any explanation outside the XML tags."
    )
