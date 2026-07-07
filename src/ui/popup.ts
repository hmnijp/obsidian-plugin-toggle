import { Setting } from 'obsidian';
import type PluginTogglePlugin from '../main';

export class PluginTogglePopup {
  plugin: PluginTogglePlugin;
  containerEl!: HTMLElement;
  private closeHandler: (e: MouseEvent) => void;
  private keydownHandler: (e: KeyboardEvent) => void;

  constructor(plugin: PluginTogglePlugin) {
    this.plugin = plugin;
  }

  open() {
    this.containerEl = document.body.createEl('div', { cls: 'plugin-toggle-popup' });

    const manifests = (this.plugin.app as any).plugins.manifests as Record<string, any>;
    const enabledPlugins = (this.plugin.app as any).plugins.enabledPlugins as Set<string>;

    const ids = this.plugin.settings.managedPlugins
      .map(id => ({ id, manifest: manifests[id] }))
      .filter(x => x.manifest)
      .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))
      .map(x => x.id);

    if (ids.length === 0) {
      this.containerEl.createEl('p', { text: 'No plugins selected. Configure in settings.' });
      return;
    }

    for (const id of ids) {
      const manifest = manifests[id];
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
        )
        .addButton((btn) =>
          btn
            .setIcon('settings')
            .setTooltip('Plugin settings')
            .onClick(() => {
              const setting = (this.plugin.app as any).setting;
              setting.open();
              setting.openTabById(id);
              this.close();
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
