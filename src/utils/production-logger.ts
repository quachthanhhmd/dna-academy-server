import { ConsoleLogger } from '@nestjs/common';

/**
 * Nest contexts that only narrate startup: one line per module, controller and
 * route. Several hundred lines on every boot — each deploy and every autoheal
 * restart — that bury the lines anyone actually reads. "Nest application
 * successfully started" (NestApplication) is kept as the restart marker.
 */
const STARTUP_NOISE_CONTEXTS = new Set([
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
]);

/**
 * Production logger: drops startup narration at `log` level and prints without
 * ANSI colours, so the archived files read cleanly in zless/zgrep. Warnings
 * and errors from those contexts still go through.
 */
export class ProductionLogger extends ConsoleLogger {
  constructor() {
    super({ colors: false });
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    const context = optionalParams[optionalParams.length - 1] ?? this.context;
    if (typeof context === 'string' && STARTUP_NOISE_CONTEXTS.has(context)) {
      return;
    }
    super.log(message, ...optionalParams);
  }
}
