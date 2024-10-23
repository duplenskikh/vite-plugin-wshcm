interface WshcmConfiguration {
  output: string;
}

declare module 'vite-plugin-wshcm-builder' {
  export function wshcmBuilder(config: WshcmConfiguration): {
    name: string;
    handleHotUpdate(): void;
  };
}