declare module "gifsicle-wasm-browser" {
  export type GifsicleInputFile = ArrayBuffer | Blob | File | string;

  export type GifsicleInput = {
    file: GifsicleInputFile;
    name: string;
  };

  export type GifsicleRunOptions = {
    input: GifsicleInput[];
    command: string[];
    folder?: string[];
    isStrict?: boolean;
    start?: (input: GifsicleInput[]) => void;
  };

  const gifsicle: {
    tool: {
      workerLocalUrl: string;
    };
    run(options: GifsicleRunOptions): Promise<File[] | null>;
  };

  export default gifsicle;
}
