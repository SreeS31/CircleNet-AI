from fastapi.testclient import TestClient
from ai_service.main import app

client = TestClient(app)

def test_search_ranking_and_duplicates_require_human_review() -> None:
    people = [
        {"id": 1, "name": "S P Jayadev", "location": "Hyderabad", "phone": "+919000000001"},
        {"id": 2, "name": "SP Jayadev", "location": "Hyderabad", "phone": "+919000000001"},
        {"id": 3, "name": "Rambabu", "location": "Chennai"},
    ]
    ranked = client.post("/api/v1/search/rank", json={"query": "Jayadev", "candidates": people})
    assert ranked.status_code == 200
    assert ranked.json()[0]["id"] in (1, 2)
    duplicate = client.post("/api/v1/duplicates", json={"people": people})
    assert duplicate.status_code == 200
    assert duplicate.json()[0]["confidence"] == 1.0
    assert duplicate.json()[0]["requires_review"] is True

def test_family_insights_require_explicit_consent() -> None:
    denied = client.post("/api/v1/family/insights", json={"consent": False, "people": [], "relationships": []})
    assert denied.status_code == 403
    allowed = client.post("/api/v1/family/insights", json={"consent": True, "people": [{"id": 1, "name": "One"}], "relationships": []})
    assert allowed.status_code == 200
    assert any(item["requires_review"] for item in allowed.json())

def test_enrichment_never_changes_profile_automatically() -> None:
    response = client.post("/api/v1/profiles/enrichment", json={"consent": True, "person": {"id": 1, "name": "One", "company": "INCOIS"}, "known_fields": {}})
    assert response.status_code == 200
    assert response.json()[0]["requires_review"] is True

def test_contact_organizer_suggests_family_and_company_circles() -> None:
    response = client.post("/api/v1/contacts/organize", json={
        "consent": True,
        "contacts": [
            {"contact_key": "1", "display_name": "Lakshmi Akka", "phones": ["+919999999999"]},
            {"contact_key": "2", "display_name": "Ravi Office", "phones": ["+918888888888"], "organization": "INCOIS"}
        ]
    })
    assert response.status_code == 200
    result = response.json()
    assert result[0]["suggested_relationship"] == "Sister"
    assert "Family" in result[0]["suggested_circles"]
    assert result[1]["suggested_relationship"] == "Colleague"
    assert "INCOIS" in result[1]["suggested_circles"]
    assert all(item["requires_review"] for item in result)
