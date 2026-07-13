# FlowTank Sample File Hints And Tips

The sample PBIX includes a concise version of this guidance on the `Instruction` page. Use the longer text below when updating or expanding the sample report.

## Suggested Text For The Sample Report

FlowTank shows inflows on the left, outflows on the right, and the resulting balance in the center tank.

To use the visual:

1. Assign a category field, such as revenue or expense category, to Source.
2. Assign a numeric field or measure to Amount.
3. Optionally assign a Direction field to identify inflow/outflow rows, or source/application of funds categories.
4. If Direction is not supplied, positive amounts are treated as inflows or sources of funds, and negative amounts are treated as outflows or applications of funds.
5. Use slicers such as Year or Region to validate that FlowTank responds to Power BI cross-filtering.
6. Hover over pipes or tank sections to view native Power BI tooltips.
7. Use the Format pane to change inflow color, outflow color, balance colors, label visibility, label content, text size, display units, and decimal precision.

Tips:

- Use Display units: None when the report should preserve the exact field or measure format.
- Turn on item labels when the visual has enough space to show category names inside the tank.
- Use the balance label to quickly identify whether the current selection has a surplus or deficit.
- Use a Direction column for explicit classification when the data contains both inflow/outflow labels, source/application of funds labels, or positive and negative accounting conventions.
