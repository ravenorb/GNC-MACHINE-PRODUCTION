# TODO

Use the structured asset manifest at `samples/manifest.json` to identify the correct station files for each product before building workflows or ingesting assets.

## Asset-linked Tasks
| Task | Asset Group (Manifest Reference) | Notes |
| --- | --- | --- |
| Validate 200SM HK laser program ingestion | `products[product=200SM].stations[station_type=HK laser]` | Confirm MPF + PDF ingest and metadata mapping. |
| Validate 200SM WJ waterjet documentation | `products[product=200SM].stations[station_type=WJ waterjet]` | Confirm PDF-only workflow handling. |
| Validate 300SS HK laser assets | `products[product=300SS].stations[station_type=HK laser]` | Single-station HK set. |
| Validate 100_200SS HK laser assets | `products[product=100_200SS].stations[station_type=HK laser]` | Single-station HK set. |
