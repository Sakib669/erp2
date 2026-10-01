## Context

The ERP system needs to manage physical assets (computers, machinery, vehicles) across its branches. These assets represent significant capital investments that degrade over time. The business requires a reliable way to compute this degradation (depreciation) and automatically record it in the general ledger, reducing the manual accounting workload at month-end.

## Options considered

1. **Manual Journal Entries (Do nothing)**
   - **Pros**: Zero development effort.
   - **Cons**: High risk of calculation errors. No dedicated asset registry or audit history. Book values are opaque.
2. **Dedicated Asset Management Module (Recommended)**
   - **Pros**: Single source of truth for assets. Automated depreciation schedules. GL integration guarantees balance sheet accuracy.
   - **Cons**: Increases system footprint and requires new data models.
3. **Integration with external Fixed Asset SaaS**
   - **Pros**: Out-of-the-box advanced depreciation (MACRS, double-declining).
   - **Cons**: Substantial integration effort to keep GL in sync. Disjointed user experience. Overkill for current requirements.

## Rationale

We selected the **Dedicated Asset Management Module** because it perfectly aligns with our Tracer Bullet approach of building vertical slices end-to-end within the same system. The GL is already in place, making the GL integration straightforward. It eliminates manual accounting errors and provides immediate visibility into asset allocation across branches.

## References

- Project sources: Double Entry General Ledger spec (`0010-double-entry-general-ledger`) for Journal Entry integration.
- Practices & standards: Straight-line depreciation accounting principles.
