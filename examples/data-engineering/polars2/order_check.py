"""Polars 2.0 demo: make the order of analytical results explicit.

Run with: python examples/data-engineering/polars2/order_check.py
Requires: polars==2.0.0
"""

import polars as pl


orders = pl.LazyFrame(
    {
        "customer": ["Bob", "Amy", "Bob", "Amy"],
        "amount": [20, 10, 30, 5],
    }
)

totals = (
    orders.group_by("customer")
    .agg(pl.col("amount").sum().alias("total"))
    .sort("customer")
    .collect()
)

expected = pl.DataFrame(
    {"customer": ["Amy", "Bob"], "total": [15, 50]}
)
assert totals.equals(expected), "Totals or sort order changed"

print(f"Polars version: {pl.__version__}")
print("Grouped totals with explicit sort:")
print(totals)
print("PASS: business values and output ordering are verified")

# If a left join must preserve the left input's row order, ask for it.
left = pl.LazyFrame({"id": [3, 1, 2]})
right = pl.LazyFrame({"id": [1, 2, 3], "label": ["A", "B", "C"]})
joined = left.join(right, on="id", how="left", maintain_order="left").collect()
assert joined["id"].to_list() == [3, 1, 2]
print("PASS: left-join input order is preserved explicitly")
