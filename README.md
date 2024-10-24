# vite-plugin-wshcm

Vite плагин для транспиляции TypeScript кода в формат WSHCM

## Установка

```bash
npm i @umbrik/vite-plugin-wshcm -D
```

## Конфигурация плагина

Необходимо создать файл **vite.config.js**

```ts
import { resolve } from 'path';
import wshcm from '@umbrik/vite-plugin-wshcm';

export default {
  plugins: [
    wshcm({
      output: resolve(import.meta.dirname, "build")
    }),
  ]
};
```

- output - Путь к директории для сохранения транспилированных файлов

## Использование

Запуск плагина осуществляется командой

```bash
npx vite
```

## Обратная связь

https://github.com/duplenskikh/vite-plugin-wshcm/issues

## License

MIT