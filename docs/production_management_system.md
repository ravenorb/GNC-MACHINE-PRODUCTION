# Production Management System Plan

## Purpose
Establish a web-based production management system for GNC Industries, Inc. that mirrors the CNC program file workflow, organizes station documentation, and supports scheduling, inventory tracking, and maintenance planning. The system is intended to run in Docker on a multi-homed Proxmox host.

## Stations and Assets
| Station | Program Type | Operator Docs | Notes |
| --- | --- | --- | --- |
| HK Fiber Laser | `.mpf` files | PDF instructions | MPF stored in central repository. PDF provides operator steps. |
| Waterjet | G-code files | PDF instructions | Mirrors laser workflow. |
| Fabrication Brake | Controller programs (job #) | PDF instructions | Job numbers on brake must cross-reference part numbers. |
| CNC Robotic Welder | Controller programs | PDF weld sheets | Programs for parts; weld sheets for operator guidance. |
| Manual Machine Shop | Custom work orders | Work order PDF | Includes lathe, mill, drill/tap, iron worker, grinder, shear. |
| Manual Welding | N/A | PDF instructions | Includes production welders, plasma cutter, etc. |

## Core Data Domains
### Files & Documentation
- **Program files**: `.mpf`, G-code, or controller program references.
- **PDF instructions**: cut sheets, weld sheets, station manuals.
- **Manuals**: maintenance manuals and station reference material.

### Production Entities
- **Products**: sellable assemblies or parts.
- **Cut sheets**: PDF definition of sheet utilization and required operations.
- **Work orders**: custom instructions for manual machine shop.
- **Job numbers**: brake controller IDs tied to parts.

### Inventory & Flow
- **Raw material**: 10, 12, 16 gauge stainless sheets.
- **In-process inventory**: per-station queues tracking part counts and status.
- **Finished inventory**: completed goods.

### Maintenance & Consumables
- **Consumables** per station: part number, quantity, life, vendor, vendor part #, manual link.
- **Maintenance schedule**: task, due interval, assigned worker, completion tracking.

### Workforce
- **Workers**: name, role, qualifications.
- **Qualifications**: station certifications/permissions.

## Required Relationships
- **Cut sheet ↔ program file** (laser/waterjet).
- **Cut sheet ↔ brake job number** (fabrication).
- **Cut sheet ↔ welding instructions** (manual/robotic).
- **Cut sheet ↔ consumables** (required to run the job).
- **Part ↔ station inventory** (counts in queue at each station).

## Operational Workflows
### Scheduling & Production Planning
1. Production manager selects a cut sheet/product.
2. System pulls required raw material, machine time, consumables.
3. Scheduler assigns priority order to laser or waterjet jobs.
4. Cut files + PDFs become the production queue for the target station.
5. Operators mark jobs complete, moving parts to next station queue.

### Station Execution
- Each station exposes a work queue of parts/jobs with required PDFs and program files.
- Operators can mark progress and completion.
- Inventory counts update per station.

### Maintenance & Consumables
- Dashboard shows upcoming tasks and overdue items.
- Consumable stock levels are logged for reorder planning.

## Initial Build Focus
1. **Information architecture** (entities and relationships).
2. **PDF ingestion** workflow (upload, store, parse metadata).
3. **Web interface** for:
   - browsing cut sheets,
   - building job lists,
   - prioritizing station queues,
   - marking completion.

## Parsing Roadmap
- Capture metadata from PDFs: part numbers, sheet requirements, operations, station references.
- Link parsed metadata to program files and job numbers.
- Store extracted data for scheduling and inventory reporting.

## Parsing Expectations for Sample Files
Use the sample filenames as the initial source of truth for metadata extraction until PDF/MPF content parsing is implemented. The parser should extract the following fields for every sample file:
- **Product name** (leading token before the station code).
- **Station** (station code in filename, e.g., `HK`, `WJ`).
- **Gauge/material hints** (suffix tokens embedded in the product name, captured as-is).
- **File type** (file extension such as `.pdf` or `.mpf`).
- **Program family** (station code, stored separately to allow grouping).

| Sample filename | Product name | Station | Gauge/material hints | File type | Program family |
| --- | --- | --- | --- | --- | --- |
| `100_200SS 2HK.pdf` | `100_200SS` | `HK` | `SS` | `pdf` | `HK` |
| `100_200SS 2HK.MPF` | `100_200SS` | `HK` | `SS` | `mpf` | `HK` |
| `200SM 1HK.pdf` | `200SM` | `HK` | `SM` | `pdf` | `HK` |
| `200SM 1HK.MPF` | `200SM` | `HK` | `SM` | `mpf` | `HK` |
| `200SM - 1WJ.pdf` | `200SM` | `WJ` | `SM` | `pdf` | `WJ` |
| `300SS 1HK.pdf` | `300SS` | `HK` | `SS` | `pdf` | `HK` |
| `300SS 1HK.MPF` | `300SS` | `HK` | `SS` | `mpf` | `HK` |

## TODO
- Define filename parsing rules for sample files (see [Parsing Expectations for Sample Files](#parsing-expectations-for-sample-files)).
- Confirm whether material hints (e.g., `SS`, `SM`) should be normalized or stored verbatim.

## Repository Structure (Proposed)
```
/docs
  production_management_system.md
/src
  (future web app source)
```

## Open Questions
- Final PDF metadata format expectations for cut sheets.
- Where program files are hosted for initial integration.
- Required authentication/role granularity for operators vs. managers.
