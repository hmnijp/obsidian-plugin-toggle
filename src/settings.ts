import { App, PluginSettingTab, Setting, setIcon } from 'obsidian';
import type PluginTogglePlugin from './main';

export interface PluginEntry {
  toggle: boolean;
  hotkeys: { modifiers: string | null; key: string | null }[];
}

export interface PluginToggleSettings {
  managedPlugins: Record<string, PluginEntry>;
}

export const DEFAULT_SETTINGS: PluginToggleSettings = {
  managedPlugins: {},
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
      .filter(([id]) => id !== 'obsidian-plugin-toggle')
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

        const indicator = setting.settingEl.createSpan({ cls: 'plugin-toggle-indicator' });
        setting.settingEl.prepend(indicator);

        const gearIcon = setting.controlEl.createSpan({ cls: 'plugin-toggle-gear' });
        setIcon(gearIcon, 'settings');
        gearIcon.setAttribute('aria-label', 'Plugin settings');
        gearIcon.addEventListener('click', () => {
          (this.app as any).setting.openTabById(id);
        });

        setting.addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.managedPlugins[id]?.toggle ?? false)
            .onChange(async (value) => {
              const existing = this.plugin.settings.managedPlugins[id];
              this.plugin.settings.managedPlugins[id] = {
                toggle: value,
                hotkeys: existing?.hotkeys || [],
              };
              await this.plugin.saveSettings();
            }),
        );
      });
  }
}
