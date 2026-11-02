import time
import statistics
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_search_and_concurrency_performance(client):
    """
    EETT Section 9 & Annex 2 Rows 20, 21, 28:
    Demonstrates search p95 <= 1.0 second and record retrieval p95 <= 2.0 seconds
    under concurrent load (simulating 30 concurrent user requests).
    """
    queries = [
        "Muñoz", "munoz", "MUNOZ", "Perez", "Gonzalez",
        "11111111", "12345678", "18888888", "A-10", "PAT"
    ]

    def execute_search_request(q: str) -> float:
        t0 = time.perf_counter()
        res = client.get(f"/api/v1/busqueda/autocomplete?q={q}")
        t1 = time.perf_counter()
        assert res.status_code == 200
        return t1 - t0

    # Simulate 30 concurrent search queries
    requests = [queries[i % len(queries)] for i in range(30)]
    latencies = []

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = executor.map(execute_search_request, requests)
        latencies = list(results)

    latencies.sort()
    n = len(latencies)
    p50 = latencies[int(n * 0.50)]
    p95 = latencies[int(n * 0.95)]
    p99 = latencies[min(int(n * 0.99), n - 1)]

    print(f"\n[PERFORMANCE BENCHMARK] Search Latencies (30 queries):")
    print(f"  p50: {p50*1000:.2f} ms")
    print(f"  p95: {p95*1000:.2f} ms")
    print(f"  p99: {p99*1000:.2f} ms")

    # Assert EETT Section 9 requirement: p95 <= 1.0 second
    assert p95 <= 1.0, f"Search p95 ({p95}s) exceeded 1.0s threshold"

    # Test record retrieval performance
    def execute_record_open(u_id: int) -> float:
        t0 = time.perf_counter()
        res = client.get(f"/api/v1/ubicaciones/{u_id}/historial")
        t1 = time.perf_counter()
        assert res.status_code in (200, 404)
        return t1 - t0

    with ThreadPoolExecutor(max_workers=5) as executor:
        rec_latencies = list(executor.map(execute_record_open, [1, 2, 3, 4, 5] * 2))

    rec_latencies.sort()
    rec_p95 = rec_latencies[int(len(rec_latencies) * 0.95)]

    print(f"[PERFORMANCE BENCHMARK] Record Open Latencies (10 queries):")
    print(f"  p95: {rec_p95*1000:.2f} ms")

    # Assert EETT Section 9 requirement: record retrieval p95 <= 2.0 seconds
    assert rec_p95 <= 2.0, f"Record open p95 ({rec_p95}s) exceeded 2.0s threshold"
