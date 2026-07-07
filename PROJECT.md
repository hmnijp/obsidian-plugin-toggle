# Plugin Toggle — Obsidian Plugin

## Концепция

Минималистичный плагин для Obsidian, который позволяет быстро включать и выключать другие плагины через оверлей из статус-бара.

## Возможности

- Кнопка с иконкой `puzzle` (сторонние плагины) в статусной строке
- По клику — оверлей (Modal) со списком выбранных плагинов и чекбоксами
- Каждый чекбокс мгновенно включает/выключает плагин (с сохранением состояния)
- В настройках — чекбоксы для выбора, какими плагинами управлять (по умолчанию ни один)
- Горячая клавиша через `addCommand()` (назначается пользователем в настройках Obsidian)
- Повторный клик на иконку закрывает оверлей

## Отказ от чего

- Нет кнопки Close в модалке (закрытие по клику вне или по иконке)
- Нет кастомных стилей (styles.css пустой)
- Нет поддержки Obsidian < 1.13.0 (используем declarative settings API)

## Архитектура

### Структура файлов

```
plugin-toggle/
├── manifest.json        # id, name, version, minAppVersion: 1.13.0
├── versions.json        # "1.0.0": "1.13.0"
├── package.json         # obsidian, esbuild, typescript
├── tsconfig.json        # target ES6, module ESNext
├── esbuild.config.mjs   # esbuild: main.ts → main.js
├── main.ts              # весь код плагина
├── styles.css           # пустой
└── PROJECT.md           # этот файл
```

### Настройки

```ts
interface PluginToggleSettings {
  managedPlugins: string[]; // массив ID плагинов, выбранных пользователем
}
```

Хранятся в `data.json` через стандартный `this.saveData()`.

### Компоненты

| Компонент | Наследует | Назначение |
|---|---|---|
| `PluginTogglePlugin` | `Plugin` | Инициализация, статус-бар, команда, вкладка настроек |
| `PluginToggleSettingTab` | `PluginSettingTab` | Declarative настройки (`getSettingDefinitions()`) с render-колбеками |
| `PluginToggleModal` | `Modal` | Оверлей со списком плагинов и переключателями |

### API

Внутренний `app.plugins` (через `(this.app as any).plugins`):

| Метод / свойство | Назначение |
|---|---|
| `manifests` | `Record<string, PluginManifest>` — все установленные плагины |
| `enabledPlugins` | `Set<string>` — ID включённых плагинов |
| `enablePluginAndSave(id)` | Включить плагин (сохранить) |
| `disablePluginAndSave(id)` | Выключить плагин (сохранить) |

### Логика работы

1. **onload()**: загружает настройки, добавляет иконку в статус-бар, регистрирует команду, добавляет вкладку настроек
2. **Статус-бар**: иконка `puzzle`. При клике:
   - Если модалка открыта — закрыть
   - Если закрыта — открыть `PluginToggleModal`
3. **Модалка**: читает `enabledPlugins` при каждом открытии. Для каждого ID из `managedPlugins`:
   - `Setting` с названием плагина (из `manifests[id].name`)
   - `Toggle` с текущим состоянием
   - onChange → `enablePluginAndSave` / `disablePluginAndSave`
4. **Настройки**: `getSettingDefinitions()` — для каждого установленного плагина (кроме `plugin-toggle`) создаёт render-колбек с `Toggle`
5. **Горячая клавиша**: `this.addCommand({ id: 'open-plugin-toggle', name: 'Open plugin toggle overlay', callback })`

## Вопросы (решенные)

- **enablePlugin vs enablePluginAndSave**: используем `AndSave` — изменения сохраняются между сессиями
- **Закрытие модалки**: по клику вне (стандартное поведение Modal) или повторному клику на иконку
- **Место хранения настроек**: стандартный `data.json` в папке плагина (через `saveData()`)
- **Иконка**: `puzzle` (Lucide) — та же, что у раздела Community plugins в настройках
- **Минимальная версия Obsidian**: 1.13.0 (declarative settings API)
