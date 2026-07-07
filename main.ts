import { App, Modal, Plugin, PluginSettingTab, Setting, setIcon } from 'obsidian';

interface PluginToggleSettings {
  managedPlugins: string[];
}

const DEFAULT_SETTINGS: PluginToggleSettings = {
  managedPlugins: [],
};

export default class PluginTogglePlugin extends Plugin {
  settings: PluginToggleSettings;
  modal: PluginToggleModal | null = null;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'open-plugin-toggle',
      name: 'Open plugin toggle overlay',
      callback: () => this.toggleModal(),
    });

    const item = this.addStatusBarItem();
    setIcon(item, 'puzzle');
    item.setAttribute('aria-label', 'Toggle plugins');
    item.addEventListener('click', () => this.toggleModal());

    this.addSettingTab(new PluginToggleSettingTab(this.app, this));
  }

  toggleModal() {
    if (this.modal) {
      this.modal.close();
    } else {
      this.modal = new PluginToggleModal(this.app, this);
      this.modal.open();
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
          .setName(manifest.name || id);

        if (isEnabled) {
          setting.settingEl.addClass('plugin-toggle-enabled');
        } else {
          setting.settingEl.addClass('plugin-toggle-disabled');
        }

        const descEl = new DocumentFragment();
        const statusEm = document.createElement('em');
        statusEm.textContent = isEnabled ? 'Enabled' : 'Disabled';
        descEl.appendChild(statusEm);
        if (manifest.description) {
          descEl.append(` — ${manifest.description}`);
        }
        setting.setDesc(descEl);

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

class PluginToggleModal extends Modal {
  plugin: PluginTogglePlugin;

  constructor(app: App, plugin: PluginTogglePlugin) {
    super(app);
    this.plugin = plugin;
    this.setTitle('Plugin Toggle');
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass('plugin-toggle-modal');

    const manifests = (this.app as any).plugins.manifests as Record<string, any>;
    const enabledPlugins = (this.app as any).plugins.enabledPlugins as Set<string>;
    const ids = this.plugin.settings.managedPlugins;

    if (ids.length === 0) {
      contentEl.createEl('p', { text: 'No plugins selected. Configure in settings.' });
      return;
    }

    for (const id of ids) {
      const manifest = manifests[id];
      if (!manifest) continue;

      const isEnabled = enabledPlugins.has(id);

      new Setting(contentEl)
        .setName(manifest.name || id)
        .addToggle((toggle) =>
          toggle
            .setValue(isEnabled)
            .onChange(async (value) => {
              const plugins = (this.app as any).plugins;
              if (value) {
                await plugins.enablePluginAndSave(id);
              } else {
                await plugins.disablePluginAndSave(id);
              }
            }),
        );
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.plugin.modal = null;
  }
}
