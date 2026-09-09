"""Load local configuration independently of the shell's working directory."""

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent


def load_environment(env_file: Path | None = None) -> environ.Env:
    """Read backend/.env explicitly, keeping existing process variables authoritative."""
    env = environ.Env(
        DJANGO_DEBUG=(bool, False),
        DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
        CORS_ALLOWED_ORIGINS=(list, ["http://localhost:3000"]),
    )
    path = env_file if env_file is not None else BASE_DIR / ".env"
    if path.is_file():
        environ.Env.read_env(env_file=path, overwrite=False)
    return env
