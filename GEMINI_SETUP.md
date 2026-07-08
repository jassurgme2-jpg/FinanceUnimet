# Настройка Gemini AI

Публичный сайт на GitHub Pages не должен содержать Gemini API ключ. Если вставить ключ прямо во frontend, любой пользователь сможет увидеть его через DevTools.

Правильная схема такая:

```text
FinanceFlow сайт -> Gemini proxy -> Google Gemini API
```

В приложение попадает только URL proxy, а реальный ключ хранится отдельно в Google Apps Script.

## 1. Создать Gemini proxy

1. Откройте Google Apps Script.
2. Создайте новый проект.
3. Скопируйте код из `scripts/gemini-proxy-apps-script.js` в файл `Code.gs`.
4. Откройте `Project Settings` -> `Script Properties`.
5. Добавьте свойство:

```text
GEMINI_API_KEY=ваш_реальный_gemini_api_key
```

6. Нажмите `Deploy` -> `New deployment`.
7. Тип выберите `Web app`.
8. `Execute as`: `Me`.
9. `Who has access`: `Anyone`.
10. Нажмите `Deploy`.
11. Скопируйте Web App URL, который заканчивается на `/exec`.

## 2. Подключить proxy к GitHub Pages

В репозитории `jassurgme2-jpg/FinanceUnimet`:

1. Откройте `Settings`.
2. Перейдите в `Secrets and variables` -> `Actions`.
3. Откройте вкладку `Variables`.
4. Добавьте repository variable:

```text
VITE_GEMINI_PROXY_URL=https://script.google.com/macros/s/.../exec
```

5. Сделайте push в `main` или вручную перезапустите workflow GitHub Pages.

## 3. Локальный запуск

Для локальной разработки добавьте в `.env.local`:

```text
VITE_GEMINI_PROXY_URL=https://script.google.com/macros/s/.../exec
```

Не добавляйте `GEMINI_API_KEY` в `.env.local` для Vite frontend. Этот ключ должен быть только в Google Apps Script `Script Properties`.

## 4. Как проверить

1. Откройте сайт.
2. Перейдите во вкладку `ИИ Аналитик`.
3. Введите вопрос, например:

```text
Какие основные расходы и что с прибылью?
```

4. Нажмите `Спросить Gemini`.

Если proxy URL не настроен, кнопка будет неактивна, а локальный аналитик продолжит работать без Gemini.

## 5. Частая ошибка

Если сайт показывает:

```text
GEMINI_API_KEY is not configured in Script Properties
```

значит ключ в Google Apps Script добавлен неправильно или не сохранён.

Проверьте `Project Settings` -> `Script Properties`:

```text
Property: GEMINI_API_KEY
Value:    ваш_реальный_gemini_api_key
```

Не пишите `GEMINI_API_KEY=ключ` в одном поле. Название свойства и сам ключ должны быть в разных полях. После исправления нажмите `Save script properties`.
