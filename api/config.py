"""
Env loading + settings. Import this before importing matching.py anywhere in
the app -- matching.py reads SUPABASE_URL/SUPABASE_KEY from os.environ at
import time with no dotenv call of its own, so .env has to already be loaded
into the process environment first.
"""

import os

from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

CORS_ORIGINS = [os.environ.get("VITE_DEV_ORIGIN", "http://localhost:5173")]
