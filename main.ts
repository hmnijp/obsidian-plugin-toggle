import { App, Plugin, PluginSettingTab, Setting, setIcon } from 'obsidian';

interface PluginToggleSettings {
  managedPlugins: string[];
}

const DEFAULT_SETTINGS: PluginToggleSettings = {
  managedPlugins: [],
};

export default class PluginTogglePlugin extends Plugin {
  settings: PluginToggleSettings;
  popup: PluginTogglePopup | null = null;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'open-plugin-toggle',
      name: 'Open plugin toggle overlay',
      callback: () => this.togglePopup(),
    });

    const item = this.addStatusBarItem();
    setIcon(item, 'puzzle');
    item.setAttribute('aria-label', 'Toggle plugins');
    item.addEventListener('click', () => this.togglePopup());

    this.addSettingTab(new PluginToggleSettingTab(this.app, this));
  }

  togglePopup() {
    if (this.popup) {
      this.popup.close();
    } else {
      this.popup = new PluginTogglePopup(this.app, this);
      this.popup.open();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class PluginToggleSettingTab extends PluginSettingTab {
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
      .forEach(([id, manifest]) => {
        const isEnabled = enabledPlugins.has(id);

        const setting = new Setting(containerEl)
          .setName(manifest.name || id)
          .setDesc(manifest.description || '');

        if (isEnabled) {
          setting.settingEl.addClass('plugin-toggle-enabled');
        } else {
          setting.settingEl.addClass('plugin-toggle-disabled');
        }

        const indicator = setting.settingEl.createEl('span', { cls: 'plugin-toggle-indicator' });
        setting.settingEl.prepend(indicator);

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

        setting.addButton((btn) =>
          btn
            .setIcon('settings')
            .setTooltip('View details')
            .onClick(() => this.openPluginDetails(id)),
        );
      });
  }

  private openPluginDetails(pluginId: string): void {
    const a = document.createElement('a');
    a.href = `obsidian://show-plugin?id=${pluginId}`;
    a.click();
    a.remove();
  }
}

class PluginTogglePopup {
  plugin: PluginTogglePlugin;
  containerEl!: HTMLElement;
  private closeHandler: (e: MouseEvent) => void;
  private keydownHandler: (e: KeyboardEvent) => void;

  constructor(app: App, plugin: PluginTogglePlugin) {
    this.plugin = plugin;
  }

  open() {
    this.containerEl = document.body.createEl('div', { cls: 'plugin-toggle-popup' });

    const manifests = (this.plugin.app as any).plugins.manifests as Record<string, any>;
    const enabledPlugins = (this.plugin.app as any).plugins.enabledPlugins as Set<string>;
    const ids = this.plugin.settings.managedPlugins;

    if (ids.length === 0) {
      this.containerEl.createEl('p', { text: 'No plugins selected. Configure in settings.' });
      return;
    }

    for (const id of ids) {
      const manifest = manifests[id];
      if (!manifest) continue;

      const isEnabled = enabledPlugins.has(id);

      const setting = new Setting(this.containerEl)
        .setName(manifest.name || id)
        .addToggle((toggle) =>
          toggle
            .setValue(isEnabled)
            .onChange(async (value) => {
              const plugins = (this.plugin.app as any).plugins;
              if (value) {
                await plugins.enablePluginAndSave(id);
              } else {
                await plugins.disablePluginAndSave(id);
              }
              setting.settingEl.removeClass('plugin-toggle-enabled');
              setting.settingEl.removeClass('plugin-toggle-disabled');
              setting.settingEl.addClass(value ? 'plugin-toggle-enabled' : 'plugin-toggle-disabled');
            }),
        );

      if (isEnabled) {
        setting.settingEl.addClass('plugin-toggle-enabled');
      } else {
        setting.settingEl.addClass('plugin-toggle-disabled');
      }
    }

    setTimeout(() => {
      const firstToggle = this.containerEl.querySelector('.checkbox-container');
      (firstToggle as HTMLElement)?.focus();
    }, 0);

    this.containerEl.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      this.containerEl.addClass('keyboard-nav');
      const toggles = this.containerEl.querySelectorAll('.checkbox-container');
      if (toggles.length === 0) return;
      const idx = Array.from(toggles).indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown'
        ? (idx + 1) % toggles.length
        : (idx - 1 + toggles.length) % toggles.length;
      (toggles[next] as HTMLElement)?.focus();
    });

    this.closeHandler = (e: MouseEvent) => {
      if (this.containerEl && !this.containerEl.contains(e.target as Node)) {
        this.close();
      }
    };

    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', this.closeHandler);
    }, 0);
    document.addEventListener('keydown', this.keydownHandler);
  }

  close() {
    document.removeEventListener('click', this.closeHandler);
    document.removeEventListener('keydown', this.keydownHandler);
    this.containerEl?.remove();
    this.plugin.popup = null;
  }
}
