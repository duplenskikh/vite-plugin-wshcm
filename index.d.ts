import { HmrContext } from "vite";

export interface WSHCMConfiguration {
  output: string;
}

declare module '@umbrik/vite-plugin-wshcm' {
  export default function wshcm(config: WSHCMConfiguration): {
    name: string;
    handleHotUpdate(ctx: HmrContext): Promise<void>;
  };
}