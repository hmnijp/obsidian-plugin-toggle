import { Plugin, setIcon } from 'obsidian';
import { type PluginToggleSettings, type PluginEntry, DEFAULT_SETTINGS, PluginToggleSettingTab } from './settings';
import { PluginTogglePopup } from './ui/popup';

export default class PluginTogglePlugin extends Plugin {
  settings!: PluginToggleSettings;
  popup: PluginTogglePopup | null = null;
  registeredPluginIds: string[] = [];

  private getPluginCommandId(pluginId: string): string {
    return `toggle-${pluginId}`;
  }

  private getHotkeyId(pluginId: string): string {
    return `${this.manifest.id}:${this.getPluginCommandId(pluginId)}`;
  }

  private addPluginCommand(pluginId: string) {
    const manifests = (this.app as any).plugins.manifests as Record<string, any>;
    const manifest = manifests[pluginId];
    const name = manifest?.name || pluginId;

    this.addCommand({
      id: this.getPluginCommandId(pluginId),
      name: `Toggle: ${name}`,
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

    const entry = this.settings.managedPlugins[pluginId];
    if (entry?.hotkeys && entry.hotkeys.length > 0) {
      try {
        const km = (this.app as any).hotkeyManager;
        if (km) {
          const customKeys = km.customKeys as Record<string, unknown> | undefined;
          if (customKeys) {
            customKeys[this.getHotkeyId(pluginId)] = entry.hotkeys;
            if (km.save) km.save();
          }
        }
      } catch {
        console.warn('Plugin Toggle: failed to restore hotkeys for', pluginId);
      }
    }
  }

  private removePluginCommand(pluginId: string) {
    this.removeCommand(this.getPluginCommandId(pluginId));
    this.registeredPluginIds = this.registeredPluginIds.filter(id => id !== pluginId);
  }

  private registerPluginCommands() {
    for (const [id, entry] of Object.entries(this.settings.managedPlugins)) {
      if (entry.toggle) {
        this.addPluginCommand(id);
      }
    }
  }

  async onload() {
    await this.loadSettings();

    this.registerPluginCommands();

    this.addCommand({
      id: 'open-overlay',
      name: 'Open overlay',
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
    const data = await this.loadData() as Record<string, unknown> | undefined;
    if (data && Array.isArray(data.managedPlugins)) {
      const managedPlugins: Record<string, PluginEntry> = {};
      const arr = data.managedPlugins as string[];
      const oldHotkeys = (data.pluginHotkeys as Record<string, { modifiers: string | null; key: string | null }[]> | undefined) ?? {};
      for (const id of arr) {
        managedPlugins[id] = { toggle: true, hotkeys: oldHotkeys[id] ?? [] };
      }
      this.settings = { managedPlugins };
    } else {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    }
  }

  async saveSettings() {
    await this.reloadHotkeysFromFile();

    for (const id of this.registeredPluginIds) {
      try {
        const km = (this.app as any).hotkeyManager;
        if (km?.customKeys) {
          const hotkeys = km.customKeys[this.getHotkeyId(id)] as { modifiers: string | null; key: string | null }[] | undefined;
          if (hotkeys && hotkeys.length > 0) {
            const entry = this.settings.managedPlugins[id];
            if (entry) {
              entry.hotkeys = JSON.parse(JSON.stringify(hotkeys));
            }
          }
        }
      } catch {
        console.warn('Plugin Toggle: failed to save hotkeys for', id);
      }
    }

    for (const [id, entry] of Object.entries(this.settings.managedPlugins)) {
      if (entry.toggle) {
        if (!this.registeredPluginIds.includes(id)) {
          this.addPluginCommand(id);
        }
      } else {
        if (this.registeredPluginIds.includes(id)) {
          this.removePluginCommand(id);
        }
      }
    }

    await this.saveData(this.settings);
  }

  async reloadHotkeysFromFile() {
    try {
      const fileData = await this.loadData() as Record<string, unknown> | undefined;
      if (fileData?.managedPlugins && typeof fileData.managedPlugins === 'object' && !Array.isArray(fileData.managedPlugins)) {
        for (const [id, fileEntry] of Object.entries(fileData.managedPlugins as Record<string, unknown>)) {
          const fe = fileEntry as Record<string, unknown>;
          const fileHotkeys = fe.hotkeys as { modifiers: string | null; key: string | null }[] | undefined;
          if (fileHotkeys?.length) {
            const current = this.settings.managedPlugins[id];
            if (current) {
              current.hotkeys = JSON.parse(JSON.stringify(fileHotkeys));
            }
          }
        }
      }
    } catch {}
  }
}
