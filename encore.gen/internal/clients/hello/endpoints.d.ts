import { CallOpts } from "encore.dev/api";

type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;
type WithCallOpts<T extends (...args: any) => any> = (
  ...args: [...Parameters<T>, opts?: CallOpts]
) => ReturnType<T>;

import { get as get_handler } from "../../../../hello/hello.js";
type get_Type = WithCallOpts<typeof get_handler>;
declare const get: get_Type;
export { get };


export class Client {
  private constructor();

  readonly get: get_Type;
}

export declare function ref(): Client;
