import { App, PluginSettingTab, Setting, setIcon } from 'obsidian';
import type PluginTogglePlugin from './main';

export interface PluginToggleSettings {
  managedPlugins: string[];
}

export const DEFAULT_SETTINGS: PluginToggleSettings = {
  managedPlugins: [],
};

export class PluginToggleSettingTab extends PluginSettingTab {
  plugin: PluginTogglePlugin;

  constructor(app: App, plugin: PluginTogglePlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.icon = 'puzzle';
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('p', {
      text: 'Select plugins that will appear in the quick toggle popup. Only checked plugins are shown in the status bar overlay.',
      cls: 'plugin-toggle-settings-desc',
    });

    const manifests = (this.app as any).plugins.manifests as Record<string, any>;
    const enabledPlugins = (this.app as any).plugins.enabledPlugins as Set<string>;

    Object.entries(manifests)
      .filter(([id]) => id !== 'plugin-toggle')
      .sort(([, a], [, b]) => a.name.localeCompare(b.name))
      .forEach(([id, manifest]) => {
        const isEnabled = enabledPlugins.has(id);

        const setting = new Setting(containerEl)
          .setDesc(manifest.description || '');

        setting.nameEl.empty();
        setting.nameEl.createEl('a', {
          text: manifest.name || id,
          href: `obsidian://show-plugin?id=${id}`,
        });

        if (isEnabled) {
          setting.settingEl.addClass('plugin-toggle-enabled');
        } else {
          setting.settingEl.addClass('plugin-toggle-disabled');
        }

        const indicator = setting.settingEl.createEl('span', { cls: 'plugin-toggle-indicator' });
        setting.settingEl.prepend(indicator);

        const gearIcon = setting.controlEl.createEl('span', { cls: 'plugin-toggle-gear' });
        setIcon(gearIcon, 'settings');
        gearIcon.setAttribute('aria-label', 'Plugin settings');
        gearIcon.addEventListener('click', () => {
          (this.app as any).setting.openTabById(id);
        });

        setting.addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.managedPlugins.includes(id))
            .onChange(async (value) => {
              if (value) {
                this.plugin.settings.managedPlugins.push(id);
              } else {
                const idx = this.plugin.settings.managedPlugins.indexOf(id);
                if (idx !== -1) this.plugin.settings.managedPlugins.splice(idx, 1);
              }
              await this.plugin.saveSettings();
            }),
        );
      });
  }
}
