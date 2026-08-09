from typing import Any, Literal
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str

class PersonCandidate(BaseModel):
    id: int | str
    name: str = ""
    surname: str = ""
    location: str = ""
    company: str = ""
    phone: str | None = None
    email: str | None = None
    relationship: str = ""

class SearchRankRequest(BaseModel):
    query: str = Field(min_length=1, max_length=160)
    candidates: list[PersonCandidate] = Field(max_length=500)

class RankedPerson(BaseModel):
    id: int | str
    score: float
    reasons: list[str]

class DuplicateRequest(BaseModel):
    people: list[PersonCandidate] = Field(min_length=2, max_length=500)

class DuplicatePair(BaseModel):
    first_id: int | str
    second_id: int | str
    confidence: float
    reasons: list[str]
    requires_review: bool = True

class RelationshipEdge(BaseModel):
    source_id: int | str
    target_id: int | str
    relationship: str

class FamilyInsightRequest(BaseModel):
    consent: bool
    people: list[PersonCandidate] = Field(max_length=1000)
    relationships: list[RelationshipEdge] = Field(max_length=2000)

class FamilyInsight(BaseModel):
    kind: Literal["SUMMARY", "DATA_QUALITY", "SUGGESTION"]
    title: str
    detail: str
    related_ids: list[int | str] = Field(default_factory=list)
    requires_review: bool = False

class EnrichmentRequest(BaseModel):
    consent: bool
    person: PersonCandidate
    known_fields: dict[str, Any] = Field(default_factory=dict, max_length=30)

class EnrichmentSuggestion(BaseModel):
    field: str
    suggested_value: str
    confidence: float
    source: str
    requires_review: bool = True
