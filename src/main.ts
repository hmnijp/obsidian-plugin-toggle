import { Plugin, setIcon } from 'obsidian';
import { type PluginToggleSettings, DEFAULT_SETTINGS, PluginToggleSettingTab } from './settings';
import { PluginTogglePopup } from './ui/popup';

export default class PluginTogglePlugin extends Plugin {
  settings: PluginToggleSettings;
  popup: PluginTogglePopup | null = null;
  registeredPluginIds: string[] = [];

  private getPluginCommandId(pluginId: string): string {
    return `toggle-${pluginId}`;
  }

  private addPluginCommand(pluginId: string) {
    const manifests = (this.app as any).plugins.manifests as Record<string, any>;
    const manifest = manifests[pluginId];
    const name = manifest?.name || pluginId;

    this.addCommand({
      id: this.getPluginCommandId(pluginId),
      name: `Plugin Toggle: ${name}`,
      callback: async () => {
        const plugins = (this.app as any).plugins;
        if (plugins.enabledPlugins.has(pluginId)) {
          await plugins.disablePluginAndSave(pluginId);
        } else {
          await plugins.enablePluginAndSave(pluginId);
        }
      },
    });

    this.registeredPluginIds.push(pluginId);
  }

  private removePluginCommand(pluginId: string) {
    this.removeCommand(this.getPluginCommandId(pluginId));
    this.registeredPluginIds = this.registeredPluginIds.filter(id => id !== pluginId);
  }

  private registerPluginCommands() {
    for (const id of this.settings.managedPlugins) {
      this.addPluginCommand(id);
    }
  }

  async onload() {
    await this.loadSettings();

    this.registerPluginCommands();

    this.addCommand({
      id: 'open-overlay',
      name: 'Open plugin toggle overlay',
      callback: () => this.togglePopup(),
    });

    const item = this.addStatusBarItem();
    setIcon(item, 'puzzle');
    item.setAttribute('aria-label', 'Toggle plugins');
    item.addEventListener('click', () => this.togglePopup());

    this.addSettingTab(new PluginToggleSettingTab(this.app, this));
  }

  onunload() {
    this.popup?.close();
  }

  togglePopup() {
    if (this.popup) {
      this.popup.close();
    } else {
      this.popup = new PluginTogglePopup(this);
      this.popup.open();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    const currentIds = new Set(this.registeredPluginIds);
    const newIds = new Set(this.settings.managedPlugins);

    for (const id of currentIds) {
      if (!newIds.has(id)) {
        this.removePluginCommand(id);
      }
    }

    for (const id of newIds) {
      if (!currentIds.has(id)) {
        this.addPluginCommand(id);
      }
    }

    await this.saveData(this.settings);
  }
}
