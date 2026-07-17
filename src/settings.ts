"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class AppearanceSettings extends FormattingSettingsCard {
    inflowColor = new formattingSettings.ColorPicker({
        name: "inflowColor",
        displayName: "Inflow color",
        value: { value: "#86EFAC" }
    });

    outflowColor = new formattingSettings.ColorPicker({
        name: "outflowColor",
        displayName: "Outflow color",
        value: { value: "#FCA5A5" }
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Text color",
        value: { value: "#1F2933" }
    });

    showLabels = new formattingSettings.ToggleSwitch({
        name: "showLabels",
        displayName: "Show legends",
        value: true
    });

    showItemLabels = new formattingSettings.ToggleSwitch({
        name: "showItemLabels",
        displayName: "Show item labels in liquid",
        value: false
    });

    itemLabelContent = new formattingSettings.ItemDropdown({
        name: "itemLabelContent",
        displayName: "In-liquid label content",
        value: { value: "labelPercentage", displayName: "Labels with percentages" },
        items: [
            { value: "label", displayName: "Labels only" },
            { value: "labelValue", displayName: "Labels with values" },
            { value: "labelPercentage", displayName: "Labels with percentages" },
            { value: "labelValuePercentage", displayName: "Labels with values and percentages" }
        ]
    });

    liquidArrangement = new formattingSettings.ItemDropdown({
        name: "liquidArrangement",
        displayName: "Liquid arrangement",
        value: { value: "topToBottom", displayName: "Top to bottom" },
        items: [
            { value: "topToBottom", displayName: "Top to bottom" },
            { value: "bottomToTop", displayName: "Bottom to top" }
        ]
    });

    showBalance = new formattingSettings.ToggleSwitch({
        name: "showBalance",
        displayName: "Show balance",
        value: true
    });

    balancePosition = new formattingSettings.ItemDropdown({
        name: "balancePosition",
        displayName: "Totals position",
        value: { value: "top", displayName: "Top" },
        items: [
            { value: "top", displayName: "Top" },
            { value: "bottom", displayName: "Bottom" }
        ]
    });

    legendPosition = new formattingSettings.ItemDropdown({
        name: "legendPosition",
        displayName: "Legend position",
        value: { value: "both", displayName: "Both sides" },
        items: [
            { value: "both", displayName: "Both sides" },
            { value: "left", displayName: "Left side only" },
            { value: "right", displayName: "Right side only" }
        ]
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Text size",
        value: 12
    });

    name: string = "appearance";
    displayName: string = "Appearance";
    slices: Array<FormattingSettingsSlice> = [
        this.inflowColor,
        this.outflowColor,
        this.textColor,
        this.showLabels,
        this.showItemLabels,
        this.itemLabelContent,
        this.liquidArrangement,
        this.showBalance,
        this.balancePosition,
        this.legendPosition,
        this.fontSize
    ];
}

class NumberFormattingSettings extends FormattingSettingsCard {
    displayUnits = new formattingSettings.ItemDropdown({
        name: "displayUnits",
        displayName: "Display units",
        value: { value: "auto", displayName: "Auto" },
        items: [
            { value: "auto", displayName: "Auto" },
            { value: "none", displayName: "None" },
            { value: "thousands", displayName: "Thousands" },
            { value: "millions", displayName: "Millions" },
            { value: "billions", displayName: "Billions" }
        ]
    });

    valueDecimalPlaces = new formattingSettings.NumUpDown({
        name: "valueDecimalPlaces",
        displayName: "Value decimal places",
        value: 1
    });

    percentDecimalPlaces = new formattingSettings.NumUpDown({
        name: "percentDecimalPlaces",
        displayName: "Percentage decimal places",
        value: 1
    });

    name: string = "numberFormatting";
    displayName: string = "Number formatting";
    slices: Array<FormattingSettingsSlice> = [
        this.displayUnits,
        this.valueDecimalPlaces,
        this.percentDecimalPlaces
    ];
}

class LabelSettings extends FormattingSettingsCard {
    inflowLabel = new formattingSettings.TextInput({
        name: "inflowLabel",
        displayName: "Inflow label",
        value: "Inflow",
        placeholder: "Inflow"
    });

    outflowLabel = new formattingSettings.TextInput({
        name: "outflowLabel",
        displayName: "Outflow label",
        value: "Outflow",
        placeholder: "Outflow"
    });

    surplusLabel = new formattingSettings.TextInput({
        name: "surplusLabel",
        displayName: "Surplus label",
        value: "Surplus",
        placeholder: "Surplus"
    });

    deficitLabel = new formattingSettings.TextInput({
        name: "deficitLabel",
        displayName: "Deficit label",
        value: "Deficit",
        placeholder: "Deficit"
    });

    balancedLabel = new formattingSettings.TextInput({
        name: "balancedLabel",
        displayName: "Balanced label",
        value: "Balanced",
        placeholder: "Balanced"
    });

    inflowLegendTitle = new formattingSettings.TextInput({
        name: "inflowLegendTitle",
        displayName: "Inflow legend title",
        value: "Inflow Mix",
        placeholder: "Inflow Mix"
    });

    outflowLegendTitle = new formattingSettings.TextInput({
        name: "outflowLegendTitle",
        displayName: "Outflow legend title",
        value: "Outflow Mix",
        placeholder: "Outflow Mix"
    });

    arrangeBottomToTopLabel = new formattingSettings.TextInput({
        name: "arrangeBottomToTopLabel",
        displayName: "Arrange bottom-to-top label",
        value: "Arrange liquid bottom to top",
        placeholder: "Arrange liquid bottom to top"
    });

    arrangeTopToBottomLabel = new formattingSettings.TextInput({
        name: "arrangeTopToBottomLabel",
        displayName: "Arrange top-to-bottom label",
        value: "Arrange liquid top to bottom",
        placeholder: "Arrange liquid top to bottom"
    });

    name: string = "labels";
    displayName: string = "Labels";
    slices: Array<FormattingSettingsSlice> = [
        this.inflowLabel,
        this.outflowLabel,
        this.surplusLabel,
        this.deficitLabel,
        this.balancedLabel,
        this.inflowLegendTitle,
        this.outflowLegendTitle,
        this.arrangeBottomToTopLabel,
        this.arrangeTopToBottomLabel
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    appearance = new AppearanceSettings();
    numberFormatting = new NumberFormattingSettings();
    labels = new LabelSettings();
    cards = [this.appearance, this.numberFormatting, this.labels];
}
