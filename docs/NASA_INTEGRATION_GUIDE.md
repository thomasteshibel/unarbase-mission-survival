# NASA integration guide

## Rules

- Only use validated NASA datasets.
- Check measurement units before applying data to the habitat simulator.
- Confirm the time range and region of the dataset.
- Preserve original metadata and document any transformation.
- Never treat simulated values as direct measurements of crew exposure inside a lunar habitat.

## Integration steps

1. Collect the dataset and review source metadata.
2. Convert it to the internal `measurements` structure used by the adapter.
3. Validate all numbers and missing values.
4. Apply the transformed data only to compatible systems such as solar radiation or power estimates.
5. Test the mission engine to confirm the updated data does not break the mission logic.
