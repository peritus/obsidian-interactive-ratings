import { App, PluginSettingTab, Setting } from 'obsidian';
import { InteractiveRatingsPlugin } from './InteractiveRatingsPlugin';
import { InteractiveRatingsSettings } from './types';

const DEFAULT_SUPPORTED_EMOJIS = '🎥🏆⭐💎🔥⚡🎯🚀💰🎖️';

export const DEFAULT_SETTINGS: InteractiveRatingsSettings = {
    supportedEmojis: DEFAULT_SUPPORTED_EMOJIS
};

export class InteractiveRatingsSettingTab extends PluginSettingTab {
    plugin: InteractiveRatingsPlugin;

    constructor(app: App, plugin: InteractiveRatingsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Interactive Ratings Settings' });

        new Setting(containerEl)
            .setName('Emojis to support in ratings')
            .setDesc('Emojis to use for ratings.')
            .addTextArea(text => text
                .setPlaceholder(DEFAULT_SUPPORTED_EMOJIS)
                .setValue(this.plugin.settings.supportedEmojis)
                .onChange(async (value) => {
                    this.plugin.settings.supportedEmojis = value;
                    await this.plugin.saveSettings();
                    // Update the symbol patterns with new emojis
                    this.plugin.updateSymbolPatterns();
                }));
    }
}