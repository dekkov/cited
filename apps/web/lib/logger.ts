// Minimal structured logger stub. Phase 2 doesn't ship pino into apps/web; we keep a tiny
// console-based shim with the same surface so route handlers and server actions can write
// structured warnings/errors. Swap for pino in a later phase if/when log volume warrants.

type LogContext = Record<string, unknown>;

function emit(
  level: 'info' | 'warn' | 'error',
  payloadOrMsg: LogContext | string,
  maybeMsg?: string,
): void {
  if (process.env.NODE_ENV === 'test') return;
  const payload = typeof payloadOrMsg === 'object' ? payloadOrMsg : {};
  const msg = typeof payloadOrMsg === 'string' ? payloadOrMsg : (maybeMsg ?? '');
  const line = JSON.stringify({ level, msg, ...payload, ts: new Date().toISOString() });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (payload: LogContext | string, msg?: string) => emit('info', payload, msg),
  warn: (payload: LogContext | string, msg?: string) => emit('warn', payload, msg),
  error: (payload: LogContext | string, msg?: string) => emit('error', payload, msg),
};
