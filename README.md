# FlowTank

FlowTank is a Microsoft Power BI custom visual for comparing multiple inflows, multiple outflows, and the resulting balance in a central tank view. It is useful for financial flows, budgets, income and expense mixes, cash movement, and other scenarios where users need to compare what enters and leaves a system.

FlowTank helps report authors explain net movement at a glance: the left side shows contributing inflows or sources of funds, the right side shows outflows or applications of funds, and the central tank summarizes whether the selected context ends in a surplus or deficit. Business users can use the visual to compare revenue and expense categories, funding sources and utilization, cash received and cash spent, inventory intake and consumption, or any other scenario where inflow/outflow, source/application, or positive/negative movements need to be understood together.

The visual is designed for finance, operations, sales, supply chain, and executive reporting audiences that need a compact alternative to separate bar charts or waterfall views. It supports native Power BI formatting, tooltips, cross-filtering, keyboard focus, high contrast mode, and configurable labels so the same report can serve both overview dashboards and detailed review pages.

## Features

- Separate inflow and outflow sides with proportional pipe thickness.
- Central tank view with stacked liquid segments for each side.
- In-visual arrow button to switch liquid arrangement between top-to-bottom and bottom-to-top.
- Configurable default liquid arrangement in the formatting pane.
- Balance indicator for surplus or deficit.
- Optional legends, in-liquid item labels, configurable text size, and configurable display units.
- Configurable labels for inflow, outflow, surplus, deficit, balanced state, legend titles, and sort-button accessibility text.
- Formatting options for primary inflow, primary outflow, and text colors.
- Additional flow segment colors use the Power BI theme palette, with built-in fallback palettes.
- High contrast mode support using the Power BI host color palette.
- Native Power BI tooltips, context menus, keyboard focus, and cross-visual selection.
- Landing page with a GitHub documentation link when fields are not assigned.
- No external web access privileges.

## Field Wells

- **Source**: Pipe label, such as revenue category or expense category.
- **Direction**: Optional grouping that identifies inflow/outflow or source/application of funds. Values containing words like `Source`, `Sources`, `Revenue`, `Income`, `Inflow`, `Credit`, or `Received` are treated as inflow/source of funds. Values containing words like `Application`, `Applications`, `Expense`, `Expenditure`, `Outflow`, `Cost`, `Debit`, `Use`, or `Utilization` are treated as outflow/application of funds.
- **Amount**: Numeric value used for pipe thickness and tank totals.

If **Direction** is not supplied, positive amounts are treated as inflow/source of funds and negative amounts are treated as outflow/application of funds. If all amounts are positive, or the sign of the amount does not identify the flow side, add a **Direction** column and enter values such as `Source of funds` or `Application of funds`, `Inflow` or `Outflow`, or equivalent business labels.

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

Hints and tips for the sample report are included on the `Instruction` page in `sample-data/flowtank_sample.pbix` and maintained in `docs/sample-file-hints-and-tips.md`.

The Partner Center offer description draft is maintained in `docs/partner-center-offer-description.md`.

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

## Version 1.0.1.0 Update

- Added an in-visual arrow toggle for switching liquid sort direction.
- Added a formatting option for the default liquid arrangement.
- Kept legend rows in the same visual order as the selected liquid arrangement.
- Added configurable reader-facing labels for localization and custom terminology.
- Removed unused profit/loss color settings because surplus/deficit is shown by empty tank space.
- Removed redundant in-tank inflow/outflow labels.
- Updated non-primary flow colors to use the Power BI theme palette.

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
