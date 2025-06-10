import { Plugin } from 'obsidian';
import { LOGGING_ENABLED } from './constants';
import { ratingEditorExtension } from './editor-extension/ratingViewPlugin/ratingViewPlugin';
import { InteractiveRatingsSettings } from './types';
import { DEFAULT_SETTINGS, InteractiveRatingsSettingTab } from './settings';
import { updateSymbolPatternsFromSettings } from './utils/updateSymbolPatternsFromSettings';

export class InteractiveRatingsPlugin extends Plugin {
  settings: InteractiveRatingsSettings;

  async onload(): Promise<void> {
    if (LOGGING_ENABLED) {
      console.info('[InteractiveRatings] Plugin loading - edit mode only');
    }

    // Load settings
    await this.loadSettings();

    // Update symbol patterns based on settings
    this.updateSymbolPatterns();

    // Register editor extension for interactive ratings in editing mode only
    this.registerEditorExtension(ratingEditorExtension);

    // Add settings tab
    this.addSettingTab(new InteractiveRatingsSettingTab(this.app, this));

    if (LOGGING_ENABLED) {
      console.info('[InteractiveRatings] Plugin loaded successfully');
    }
  }

  onunload(): void {
    if (LOGGING_ENABLED) {
      console.info('[InteractiveRatings] Plugin unloaded');
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  updateSymbolPatterns(): void {
    updateSymbolPatternsFromSettings(this.settings);
  }
}