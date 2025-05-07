#!/usr/bin/env python3
"""
Download a Hugging Face model into the local ./models directory.

• Works without Git LFS by using huggingface_hub.snapshot_download.
• Override the model with NOWLEDGE_MODEL_ID.
• Override the target directory with NOWLEDGE_MODEL_PATH.
"""

from __future__ import annotations

import os

try:
    # huggingface_hub ≥ 0.23
    from huggingface_hub import snapshot_download
    from huggingface_hub.errors import HfHubHTTPError as HubError
except ImportError:  # very old hub fallback (unlikely as of 2025-05-05)
    from huggingface_hub import snapshot_download  # type: ignore
    from huggingface_hub.utils._errors import HfHubHTTPError as HubError  # type: ignore

MODEL_ID = os.getenv("NOWLEDGE_MODEL_ID", "TaylorAI/bge-micro-v2")
TARGET_DIR = os.getenv("NOWLEDGE_MODEL_PATH", "./models")


def download(model_id: str, target_dir: str) -> bool:
    """Return True on success, False on failure."""
    print(f"Downloading {model_id} → {target_dir}")
    try:
        snapshot_download(
            repo_id=model_id,
            local_dir=target_dir,
            local_dir_use_symlinks=False,
            resume_download=True,
            max_workers=8,
        )
        print(f"✓ Downloaded model {model_id} to {target_dir}")
        return True
    except HubError as err:
        print(f"✗ Failed to download model {model_id}: {err}")
        return False


def main() -> None:
    if not download(MODEL_ID, TARGET_DIR):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
