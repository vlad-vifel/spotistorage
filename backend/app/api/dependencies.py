from fastapi import APIRouter
from app.services.deps_check import check_dependencies

router = APIRouter(prefix="/api/dependencies", tags=["dependencies"])


@router.get("")
def get_dependencies():
    return check_dependencies()
