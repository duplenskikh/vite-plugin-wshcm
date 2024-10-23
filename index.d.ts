declare module 'vite-plugin-wshcm' {
  export function wshcm(config: { output: string }): {
    name: string;
    handleHotUpdate(): void;
  };
}