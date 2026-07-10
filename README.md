# FlowTank

FlowTank is a Microsoft Power BI custom visual for comparing multiple inflows, multiple outflows, and the resulting balance in a central tank view. It is useful for financial flows, budgets, income and expense mixes, cash movement, and other scenarios where users need to compare what enters and leaves a system.

## Features

- Separate inflow and outflow sides with proportional pipe thickness.
- Central tank view with stacked liquid segments for each side.
- Balance indicator for surplus or deficit.
- Optional legends, tank labels, item labels, and configurable text size.
- Formatting options for inflow, outflow, profit, loss, and text colors.
- High contrast mode support using the Power BI host color palette.
- Native Power BI tooltips, context menus, keyboard focus, and cross-visual selection.
- Landing page with a GitHub documentation link when fields are not assigned.
- No external web access privileges.

## Field Wells

- **Source**: Pipe label, such as revenue category or expense category.
- **Direction**: Optional grouping that identifies inflow or outflow. Values containing words like `Revenue`, `Income`, `Inflow`, or `Credit` are treated as inflow. Values containing words like `Expense`, `Expenditure`, `Outflow`, `Cost`, or `Debit` are treated as outflow.
- **Amount**: Numeric value used for pipe thickness and tank totals.

If **Direction** is not supplied, positive amounts are treated as inflow and negative amounts are treated as outflow.

## Number Formatting

FlowTank uses the Power BI format string assigned to the **Amount** field. Currency symbols, decimal precision, negative-value patterns, and grouping patterns are applied consistently to totals, legends, in-liquid labels, tooltips, and accessibility text.

The visual also supports grouping sequences encoded in custom format strings, including standard thousands grouping and lakh/crore grouping. For example, a format pattern with repeated two-digit secondary groups can display `14636000` as `1,46,36,000`.

Power BI provides custom visuals with the Power BI interface locale, which can differ from the report's separate regional format locale. To reproduce nonstandard grouping reliably, define the required grouping in the **Amount** field or measure format string. Use **Display units: None** when the original Power BI format should be shown without automatic scaling.

## Sample Files

Sample assets are included for AppSource validation and user evaluation:

- `sample-data/flowtank_sample_financials.csv`
- `sample-data/flowtank_sample.pbix`
- `FlowTankScreenshot.png`

The CSV includes `Year` and `Region` dimensions in addition to the FlowTank field-well columns. Use `Region` in a slicer or another visual to validate inbound cross-filtering and cross-highlighting behavior.

## Build

Install dependencies:

```powershell
npm install
```

Run lint:

```powershell
npm run lint
```

Package the visual:

```powershell
npm run package
```

Run the Power BI certification package command:

```powershell
npm run package:certification
```

The packaged visual is created in `dist`.

## Certification Notes

This repository is prepared for Microsoft Power BI custom visual certification:

- The certification source branch is `certification`.
- The repository contains source code for one visual only.
- `node_modules`, `.tmp`, and `dist` are excluded from source control.
- `capabilities.json` declares no web access privileges.
- The visual does not call external services.
- The visual does not use `fetch`, `XMLHttpRequest`, `eval`, or `innerHTML`.
- The visual declares tooltip, high contrast, landing page, empty data view, keyboard focus, highlight, and multi-visual selection support.
- App icon assets are included in `assets/icon.png` and `assets/icon-large.png`.

## Privacy And Support

- Privacy policy: [PRIVACY.md](PRIVACY.md)
- Support: [SUPPORT.md](SUPPORT.md)
- Issues: https://github.com/SRathinaGiri/FlowTank/issues

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
