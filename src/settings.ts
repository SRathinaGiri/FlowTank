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

    profitColor = new formattingSettings.ColorPicker({
        name: "profitColor",
        displayName: "Profit color",
        value: { value: "#93C5FD" }
    });

    lossColor = new formattingSettings.ColorPicker({
        name: "lossColor",
        displayName: "Loss color",
        value: { value: "#F87171" }
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

    showTankLabels = new formattingSettings.ToggleSwitch({
        name: "showTankLabels",
        displayName: "Show tank labels",
        value: true
    });

    showItemLabels = new formattingSettings.ToggleSwitch({
        name: "showItemLabels",
        displayName: "Show item labels in liquid",
        value: false
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
        this.profitColor,
        this.lossColor,
        this.textColor,
        this.showLabels,
        this.showTankLabels,
        this.showItemLabels,
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

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    appearance = new AppearanceSettings();
    numberFormatting = new NumberFormattingSettings();
    cards = [this.appearance, this.numberFormatting];
}
