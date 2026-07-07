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
        this.legendPosition,
        this.fontSize
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    appearance = new AppearanceSettings();
    cards = [this.appearance];
}
