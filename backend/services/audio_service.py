import os
from pathlib import Path

import aiofiles

from core.config import settings


async def save_audio(answer_id: str, data: bytes) -> str:
    """Persist raw audio bytes to disk. Returns the file path."""
    audio_dir = Path(settings.AUDIO_TEMP_DIR)
    audio_dir.mkdir(parents=True, exist_ok=True)
    file_path = audio_dir / f"{answer_id}.m4a"
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(data)
    return str(file_path)


def save_audio_sync(answer_id: str, data: bytes) -> str:
    """Synchronous version for use in the background worker."""
    audio_dir = Path(settings.AUDIO_TEMP_DIR)
    audio_dir.mkdir(parents=True, exist_ok=True)
    file_path = audio_dir / f"{answer_id}.m4a"
    file_path.write_bytes(data)
    return str(file_path)


def delete_audio(audio_path: str) -> None:
    """Remove audio file after processing to free disk space."""
    try:
        os.remove(audio_path)
    except FileNotFoundError:
        pass
