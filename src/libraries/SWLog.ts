
export interface SWLogOptions {
  console?: SWLogConsole;
};

export type SWConsoleLoggerFn = (...args: any[]) => void;

export interface SWLogConsole extends Partial<Console> {
  log: SWConsoleLoggerFn;
  debug: SWConsoleLoggerFn;
  trace: SWConsoleLoggerFn;
  info: SWConsoleLoggerFn;
  warn: SWConsoleLoggerFn;
  error: SWConsoleLoggerFn;
};

const NOOP = () => {};

type SWLogBuiltinConsoles = "env" | "null" | "default";


// class semantics here are for compat -- the singleton is `SWConsoleLog`
export default class SWLog {
  private static _nullConsole: SWLogConsole | undefined
  private static _singletonConsole: SWLogConsole | undefined;

  public static get nullConsole(): SWLogConsole {
    // test spies need an invariant object reference for `called`
    SWLog._nullConsole =
      SWLog._nullConsole ||
      ["log", "debug", "trace", "info", "warn", "error"].reduce(
        (l, m) => ({ ...l, [m]: NOOP }),
        {}
      ) as SWLogConsole;

      return SWLog._nullConsole;
  }

  // NB properties' being calculated just in time mitigates hard-to-debug
  // sequencing errors from TestEnvironment's twiddling of global state
  public static get consoles(): Record<SWLogBuiltinConsoles, SWLogConsole> {
    return {
      env: (() => {
        const console: Console = (global !== undefined)
          ? global.console
          : window.console;
        return console as SWLogConsole;
      })(),

      null: this.nullConsole,
      default: this.nullConsole, // quiet by default, change if desired
    }
  }

  // NB built-in `Console` interface is freely castable to `SWLogConsole`
  public static resetConsole(console?: SWLogConsole): void {
    SWLog._singletonConsole = console;
  }

  public static get singletonConsole(): SWLogConsole {
    if (SWLog._singletonConsole === undefined)
      SWLog.resetConsole(SWLog.consoles.default);
    return SWLog._singletonConsole!; // runtime-ensured; safe
  }

  public static get enabled(): boolean {
    const singletonConsole = SWLog.singletonConsole
    return !!singletonConsole && singletonConsole !== SWLog.consoles.null;
  }

  // below are relays to "a `SWLogConsole`" (iow "a `Partial<Console>`"):
  // removing class semantics would make them redundant

  static log(...args: any[]): void {
    SWLog.singletonConsole.log(...args);
  }

  static trace(...args: any[]): void {
    SWLog.singletonConsole.trace(...args);
  }

  static debug(...args: any[]): void {
    SWLog.singletonConsole.debug(...args);
  }

  static info(...args: any[]): void {
    SWLog.singletonConsole.info(...args);
  }

  static warn(...args: any[]): void {
    SWLog.singletonConsole.warn(...args);
  }

  static error(...args: any[]): void {
    SWLog.singletonConsole.error(...args);
  }
}
