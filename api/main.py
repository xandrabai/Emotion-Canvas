"""FastAPI entrypoint. Run from the repo root: uvicorn api.main:app --reload"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import config
from api.routes import router

app = FastAPI(title="Digital Art Therapy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
