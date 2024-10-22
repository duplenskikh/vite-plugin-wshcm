interface WebTutorConfiguration {
  output: string;
}

declare module 'vite-plugin-webtutor' {
  export function webtutor(config: WebTutorConfiguration): {
    name: string;
    handleHotUpdate(): void;
  };
}