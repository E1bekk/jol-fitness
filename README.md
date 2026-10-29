# JOL Fitness

ИИ-тренер: тренировки дома, дневник питания, сканер еды по фото (калории и БЖУ), вода, вес, напоминания.
Сайт + Android-приложение (Capacitor), как JOL-Bilim.

## Команды
```
npm install          # один раз после скачивания
npm run sync         # собрать www и перенести в android (после КАЖДОГО изменения сайта)
npm run icons        # пересоздать иконки и заставку из папки assets
```
Потом Android Studio → открыть папку `android` → Build → Generate Signed App Bundle / APK.

## Сервер (Vercel)
Папка `api`: `coach.js` (ИИ-тренер), `scan.js` (сканер еды), `ai-status.js` (проверка ИИ).
Переменные окружения Vercel: `GEMINI_API_KEY`, `GROQ_API_KEY` (те же, что у JOL-Bilim).
Адрес сервера для приложения — в `scripts/build-www.js` (строка `API_BASE`).
