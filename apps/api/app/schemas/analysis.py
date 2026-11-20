from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CreateAnalysisRequest(BaseModel):
    repo_url: str = Field(min_length=1, max_length=512)


class AnalysisStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    analysis_id: UUID = Field(validation_alias="id")
    commit_sha: str
    status: str
    stage: str
    error: str | None
