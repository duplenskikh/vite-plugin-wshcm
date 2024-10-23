# vite-plugin-wshcm

Vite плагин для транспиляции TypeScript кода в формат WSHCM

## Установка

```bash
npm i TBD
```

## Использование

```ts
import { resolve } from 'path';
import wshcm from 'vite-plugin-wshcm';

export default {
  plugins: [
    wshcm({
      output: resolve(import.meta.dirname, "build")
    }),
  ]
};
```

## Конфигурация плагина

- output - Путь к директории для сохранения транспилированных файлов

## Обратная связь

TBD

## License

MIT