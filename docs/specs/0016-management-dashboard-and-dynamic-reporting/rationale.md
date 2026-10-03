# Rationale: Management Dashboard and Dynamic Reporting

## Real time computation versus pre computed data warehouses

For our single database enterprise system, running direct read queries over indexed ledger lines, stock levels, and payroll runs provides instant real time accuracy without data warehouse lag.

## Tabular reporting abstraction

Each report definition exports consistent metadata: title, column headers, typed row records, and computed numeric totals. This unified structure powers both the client side interactive table and the CSV export utility without duplicating extraction logic.
