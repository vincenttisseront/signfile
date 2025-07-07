# Server Logging System

The SignFile application includes a flexible logging system for server-side code. You can control the verbosity of logs by setting the `LOG_LEVEL` environment variable.

## Log Levels

- `none` - Disable all logs
- `error` - Only show errors
- `warn` - Show warnings and errors
- `info` - Show informational messages, warnings, and errors (default)
- `debug` - Show all messages, including debug information

## How to Set Log Level

### In Development

Add or modify the `LOG_LEVEL` in your `.env` file:

```bash
LOG_LEVEL=debug
```

### In Production

Set the `LOG_LEVEL` environment variable to `error` or `none`:

```bash
LOG_LEVEL=error
```

### In Docker

When running with Docker, set the environment variable in your docker-compose.yml or when running the container:

```yaml
environment:
  - LOG_LEVEL=error
```

## How to Use the Logger

In your server-side code, import and use the logger:

```typescript
import logger from '../utils/logger'

// Log different types of messages
logger.debug('context', 'Debug message with details', someVariable)
logger.info('context', 'Information about normal operation')
logger.warn('context', 'Warning about potential issue')
logger.error('context', 'Error occurred', errorObject)

// Legacy style (for compatibility with existing code)
logger.log('context', 'Log message')
```

Replace `'context'` with a string that identifies the current file or module, such as `'certs.ts'` or `'auth-handler'`.
