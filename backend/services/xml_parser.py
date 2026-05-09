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


def validate_xml(xml_text: str, valid_labels: list[str]) -> tuple[bool, str]:
    """
    Returns (is_valid, error_message).

    Rules:
    - Must be parseable XML.
    - Every tag must be one of the valid_labels.
    - The root must not be a dummy wrapper; all children must be label tags.
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
