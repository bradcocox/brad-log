"""DuckDB 2.0 local demo: query different JSON shapes via VARIANT.

Run with: python examples/data-engineering/duckdb2/variant_example.py
Requires: duckdb==2.0.0
"""

import duckdb


db = duckdb.connect(":memory:")
db.execute(
    """
    CREATE TABLE events AS
    SELECT 1 AS event_id, '{"event":"click","x":10}'::JSON::VARIANT AS payload
    UNION ALL
    SELECT 2 AS event_id, '{"event":"purchase","total":99}'::JSON::VARIANT
    """
)

print(f"DuckDB version: {duckdb.__version__}")
rows = db.execute(
    "SELECT event_id, variant_type(payload), variant_keys(payload) "
    "FROM events ORDER BY event_id"
).fetchall()
for row in rows:
    print(row)

assert rows[0][0:2] == (1, "OBJECT")
assert rows[1][0:2] == (2, "OBJECT")
assert set(rows[0][2]) == {"event", "x"}
assert set(rows[1][2]) == {"event", "total"}
print("PASS: both JSON shapes are readable as VARIANT")
