from fastapi import APIRouter, FastAPI

from ai_service.config import settings
from ai_service.models import HealthResponse


app = FastAPI(
    title="CircleNet AI Agent Service",
    version="0.1.0",
    description="Milestone 5 foundation service for CircleNet-AI AI capabilities.",
)

router = APIRouter(prefix=settings.ai_api_prefix)


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.ai_service_name,
        environment=settings.ai_env,
    )


@router.get("/ready", response_model=HealthResponse)
def ready() -> HealthResponse:
    return HealthResponse(
        status="ready",
        service=settings.ai_service_name,
        environment=settings.ai_env,
    )


app.include_router(router)
