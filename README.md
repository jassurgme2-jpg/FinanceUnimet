# FinanceFlow Dashboard

## Автоподключение Google Sheets

Чтобы пользователи открывали веб-ссылку уже с подключенной базой, задайте конфиг при сборке:

1. Скопируйте `.env.example` в `.env.local`.
2. Вставьте ваш Google Sheets API key в `VITE_GOOGLE_API_KEY`.
3. Запустите `npm run build` и задеплойте `dist`.

Для хостинга вроде Vercel/Netlify эти же значения можно указать в Environment Variables.

Важно: `VITE_*` переменные попадают в браузерный JavaScript. Для read-only Google Sheets это нормально только если API key ограничен в Google Cloud:

- Application restrictions: HTTP referrers, только ваш домен
- API restrictions: только Google Sheets API
- сама таблица должна быть доступна на чтение по ссылке или публично для API key

Если нужны приватные данные без раскрытия ключа в браузере, нужен backend/proxy или Apps Script web app.

## GitHub Pages

В проекте уже есть workflow `.github/workflows/deploy.yml`.

Перед первым деплоем:

1. Откройте GitHub repo `jassurgme2-jpg/FinanceUnimet`.
2. Settings -> Secrets and variables -> Actions -> New repository secret.
3. Добавьте secret с именем `VITE_GOOGLE_API_KEY` и значением вашего Google Sheets API key.
4. Settings -> Pages -> Build and deployment -> Source: `GitHub Actions`.
5. Сделайте push в `main`.

После выполнения workflow сайт будет доступен по ссылке:

```text
https://jassurgme2-jpg.github.io/FinanceUnimet/
```

## Команды

```bash
npm run dev
npm run build
npm run lint
```
