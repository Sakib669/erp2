# Rationale: Operations and Branch Services

## Why native operations modules?

Branch operations such as visitor tracking, internal support requests, document management, and fleet reservations are often handled through fragmented paper logs or disjointed cloud subscriptions. Bringing them directly into the ERP ensures branch level accountability, consolidated audit logging, and streamlined security oversight.

## Overlap prevention for vehicle reservations

Vehicle reservations query for existing non cancelled reservations that overlap the requested start and end timestamps before insertion. This avoids double booking company assets.

## Document storage metadata

Documents store metadata such as title, category, file URL, MIME type, and file size in minor bytes. Physical assets can point to local object storage or cloud storage buckets.
