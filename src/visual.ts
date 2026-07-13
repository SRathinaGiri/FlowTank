"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import {
    displayUnitSystemType,
    valueFormatter
} from "powerbi-visuals-utils-formattingutils";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import PrimitiveValue = powerbi.PrimitiveValue;

import { VisualFormattingSettingsModel } from "./settings";

type FlowSelectionId = powerbi.extensibility.ISelectionId & powerbi.visuals.ISelectionId;

interface FlowItem {
    label: string;
    value: number;
    highlightedValue: number;
    hasHighlights: boolean;
    direction: FlowDirection;
    selectionId: FlowSelectionId;
}

type FlowDirection = "in" | "out";
type LegendPosition = "both" | "left" | "right";

interface FlowSummary {
    inflows: FlowItem[];
    outflows: FlowItem[];
    totalIn: number;
    totalOut: number;
    balance: number;
    hasHighlights: boolean;
}

interface Point {
    x: number;
    y: number;
}

interface PipeEntry {
    direction: FlowDirection;
    label: string;
    value: number;
    highlightedValue: number;
    highlightRatio: number;
    hasHighlights: boolean;
    selectionId: FlowSelectionId;
    color: string;
    y: number;
    width: number;
    percent: number;
    segmentTop: number;
    segmentBottom: number;
}

interface TankBorderGap {
    side: "left" | "right";
    y: number;
    width: number;
}

interface SelectionElement {
    element: SVGElement;
    selectionId: FlowSelectionId;
}

interface RenderColors {
    border: string;
    divider: string;
    focus: string;
    inflow: string;
    outflow: string;
    tankFill: string;
    text: string;
}

const SvgNamespace = "http://www.w3.org/2000/svg";
const ViewBoxWidth = 800;
const DefaultViewBoxHeight = 510;
const MinViewBoxHeight = 420;
const MaxViewBoxHeight = 900;
const GitHubUrl = "https://github.com/SRathinaGiri/FlowTank";
const InflowPalette = ["#86EFAC", "#7DD3FC", "#93C5FD", "#A7F3D0", "#99F6E4", "#C4B5FD"];
const OutflowPalette = ["#FCA5A5", "#FDBA74", "#FECACA", "#F9A8D4", "#FDE68A", "#FBCFE8"];
const LiquidTopPadding = 18;
const DefaultValueFormat = "#,0.00";
let visualInstanceCounter = 0;

export class Visual implements IVisual {
    private readonly target: HTMLElement;
    private readonly host: IVisualHost;
    private readonly selectionManager: ISelectionManager;
    private readonly root: HTMLDivElement;
    private readonly svg: SVGSVGElement;
    private readonly tankBorderMaskId: string;
    private readonly tankClipPathId: string;
    private selectedIds: FlowSelectionId[] = [];
    private selectionElements: SelectionElement[] = [];
    private allowInteractions = true;
    private viewBoxHeight = DefaultViewBoxHeight;
    private amountFormat = DefaultValueFormat;
    private autoDisplayUnitValue = 0;
    private formattingSettings: VisualFormattingSettingsModel;
    private readonly formattingSettingsService: FormattingSettingsService;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        visualInstanceCounter += 1;
        this.tankBorderMaskId = `flowTankBorderMask${visualInstanceCounter}`;
        this.tankClipPathId = `flowTankClip${visualInstanceCounter}`;
        this.target = options.element;
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.root = document.createElement("div");
        this.root.className = "flowTankRoot";

        this.svg = document.createElementNS(SvgNamespace, "svg");
        this.svg.classList.add("flowTankSvg");
        this.svg.setAttribute("viewBox", `0 0 ${ViewBoxWidth} ${this.viewBoxHeight}`);
        this.svg.setAttribute("role", "img");
        this.svg.setAttribute("aria-label", "FlowTank visual");

        this.root.appendChild(this.svg);
        this.target.appendChild(this.root);
        this.root.addEventListener("contextmenu", (event) => this.showVisualContextMenu(event));
        this.root.addEventListener("click", () => this.clearSelection());
        this.selectionManager.registerOnSelectCallback((ids) => {
            this.selectedIds = ids as FlowSelectionId[];
            this.updateSelectionStyles();
        });
    }

    public update(options: VisualUpdateOptions): void {
        this.host.eventService.renderingStarted(options);

        try {
            this.updateViewBox(options);

            const dataView = options.dataViews && options.dataViews[0];
            this.formattingSettings = dataView
                ? this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView)
                : new VisualFormattingSettingsModel();
            const colors = this.getRenderColors();
            this.applyColorTheme(colors);
            this.allowInteractions = !this.host.hostCapabilities || this.host.hostCapabilities.allowInteractions !== false;

            this.clear();
            this.selectedIds = this.selectionManager.getSelectionIds() as FlowSelectionId[];

            const summary = this.getFlowSummary(dataView);
            if (!summary.inflows.length && !summary.outflows.length) {
                this.renderLandingPage(colors);
                this.host.eventService.renderingFinished(options);
                return;
            }

            this.render(summary, colors);
            this.updateSelectionStyles();
            this.host.eventService.renderingFinished(options);
        } catch (error) {
            this.host.eventService.renderingFailed(options, error instanceof Error ? error.message : "Unknown rendering error");
            throw error;
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private updateViewBox(options: VisualUpdateOptions): void {
        const viewport = options.viewport;
        const width = viewport && viewport.width > 0 ? viewport.width : ViewBoxWidth;
        const height = viewport && viewport.height > 0 ? viewport.height : DefaultViewBoxHeight;
        const proportionalHeight = ViewBoxWidth * (height / width);

        this.viewBoxHeight = this.clamp(proportionalHeight, MinViewBoxHeight, MaxViewBoxHeight);
        this.svg.setAttribute("viewBox", `0 0 ${ViewBoxWidth} ${this.viewBoxHeight.toFixed(2)}`);
    }

    private render(summary: FlowSummary, colors: RenderColors): void {
        const fontSize = this.getFontSize();
        const textColor = colors.text;
        const inflowColor = colors.inflow;
        const outflowColor = colors.outflow;
        const showLegends = this.formattingSettings.appearance.showLabels.value;
        const showTankLabels = this.formattingSettings.appearance.showTankLabels.value;
        const showItemLabels = this.formattingSettings.appearance.showItemLabels.value;
        const showBalance = this.formattingSettings.appearance.showBalance.value;
        const balancePosition = this.formattingSettings.appearance.balancePosition.value.value;
        const legendPosition = this.getLegendPosition();

        const tankY = !showLegends ? 52 : legendPosition === "both" ? 74 : 66;
        const tankBottomMargin = showBalance && balancePosition === "bottom" ? 52 : 28;
        const tankHeight = Math.max(260, this.viewBoxHeight - tankY - tankBottomMargin);
        const tank = !showLegends
            ? { x: 170, y: tankY, width: 460, height: tankHeight, radius: 30 }
            : legendPosition === "both"
            ? { x: 270, y: tankY, width: 260, height: tankHeight, radius: 30 }
            : legendPosition === "left"
                ? { x: 360, y: tankY, width: 300, height: tankHeight, radius: 30 }
                : { x: 140, y: tankY, width: 300, height: tankHeight, radius: 30 };
        const tankMiddle = tank.x + tank.width / 2;
        const tankBottom = tank.y + tank.height;
        const maxSideTotal = Math.max(summary.totalIn, summary.totalOut, 1);
        const maxFlowValue = Math.max(...summary.inflows.map((item) => item.value), ...summary.outflows.map((item) => item.value), 1);
        const maxLiquidHeight = tank.height - LiquidTopPadding;
        const inFillHeight = Math.max(8, maxLiquidHeight * (summary.totalIn / maxSideTotal));
        const outFillHeight = Math.max(8, maxLiquidHeight * (summary.totalOut / maxSideTotal));

        const inflowEntries = this.getPipeEntries(summary.inflows, "in", tank.y, tank.height, inFillHeight, summary.totalIn, summary.totalIn, maxFlowValue, inflowColor);
        const outflowEntries = this.getPipeEntries(summary.outflows, "out", tank.y, tank.height, outFillHeight, summary.totalOut, summary.totalOut, maxFlowValue, outflowColor);

        const tankGroup = this.svgElement("g");
        this.svg.appendChild(tankGroup);

        this.appendTankFill(tankGroup, tank.x, tank.y, tank.width, tank.height, tank.radius);
        this.appendTankClipPath(tank.x, tank.y, tank.width, tank.height, tank.radius);
        this.appendStackedLiquid(tankGroup, inflowEntries, tank.x, tank.width / 2, tankBottom, inFillHeight, summary.totalIn, showItemLabels, textColor, fontSize);
        this.appendStackedLiquid(tankGroup, outflowEntries, tankMiddle, tank.width / 2, tankBottom, outFillHeight, summary.totalOut, showItemLabels, textColor, fontSize);
        this.appendBalanceAreaTooltip(summary, tank.x, tank.y, tank.width, tank.height, inFillHeight, outFillHeight);

        this.appendTankBorder(tankGroup, tank.x, tank.y, tank.width, tank.height, tank.radius, []);
        this.appendTankTopRim(tankGroup, tank.x, tank.y, tank.width);

        const divider = this.svgElement("line");
        divider.classList.add("flowTankTankDivider");
        divider.setAttribute("x1", tankMiddle.toString());
        divider.setAttribute("x2", tankMiddle.toString());
        divider.setAttribute("y1", (tank.y + 18).toString());
        divider.setAttribute("y2", (tankBottom - 18).toString());
        tankGroup.appendChild(divider);

        if (showTankLabels && this.canShowTankLabels(tank.width, tank.height, fontSize)) {
            this.appendText(tank.x + tank.width * 0.25, tank.y + 32, "Inflow", textColor, fontSize + 2, "middle", "600");
            this.appendText(tank.x + tank.width * 0.75, tank.y + 32, "Outflow", textColor, fontSize + 2, "middle", "600");
        }

        if (showLegends) {
            this.renderLegends(legendPosition, inflowEntries, outflowEntries, summary, tank.x, tank.y, tank.width, textColor, fontSize);
        }

        if (showBalance) {
            const summaryY = balancePosition === "bottom" ? tankBottom + 25 : 35;
            this.appendSummaryLabels(summary, summaryY, tank.x, tank.width, textColor, fontSize);
        }
    }

    private getPipeEntries(
        items: FlowItem[],
        direction: FlowDirection,
        tankY: number,
        tankHeight: number,
        fillHeight: number,
        totalValue: number,
        percentBasis: number,
        maxFlowValue: number,
        baseColor: string
    ): PipeEntry[] {
        if (!items.length || totalValue <= 0 || fillHeight <= 0) {
            return [];
        }

        const sorted = [...items].sort((a, b) => b.value - a.value);
        const palette = direction === "in" ? InflowPalette : OutflowPalette;
        const entries: PipeEntry[] = [];
        const tankBottom = tankY + tankHeight;
        const fillTop = tankBottom - fillHeight;
        let segmentBottom = tankBottom;

        sorted.forEach((item, index) => {
            const color = index === 0 ? baseColor : palette[index % palette.length];
            const width = 4 + 28 * (item.value / maxFlowValue);
            const isLast = index === sorted.length - 1;
            const rawHeight = fillHeight * (item.value / totalValue);
            const segmentHeight = isLast ? Math.max(0, segmentBottom - fillTop) : rawHeight;
            const segmentTop = segmentBottom - segmentHeight;
            const segmentInset = Math.min(Math.max(width / 2 + 2, 5), Math.max(segmentHeight / 2, 0));
            const preferredY = direction === "in"
                ? segmentTop + segmentInset
                : segmentBottom - segmentInset;
            const y = this.clamp(preferredY, tankY + 2, tankBottom - 2);

            entries.push({
                direction,
                label: item.label,
                value: item.value,
                highlightedValue: item.highlightedValue,
                highlightRatio: item.value > 0 ? this.clamp(item.highlightedValue / item.value, 0, 1) : 0,
                hasHighlights: item.hasHighlights,
                selectionId: item.selectionId,
                color,
                y,
                width,
                percent: percentBasis > 0 ? item.value / percentBasis : 0,
                segmentTop,
                segmentBottom
            });
            segmentBottom = segmentTop;
        });

        return entries;
    }

    private renderPipes(
        entries: PipeEntry[],
        direction: FlowDirection,
        tankX: number,
        outsideX: number,
        fontSize: number,
        textColor: string,
        showLabels: boolean
    ): void {
        const labelX = direction === "in" ? outsideX - 12 : outsideX + 12;
        const labelAnchor = direction === "in" ? "end" : "start";
        const maxLabelWidth = direction === "in" ? labelX - 12 : ViewBoxWidth - labelX - 12;

        entries.forEach((entry) => {
            const path = direction === "in"
                ? this.curvePath({ x: outsideX, y: entry.y }, { x: tankX + 22, y: entry.y })
                : this.curvePath({ x: tankX - 22, y: entry.y }, { x: outsideX, y: entry.y });

            this.appendPipe(path, entry.color, entry.width, entry);

            if (showLabels) {
                const label = this.truncateText(this.formatFlowLabel(entry), maxLabelWidth, fontSize);
                this.appendText(labelX, entry.y, label, textColor, fontSize, labelAnchor, "600", undefined, entry);
            }
        });
    }

    private getFlowSummary(dataView?: DataView): FlowSummary {
        const empty: FlowSummary = { inflows: [], outflows: [], totalIn: 0, totalOut: 0, balance: 0, hasHighlights: false };
        const categorical = dataView && dataView.categorical;
        const values = categorical && categorical.values;

        this.amountFormat = DefaultValueFormat;
        this.autoDisplayUnitValue = 0;

        if (!categorical || !values || !values.length) {
            return empty;
        }

        const categories = categorical.categories || [];
        const sourceCategory = this.findCategory(categories, "source");
        const directionCategory = this.findCategory(categories, "direction");
        const amountColumn = this.findValueColumn(values, "amount");

        if (!amountColumn || !amountColumn.values || !amountColumn.values.length) {
            return empty;
        }

        this.amountFormat = amountColumn.source.format || DefaultValueFormat;
        const aggregated = new Map<string, FlowItem>();

        const highlightedValues = amountColumn.highlights;
        const hasHighlights = Boolean(
            highlightedValues &&
            highlightedValues.length &&
            highlightedValues.some((value) => value !== null && value !== undefined)
        );

        amountColumn.values.forEach((rawValue, index) => {
            const numericValue = this.toNumber(rawValue);
            if (!Number.isFinite(numericValue) || numericValue === 0) {
                return;
            }

            const highlightedNumericValue = hasHighlights ? this.toNumber(highlightedValues && highlightedValues[index]) : 0;
            const directionValue = this.toText(directionCategory && directionCategory.values[index]);
            const sourceValue = this.toText(sourceCategory && sourceCategory.values[index]);
            const direction = this.classifyDirection(directionValue, numericValue);
            const label = sourceValue || directionValue || `Flow ${index + 1}`;
            const value = Math.abs(numericValue);
            const highlightedValue = Number.isFinite(highlightedNumericValue) ? Math.abs(highlightedNumericValue) : 0;
            const key = `${direction}|${label}`;
            const existing = aggregated.get(key);
            const selectionId = this.createItemSelectionId(sourceCategory, directionCategory, amountColumn, index);

            if (existing) {
                existing.value += value;
                existing.highlightedValue += highlightedValue;
            } else {
                aggregated.set(key, { label, value, highlightedValue, hasHighlights, direction, selectionId });
            }
        });

        const items = Array.from(aggregated.values());
        const inflows = items.filter((item) => item.direction === "in");
        const outflows = items.filter((item) => item.direction === "out");
        const totalIn = inflows.reduce((sum, item) => sum + item.value, 0);
        const totalOut = outflows.reduce((sum, item) => sum + item.value, 0);
        this.autoDisplayUnitValue = Math.max(totalIn, totalOut, ...items.map((item) => item.value));

        return {
            inflows,
            outflows,
            totalIn,
            totalOut,
            balance: totalIn - totalOut,
            hasHighlights
        };
    }

    private classifyDirection(directionValue: string, numericValue: number): FlowDirection {
        const normalized = directionValue.trim().toLowerCase();

        if (normalized) {
            if (/\b(out|outflow|expense|expenditure|cost|debit|payment|spent|loss|application|applications|use|uses|utilization|deduction|deductions|disbursement|disbursements)\b/.test(normalized)) {
                return "out";
            }

            if (/\b(in|inflow|income|revenue|sales|receipt|receipts|credit|profit|earned|source|sources|funding|received)\b/.test(normalized)) {
                return "in";
            }
        }

        return numericValue < 0 ? "out" : "in";
    }

    private findCategory(categories: DataViewCategoryColumn[], roleName: string): DataViewCategoryColumn | undefined {
        return categories.find((category) => Boolean(category.source && category.source.roles && category.source.roles[roleName]));
    }

    private findValueColumn(values: powerbi.DataViewValueColumns, roleName: string): DataViewValueColumn | undefined {
        return values.find((valueColumn) => Boolean(valueColumn.source && valueColumn.source.roles && valueColumn.source.roles[roleName])) || values[0];
    }

    private createItemSelectionId(
        sourceCategory: DataViewCategoryColumn | undefined,
        directionCategory: DataViewCategoryColumn | undefined,
        amountColumn: DataViewValueColumn,
        index: number
    ): FlowSelectionId {
        const builder = this.host.createSelectionIdBuilder();

        if (sourceCategory) {
            builder.withCategory(sourceCategory, index);
        } else if (directionCategory) {
            builder.withCategory(directionCategory, index);
        } else if (amountColumn.source && amountColumn.source.queryName) {
            builder.withMeasure(amountColumn.source.queryName);
        }

        return builder.createSelectionId() as FlowSelectionId;
    }

    private appendPipe(pathData: string, color: string, width: number, entry: PipeEntry): void {
        const pipe = this.svgElement("path");
        pipe.classList.add("flowTankPipe");
        pipe.setAttribute("d", pathData);
        pipe.setAttribute("stroke", color);
        pipe.setAttribute("stroke-width", width.toFixed(2));
        this.bindItemInteractions(pipe, entry);
        this.svg.appendChild(pipe);

        if (entry.hasHighlights && entry.highlightRatio > 0) {
            const highlightPipe = this.svgElement("path");
            highlightPipe.classList.add("flowTankPipe", "flowTankHighlightOverlay");
            highlightPipe.setAttribute("d", pathData);
            highlightPipe.setAttribute("stroke", color);
            highlightPipe.setAttribute("stroke-width", Math.max(2, width * entry.highlightRatio).toFixed(2));
            this.svg.appendChild(highlightPipe);
        }
    }

    private appendTankFill(parent: SVGElement, x: number, y: number, width: number, height: number, radius: number): void {
        const tankFill = this.svgElement("path");
        tankFill.classList.add("flowTankTankFill");
        tankFill.setAttribute("d", this.tankShapePath(x, y, width, height, radius));
        parent.appendChild(tankFill);
    }

    private appendTankClipPath(x: number, y: number, width: number, height: number, radius: number): void {
        const defs = this.svgElement("defs");
        const clipPath = this.svgElement("clipPath");
        clipPath.setAttribute("id", this.tankClipPathId);
        clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");

        const clipShape = this.svgElement("path");
        clipShape.setAttribute("d", this.tankShapePath(x, y, width, height, radius));
        clipPath.appendChild(clipShape);

        defs.appendChild(clipPath);
        this.svg.appendChild(defs);
    }

    private appendStackedLiquid(
        parent: SVGElement,
        entries: PipeEntry[],
        x: number,
        width: number,
        bottom: number,
        totalHeight: number,
        totalValue: number,
        showItemLabels: boolean,
        textColor: string,
        fontSize: number
    ): void {
        if (!entries.length || totalHeight <= 0 || totalValue <= 0) {
            return;
        }

        let segmentTop = bottom - totalHeight;

        entries.forEach((entry, index) => {
            const isLast = index === entries.length - 1;
            const rawHeight = totalHeight * (entry.value / totalValue);
            const segmentHeight = isLast ? Math.max(0, bottom - segmentTop) : rawHeight;

            this.appendLiquid(parent, x, segmentTop, width, segmentHeight, entry, index === 0);
            if (showItemLabels) {
                this.appendLiquidItemLabel(entry, totalValue, x, segmentTop, width, segmentHeight, textColor, fontSize);
            }
            segmentTop += segmentHeight;
        });
    }

    private appendLiquidItemLabel(
        entry: PipeEntry,
        totalValue: number,
        x: number,
        y: number,
        width: number,
        height: number,
        textColor: string,
        fontSize: number
    ): void {
        const labelFontSize = Math.max(8, fontSize - 1);
        const lineHeight = labelFontSize + 2;
        const labelContent = this.formattingSettings.appearance.itemLabelContent.value.value;
        const hasSecondLine = labelContent !== "label";
        const minimumHeight = hasSecondLine ? lineHeight * 2 + 6 : lineHeight + 6;

        if (height < minimumHeight || width < labelFontSize * 7) {
            return;
        }

        const label = this.svgElement("text");
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const nameLine = this.svgElement("tspan");
        const percentLine = this.svgElement("tspan");

        label.classList.add("flowTankLabel", "flowTankLiquidItemLabel");
        label.setAttribute("x", centerX.toFixed(2));
        label.setAttribute("y", (hasSecondLine ? centerY - lineHeight / 2 : centerY).toFixed(2));
        label.setAttribute("fill", textColor);
        label.setAttribute("font-size", labelFontSize.toString());
        label.setAttribute("font-weight", "700");
        label.setAttribute("text-anchor", "middle");

        nameLine.setAttribute("x", centerX.toFixed(2));
        nameLine.textContent = this.truncateText(entry.label, width - 12, labelFontSize);

        label.appendChild(nameLine);
        if (hasSecondLine) {
            const valueText = this.formatValue(entry.value);
            const percentageText = this.formatPercent(entry.value / totalValue);

            percentLine.setAttribute("x", centerX.toFixed(2));
            percentLine.setAttribute("dy", lineHeight.toString());
            percentLine.textContent = labelContent === "labelValue"
                ? valueText
                : labelContent === "labelValuePercentage"
                    ? `${valueText} | ${percentageText}`
                    : percentageText;
            label.appendChild(percentLine);
        }
        this.bindItemInteractions(label, entry);
        this.svg.appendChild(label);
    }

    private appendSummaryLabels(summary: FlowSummary, y: number, tankX: number, tankWidth: number, textColor: string, fontSize: number): void {
        const summaryFontSize = fontSize + 2;

        this.appendSummaryLabelBlock(
            tankX,
            y,
            "Inflow",
            this.formatValue(summary.totalIn),
            textColor,
            summaryFontSize,
            "600",
            "start"
        );
        this.appendSummaryLabelBlock(
            tankX + tankWidth * 0.5,
            y,
            this.getBalanceStatusLabel(summary),
            this.formatValue(Math.abs(summary.balance)),
            textColor,
            summaryFontSize + 2,
            "700",
            "middle"
        );
        this.appendSummaryLabelBlock(
            tankX + tankWidth,
            y,
            "Outflow",
            this.formatValue(summary.totalOut),
            textColor,
            summaryFontSize,
            "600",
            "end"
        );
    }

    private appendSummaryLabelBlock(
        x: number,
        y: number,
        labelText: string,
        valueText: string,
        color: string,
        fontSize: number,
        weight: string,
        anchor: string
    ): void {
        const lineHeight = fontSize + 3;
        const text = this.svgElement("text");
        const label = this.svgElement("tspan");
        const value = this.svgElement("tspan");

        text.classList.add("flowTankLabel", "flowTankSummaryLabel");
        text.setAttribute("x", x.toFixed(2));
        text.setAttribute("y", (y - lineHeight / 2).toFixed(2));
        text.setAttribute("fill", color);
        text.setAttribute("font-size", fontSize.toString());
        text.setAttribute("font-weight", weight);
        text.setAttribute("text-anchor", anchor);

        label.setAttribute("x", x.toFixed(2));
        label.textContent = labelText;
        text.appendChild(label);

        value.setAttribute("x", x.toFixed(2));
        value.setAttribute("dy", lineHeight.toString());
        value.textContent = valueText;
        text.appendChild(value);

        this.svg.appendChild(text);
    }

    private renderLegends(
        legendPosition: LegendPosition,
        inflowEntries: PipeEntry[],
        outflowEntries: PipeEntry[],
        summary: FlowSummary,
        tankX: number,
        tankY: number,
        tankWidth: number,
        textColor: string,
        fontSize: number
    ): void {
        const legendTopY = tankY + 72;
        const secondY = legendTopY + 152;

        if (legendPosition === "both") {
            const inflowLegendX = 28;
            const outflowLegendX = tankX + tankWidth + 28;

            this.renderLegend("Inflow Mix", inflowEntries, summary.totalIn, inflowLegendX, legendTopY, textColor, fontSize);
            this.renderLegend("Outflow Mix", outflowEntries, summary.totalOut, outflowLegendX, legendTopY, textColor, fontSize);
            return;
        }

        const legendX = legendPosition === "left" ? 28 : tankX + tankWidth + 28;

        this.renderLegend("Inflow Mix", inflowEntries, summary.totalIn, legendX, legendTopY, textColor, fontSize);
        this.renderLegend("Outflow Mix", outflowEntries, summary.totalOut, legendX, secondY, textColor, fontSize);
    }

    private canShowTankLabels(tankWidth: number, tankHeight: number, fontSize: number): boolean {
        return tankWidth >= fontSize * 16 && tankHeight >= fontSize * 12;
    }

    private renderLegend(
        title: string,
        entries: PipeEntry[],
        totalValue: number,
        x: number,
        y: number,
        textColor: string,
        fontSize: number
    ): void {
        if (!entries.length || totalValue <= 0) {
            return;
        }

        const legendFontSize = Math.max(9, fontSize - 1);
        const rowHeight = legendFontSize + 8;

        this.appendText(x, y, title, textColor, fontSize + 1, "start", "700");
        entries.forEach((entry, index) => {
            const rowY = y + 24 + index * rowHeight;
            const swatch = this.svgElement("rect");
            const label = this.truncateText(
                `${entry.label} ${this.formatValue(entry.value)} - ${this.formatPercent(entry.value / totalValue)}`,
                ViewBoxWidth - x - 46,
                legendFontSize
            );

            swatch.classList.add("flowTankLegendSwatch");
            swatch.setAttribute("x", x.toFixed(2));
            swatch.setAttribute("y", (rowY - 6).toFixed(2));
            swatch.setAttribute("width", "12");
            swatch.setAttribute("height", "12");
            swatch.setAttribute("rx", "3");
            swatch.setAttribute("fill", entry.color);
            swatch.setAttribute("stroke", entry.color);
            this.bindItemInteractions(swatch, entry);
            this.svg.appendChild(swatch);
            this.appendText(x + 18, rowY, label, textColor, legendFontSize, "start", "600", undefined, entry);
        });
    }

    private appendBalanceAreaTooltip(
        summary: FlowSummary,
        tankX: number,
        tankY: number,
        tankWidth: number,
        tankHeight: number,
        inFillHeight: number,
        outFillHeight: number
    ): void {
        if (summary.balance === 0) {
            return;
        }

        const isSurplus = summary.balance > 0;
        const tankBottom = tankY + tankHeight;
        const sideX = isSurplus ? tankX + tankWidth / 2 : tankX;
        const lowerFillHeight = isSurplus ? outFillHeight : inFillHeight;
        const emptyY = tankY + LiquidTopPadding;
        const emptyBottom = tankBottom - lowerFillHeight;
        const emptyHeight = Math.max(0, emptyBottom - emptyY);

        if (emptyHeight <= 0) {
            return;
        }

        const area = this.svgElement("rect");
        area.classList.add("flowTankBalanceHoverArea");
        area.setAttribute("x", sideX.toFixed(2));
        area.setAttribute("y", emptyY.toFixed(2));
        area.setAttribute("width", (tankWidth / 2).toFixed(2));
        area.setAttribute("height", emptyHeight.toFixed(2));
        area.setAttribute("clip-path", `url(#${this.tankClipPathId})`);
        this.bindBalanceTooltip(area, summary);
        this.svg.appendChild(area);
    }

    private appendLiquid(parent: SVGElement, x: number, y: number, width: number, height: number, entry: PipeEntry, waveTop: boolean): void {
        if (height <= 0) {
            return;
        }

        const liquid = this.createLiquidPath(x, y, width, height, entry.color, waveTop);
        this.bindItemInteractions(liquid, entry);
        parent.appendChild(liquid);

        if (entry.hasHighlights && entry.highlightRatio > 0) {
            const highlightedHeight = height * entry.highlightRatio;
            const highlightY = y + height - highlightedHeight;
            const highlightLiquid = this.createLiquidPath(x, highlightY, width, highlightedHeight, entry.color, entry.highlightRatio > 0.98 && waveTop);
            highlightLiquid.classList.add("flowTankHighlightOverlay");
            parent.appendChild(highlightLiquid);
        }
    }

    private createLiquidPath(x: number, y: number, width: number, height: number, color: string, waveTop: boolean): SVGPathElement {
        const bottom = y + height;
        const wave = Math.min(12, Math.max(3, height * 0.08));
        const liquid = this.svgElement("path");
        liquid.classList.add("flowTankLiquid");
        liquid.setAttribute("clip-path", `url(#${this.tankClipPathId})`);
        liquid.setAttribute("fill", color);
        liquid.setAttribute("stroke", color);
        liquid.setAttribute("stroke-width", "1.5");
        liquid.setAttribute("vector-effect", "non-scaling-stroke");
        const topPath = waveTop
            ? [
                `M ${x.toFixed(2)} ${(y + wave * 0.45).toFixed(2)}`,
                `C ${(x + width * 0.25).toFixed(2)} ${(y - wave * 0.35).toFixed(2)}, ${(x + width * 0.55).toFixed(2)} ${(y + wave * 1.15).toFixed(2)}, ${(x + width).toFixed(2)} ${(y + wave * 0.35).toFixed(2)}`
            ].join(" ")
            : `M ${x.toFixed(2)} ${y.toFixed(2)} L ${(x + width).toFixed(2)} ${y.toFixed(2)}`;
        liquid.setAttribute("d", `${topPath} L ${(x + width).toFixed(2)} ${bottom.toFixed(2)} L ${x.toFixed(2)} ${bottom.toFixed(2)} Z`);

        return liquid;
    }

    private appendTankBorder(parent: SVGElement, x: number, y: number, width: number, height: number, radius: number, gaps: TankBorderGap[]): void {
        const defs = this.svgElement("defs");
        const mask = this.svgElement("mask");
        mask.setAttribute("id", this.tankBorderMaskId);
        mask.setAttribute("maskUnits", "userSpaceOnUse");
        mask.setAttribute("x", "0");
        mask.setAttribute("y", "0");
        mask.setAttribute("width", ViewBoxWidth.toString());
        mask.setAttribute("height", this.viewBoxHeight.toString());

        const reveal = this.svgElement("rect");
        reveal.setAttribute("x", "0");
        reveal.setAttribute("y", "0");
        reveal.setAttribute("width", ViewBoxWidth.toString());
        reveal.setAttribute("height", this.viewBoxHeight.toString());
        reveal.setAttribute("fill", "#FFFFFF");
        mask.appendChild(reveal);

        gaps.forEach((gapEntry) => {
            const gapHeight = gapEntry.width + 4;
            const gapWidth = 8;
            const gap = this.svgElement("rect");
            gap.setAttribute("x", (gapEntry.side === "left" ? x - gapWidth / 2 : x + width - gapWidth / 2).toFixed(2));
            gap.setAttribute("y", (gapEntry.y - gapHeight / 2).toFixed(2));
            gap.setAttribute("width", gapWidth.toFixed(2));
            gap.setAttribute("height", gapHeight.toFixed(2));
            gap.setAttribute("fill", "#000000");
            mask.appendChild(gap);
        });

        defs.appendChild(mask);
        this.svg.appendChild(defs);

        const tankBorderPath = this.svgElement("path");
        tankBorderPath.classList.add("flowTankTankBorder");
        tankBorderPath.setAttribute("d", this.openTankPath(x, y, width, height, radius));
        tankBorderPath.setAttribute("mask", `url(#${this.tankBorderMaskId})`);
        parent.appendChild(tankBorderPath);
    }

    private appendTankTopRim(parent: SVGElement, x: number, y: number, width: number): void {
        const lip = 28;
        const right = x + width;
        const rimDepth = 12;
        const rim = this.svgElement("path");

        rim.classList.add("flowTankTankTopRim");
        rim.setAttribute("d", [
            `M ${(x - lip).toFixed(2)} ${y.toFixed(2)}`,
            `C ${(x + width * 0.18).toFixed(2)} ${(y + rimDepth).toFixed(2)}, ${(x + width * 0.82).toFixed(2)} ${(y + rimDepth).toFixed(2)}, ${(right + lip).toFixed(2)} ${y.toFixed(2)}`
        ].join(" "));
        parent.appendChild(rim);
    }

    private openTankPath(x: number, y: number, width: number, height: number, radius: number): string {
        const lip = 28;
        const bottom = y + height;
        const right = x + width;

        return [
            `M ${(x - lip).toFixed(2)} ${y.toFixed(2)}`,
            `L ${x.toFixed(2)} ${y.toFixed(2)}`,
            `L ${x.toFixed(2)} ${(bottom - radius).toFixed(2)}`,
            `Q ${x.toFixed(2)} ${bottom.toFixed(2)} ${(x + radius).toFixed(2)} ${bottom.toFixed(2)}`,
            `L ${(right - radius).toFixed(2)} ${bottom.toFixed(2)}`,
            `Q ${right.toFixed(2)} ${bottom.toFixed(2)} ${right.toFixed(2)} ${(bottom - radius).toFixed(2)}`,
            `L ${right.toFixed(2)} ${y.toFixed(2)}`,
            `L ${(right + lip).toFixed(2)} ${y.toFixed(2)}`,
        ].join(" ");
    }

    private tankShapePath(x: number, y: number, width: number, height: number, radius: number): string {
        const right = x + width;
        const bottom = y + height;

        return [
            `M ${x.toFixed(2)} ${y.toFixed(2)}`,
            `L ${right.toFixed(2)} ${y.toFixed(2)}`,
            `L ${right.toFixed(2)} ${(bottom - radius).toFixed(2)}`,
            `Q ${right.toFixed(2)} ${bottom.toFixed(2)} ${(right - radius).toFixed(2)} ${bottom.toFixed(2)}`,
            `L ${(x + radius).toFixed(2)} ${bottom.toFixed(2)}`,
            `Q ${x.toFixed(2)} ${bottom.toFixed(2)} ${x.toFixed(2)} ${(bottom - radius).toFixed(2)}`,
            `L ${x.toFixed(2)} ${y.toFixed(2)}`,
            "Z"
        ].join(" ");
    }

    private appendText(
        x: number,
        y: number,
        text: string,
        color: string,
        fontSize: number,
        anchor: string,
        weight: string,
        extraClass?: string,
        contextEntry?: PipeEntry
    ): SVGTextElement {
        const label = this.svgElement("text");
        label.classList.add("flowTankLabel");
        if (extraClass) {
            label.classList.add(extraClass);
        }

        label.setAttribute("x", x.toFixed(2));
        label.setAttribute("y", y.toFixed(2));
        label.setAttribute("fill", color);
        label.setAttribute("font-size", fontSize.toString());
        label.setAttribute("font-weight", weight);
        label.setAttribute("text-anchor", anchor);
        label.textContent = text;
        if (contextEntry) {
            this.bindItemInteractions(label, contextEntry);
        }
        this.svg.appendChild(label);

        return label;
    }

    private curvePath(start: Point, end: Point): string {
        const distance = Math.abs(end.x - start.x);
        const controlOffset = distance * 0.48;
        const c1 = start.x < end.x ? start.x + controlOffset : start.x - controlOffset;
        const c2 = start.x < end.x ? end.x - controlOffset : end.x + controlOffset;

        return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${c1.toFixed(2)} ${start.y.toFixed(2)}, ${c2.toFixed(2)} ${end.y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
    }

    private clear(): void {
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }

        this.selectionElements = [];
    }

    private showVisualContextMenu(event: MouseEvent): void {
        event.preventDefault();
        if (!this.allowInteractions) {
            return;
        }

        this.selectionManager.showContextMenu(
            this.host.createSelectionIdBuilder().createSelectionId(),
            { x: event.clientX, y: event.clientY }
        );
    }

    private bindItemContextMenu(element: SVGElement, entry: PipeEntry): void {
        element.addEventListener("contextmenu", (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            if (!this.allowInteractions) {
                return;
            }

            this.selectionManager.showContextMenu(
                entry.selectionId,
                { x: event.clientX, y: event.clientY },
                "source"
            );
        });
    }

    private bindItemInteractions(element: SVGElement, entry: PipeEntry): void {
        element.classList.add("flowTankSelectable");
        if (entry.hasHighlights) {
            element.classList.add("flowTankCrossHighlightBase");
            element.classList.toggle("flowTankCrossHighlightDimmed", entry.highlightRatio <= 0);
        }
        element.setAttribute("tabindex", "0");
        element.setAttribute("focusable", "true");
        element.setAttribute("role", "button");
        element.setAttribute("aria-label", `${entry.direction === "in" ? "Inflow" : "Outflow"} ${entry.label}, ${this.formatValue(entry.value)}`);

        element.addEventListener("click", (event: MouseEvent) => {
            event.stopPropagation();
            if (!this.allowInteractions) {
                return;
            }

            this.selectItem(entry.selectionId, event.ctrlKey || event.metaKey);
        });
        element.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
                event.preventDefault();
                event.stopPropagation();
                if (!this.allowInteractions) {
                    return;
                }

                this.selectItem(entry.selectionId, event.ctrlKey || event.metaKey);
            } else if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                event.preventDefault();
                event.stopPropagation();
                if (!this.allowInteractions) {
                    return;
                }

                this.selectionManager.showContextMenu(entry.selectionId, this.getElementCenter(element), "source");
            }
        });
        this.bindItemTooltip(element, entry);
        this.bindItemContextMenu(element, entry);
        this.selectionElements.push({ element, selectionId: entry.selectionId });
    }

    private bindItemTooltip(element: SVGElement, entry: PipeEntry): void {
        if (!this.host.tooltipService || !this.host.tooltipService.enabled()) {
            return;
        }

        element.addEventListener("mousemove", (event: MouseEvent) => {
            this.host.tooltipService.show({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                dataItems: this.getTooltipDataItems(entry),
                identities: [entry.selectionId]
            });
        });
        element.addEventListener("mouseleave", () => {
            this.host.tooltipService.hide({
                isTouchEvent: false,
                immediately: false
            });
        });
    }

    private bindBalanceTooltip(element: SVGElement, summary: FlowSummary): void {
        if (!this.host.tooltipService || !this.host.tooltipService.enabled()) {
            return;
        }

        element.addEventListener("mousemove", (event: MouseEvent) => {
            this.host.tooltipService.show({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                identities: [],
                dataItems: [
                    {
                        displayName: summary.balance > 0 ? "Surplus" : "Deficit",
                        value: this.formatValue(Math.abs(summary.balance))
                    },
                    {
                        displayName: "Inflow",
                        value: this.formatValue(summary.totalIn)
                    },
                    {
                        displayName: "Outflow",
                        value: this.formatValue(summary.totalOut)
                    }
                ]
            });
        });
        element.addEventListener("mouseleave", () => {
            this.host.tooltipService.hide({
                isTouchEvent: false,
                immediately: false
            });
        });
    }

    private selectItem(selectionId: FlowSelectionId, multiSelect: boolean): void {
        if (!this.allowInteractions) {
            return;
        }

        this.selectionManager.select(selectionId, multiSelect).then((ids) => {
            this.selectedIds = ids as FlowSelectionId[];
            this.updateSelectionStyles();
        });
    }

    private clearSelection(): void {
        if (!this.allowInteractions) {
            return;
        }

        this.selectionManager.clear().then(() => {
            this.selectedIds = [];
            this.updateSelectionStyles();
        });
    }

    private updateSelectionStyles(): void {
        const hasSelection = this.selectedIds.length > 0;

        this.selectionElements.forEach((selectionElement) => {
            const isSelected = hasSelection && this.isSelectionIdSelected(selectionElement.selectionId);
            selectionElement.element.classList.toggle("flowTankSelected", isSelected);
            selectionElement.element.classList.toggle("flowTankDimmed", hasSelection && !isSelected);
            selectionElement.element.setAttribute("aria-pressed", isSelected ? "true" : "false");
        });
    }

    private isSelectionIdSelected(selectionId: FlowSelectionId): boolean {
        return this.selectedIds.some((selectedId) =>
            selectedId.equals(selectionId) ||
            selectedId.includes(selectionId) ||
            selectionId.includes(selectedId)
        );
    }

    private getElementCenter(element: SVGElement): powerbi.extensibility.IPoint {
        const rect = element.getBoundingClientRect();

        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    private renderLandingPage(colors: RenderColors): void {
        const titleY = Math.max(120, this.viewBoxHeight * 0.32);
        const linkY = titleY + 86;

        this.appendText(ViewBoxWidth / 2, titleY, "FlowTank", colors.text, 30, "middle", "700");
        this.appendText(ViewBoxWidth / 2, titleY + 42, "Add Source, optional Direction, and Amount fields.", colors.text, 16, "middle", "600", "flowTankMuted");
        this.appendText(ViewBoxWidth / 2, titleY + 66, "Use Direction for inflow/outflow or source/application when signs do not distinguish rows.", colors.text, 14, "middle", "500", "flowTankMuted");

        const link = this.appendText(ViewBoxWidth / 2, linkY, "Open GitHub documentation", colors.focus, 15, "middle", "700", "flowTankLink");
        link.setAttribute("tabindex", "0");
        link.setAttribute("focusable", "true");
        link.setAttribute("role", "link");
        link.setAttribute("aria-label", "Open FlowTank GitHub documentation");
        link.addEventListener("click", (event: MouseEvent) => {
            event.stopPropagation();
            this.host.launchUrl(GitHubUrl);
        });
        link.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
                event.preventDefault();
                event.stopPropagation();
                this.host.launchUrl(GitHubUrl);
            }
        });
    }

    private getRenderColors(): RenderColors {
        const colorPalette = this.host.colorPalette;

        if (colorPalette && colorPalette.isHighContrast) {
            const foreground = this.getPaletteColor(colorPalette.foreground, "#FFFFFF");
            const background = this.getPaletteColor(colorPalette.background, "#000000");
            const selected = this.getPaletteColor(colorPalette.foregroundSelected, foreground);
            const hyperlink = this.getPaletteColor(colorPalette.hyperlink, selected);

            return {
                border: foreground,
                divider: foreground,
                focus: hyperlink,
                inflow: selected,
                outflow: foreground,
                tankFill: background,
                text: foreground
            };
        }

        return {
            border: "#405264",
            divider: "#405264",
            focus: "#2563EB",
            inflow: this.formattingSettings.appearance.inflowColor.value.value,
            outflow: this.formattingSettings.appearance.outflowColor.value.value,
            tankFill: "rgba(255, 255, 255, 0.72)",
            text: this.formattingSettings.appearance.textColor.value.value
        };
    }

    private applyColorTheme(colors: RenderColors): void {
        this.root.classList.toggle("flowTankHighContrast", Boolean(this.host.colorPalette && this.host.colorPalette.isHighContrast));
        this.root.style.setProperty("--flowTankBorder", colors.border);
        this.root.style.setProperty("--flowTankDivider", colors.divider);
        this.root.style.setProperty("--flowTankFocus", colors.focus);
        this.root.style.setProperty("--flowTankTankFill", colors.tankFill);
    }

    private getPaletteColor(colorInfo: powerbi.IColorInfo | undefined, fallback: string): string {
        return colorInfo && colorInfo.value ? colorInfo.value : fallback;
    }

    private getTooltipDataItems(entry: PipeEntry): powerbi.extensibility.VisualTooltipDataItem[] {
        const dataItems: powerbi.extensibility.VisualTooltipDataItem[] = [
            {
                displayName: "Direction",
                value: entry.direction === "in" ? "Inflow" : "Outflow",
                color: entry.color
            },
            {
                displayName: "Source",
                value: entry.label
            },
            {
                displayName: "Amount",
                value: this.formatValue(entry.value)
            }
        ];

        if (entry.hasHighlights) {
            dataItems.push({
                displayName: "Highlighted amount",
                value: this.formatValue(entry.highlightedValue)
            });
        }

        dataItems.push(
            {
                displayName: "Share",
                value: this.formatPercent(entry.percent)
            }
        );

        return dataItems;
    }

    private svgElement<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K] {
        return document.createElementNS(SvgNamespace, tagName);
    }

    private toNumber(value: PrimitiveValue): number {
        if (typeof value === "number") {
            return value;
        }

        if (typeof value === "string") {
            return Number(value.replace(/,/g, ""));
        }

        return Number(value);
    }

    private toText(value: PrimitiveValue): string {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value);
    }

    private formatValue(value: number): string {
        const decimalPlaces = this.clampDecimalPlaces(
            this.formattingSettings.numberFormatting.valueDecimalPlaces.value
        );
        const displayUnits = this.formattingSettings.numberFormatting.displayUnits.value.value;
        const cultureSelector = this.getValueCulture();

        if (displayUnits === "none") {
            const formatted = valueFormatter.format(value, this.amountFormat, true, cultureSelector);

            return this.applyFormatStringGrouping(formatted);
        }

        const unitValues: Record<string, number> = {
            thousands: 1_000,
            millions: 1_000_000,
            billions: 1_000_000_000
        };
        const unitValue = displayUnits === "auto"
            ? this.autoDisplayUnitValue
            : unitValues[displayUnits] || 0;
        const formatter = valueFormatter.create({
            format: this.amountFormat,
            value: unitValue,
            precision: decimalPlaces,
            cultureSelector,
            displayUnitSystemType: displayUnitSystemType.DisplayUnitSystemType.DataLabels
        });

        return this.applyFormatStringGrouping(formatter.format(value));
    }

    private getValueCulture(): string {
        return this.host.locale;
    }

    private applyFormatStringGrouping(formattedValue: string): string {
        const groupSizes = this.getFormatStringGroupSizes();
        if (groupSizes.length < 2) {
            return formattedValue;
        }

        return formattedValue.replace(/\d[\d\s,.'\u2019]*\d|\d/, (numberText) => {
            const decimalPattern = this.getPositiveFormatSection().match(/\.([0#?]+)/);
            const maximumDecimalPlaces = decimalPattern ? decimalPattern[1].length : 0;
            const lastSeparatorIndex = Math.max(
                numberText.lastIndexOf("."),
                numberText.lastIndexOf(",")
            );
            const trailingDigits = lastSeparatorIndex >= 0
                ? numberText.slice(lastSeparatorIndex + 1).replace(/\D/g, "").length
                : 0;
            const hasDecimalPart = maximumDecimalPlaces > 0 &&
                lastSeparatorIndex >= 0 &&
                trailingDigits <= maximumDecimalPlaces;
            const integerText = hasDecimalPart
                ? numberText.slice(0, lastSeparatorIndex)
                : numberText;
            const decimalText = hasDecimalPart
                ? numberText.slice(lastSeparatorIndex)
                : "";
            const digits = integerText.replace(/\D/g, "");
            const groupingSeparator = (integerText.match(/\D/) || [","])[0];

            return this.groupDigits(digits, groupSizes, groupingSeparator) + decimalText;
        });
    }

    private getFormatStringGroupSizes(): number[] {
        const numericPattern = this.getPositiveFormatSection()
            .replace(/"[^"]*"/g, "")
            .match(/[0#?]+(?:,[0#?]+)+(?:\.[0#?]+)?/);
        if (!numericPattern) {
            return [];
        }

        const groups = numericPattern[0].split(".")[0].split(",");
        const sizes = [groups[groups.length - 1].length];

        for (let index = groups.length - 2; index > 0; index -= 1) {
            sizes.push(groups[index].length);
        }

        return sizes;
    }

    private getPositiveFormatSection(): string {
        return this.amountFormat.split(";")[0];
    }

    private groupDigits(digits: string, groupSizes: number[], separator: string): string {
        const groups: string[] = [];
        let end = digits.length;
        let sizeIndex = 0;

        while (end > 0) {
            const size = groupSizes[Math.min(sizeIndex, groupSizes.length - 1)];
            const start = Math.max(0, end - size);
            groups.unshift(digits.slice(start, end));
            end = start;
            sizeIndex += 1;
        }

        return groups.join(separator);
    }

    private formatSignedValue(value: number): string {
        const sign = value > 0 ? "+" : value < 0 ? "-" : "";
        return `${sign}${this.formatValue(Math.abs(value))}`;
    }

    private formatFlowLabel(entry: PipeEntry): string {
        return `${entry.label} ${this.formatValue(entry.value)} - ${this.formatPercent(entry.percent)}`;
    }

    private getBalanceStatusLabel(summary: FlowSummary): string {
        if (summary.balance === 0) {
            return "Balanced";
        }

        return summary.balance > 0 ? "Surplus" : "Deficit";
    }

    private getLegendPosition(): LegendPosition {
        const value = this.formattingSettings.appearance.legendPosition.value.value;

        return value === "left" || value === "right" ? value : "both";
    }

    private formatPercent(value: number): string {
        const decimalPlaces = this.clampDecimalPlaces(
            this.formattingSettings.numberFormatting.percentDecimalPlaces.value
        );

        return new Intl.NumberFormat(undefined, {
            style: "percent",
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        }).format(value);
    }

    private clampDecimalPlaces(value: number): number {
        return Math.min(10, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));
    }

    private truncateText(text: string, maxWidth: number, fontSize: number): string {
        const maxCharacters = Math.max(8, Math.floor(maxWidth / (fontSize * 0.56)));

        if (text.length <= maxCharacters) {
            return text;
        }

        return `${text.slice(0, Math.max(0, maxCharacters - 3))}...`;
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    private getFontSize(): number {
        const configuredSize = this.formattingSettings.appearance.fontSize.value;
        return Math.max(9, Math.min(24, configuredSize || 12));
    }
}
