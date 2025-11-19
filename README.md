<p align="center">
  <img src="https://reklog.com/favicon.png" alt="RekLog" width="80" height="80">
</p>

<h1 align="center">RekLog</h1>

<p align="center">
  Request logging and performance monitoring for Node.js & Browser applications
</p>

<p align="center">

```bash
yarn add reklog
```

</p>

---

## Getting API Key

1. Sign up at [reklog.com](https://reklog.com)
2. Create a new project
3. Copy your API key (starts with `rkl_`)

---

## Usage

### Initialize

```javascript
const reklog = require('reklog');

const logger = reklog.init('rkl_your_api_key', {
  environment: 'production',
  host: 'https://api.example.com',
  debug: false
});
```

### Manual Logging with start() and end()

Track external API calls or custom operations:

```javascript
async function fetchUsers() {
  const logId = logger.start('/api/users', 'GET');

  try {
    const response = await fetch('https://api.example.com/users');
    const data = await response.json();

    await logger.end(logId, {
      statusCode: response.status,
      params: { page: 1, limit: 10 },
      response: data
    });

    return data;
  } catch (error) {
    await logger.end(logId, {
      statusCode: 500,
      metadata: { error: error.message }
    });
    throw error;
  }
}
```

### Express Middleware

Automatically log all requests:

```javascript
const express = require('express');
const reklog = require('reklog');

const app = express();
app.use(express.json());

const logger = reklog.init('rkl_your_api_key');
app.use(logger.middleware());

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);
```

---

## API Reference

### init(apiKey, options)

Initialize RekLog instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | Your RekLog API key |
| `apiUrl` | string | `https://api.reklog.com/api` | API endpoint URL |
| `environment` | string | `development` | Environment name |
| `host` | string | `null` | Host identifier for requests |
| `debug` | boolean | `false` | Enable debug logging |
| `retryAttempts` | number | `3` | Retry attempts on failure |
| `retryDelay` | number | `1000` | Delay between retries (ms) |
| `maskFields` | array | `[]` | Fields to mask |

---

## Data Privacy & Field Masking

RekLog can mask sensitive data to protect user privacy and comply with data protection regulations. Sensitive field values are replaced with `********` before being sent to the server.

### Configuring Fields to Mask

Use the `maskFields` option to specify which fields should be masked:

```javascript
const logger = reklog.init('rkl_your_api_key', {
  maskFields: ['password', 'token', 'secret', 'api_key', 'credit_card', 'cvv', 'ssn']
});
```

### How It Works

Field masking is:
- **Case-insensitive**: `Password`, `PASSWORD`, and `password` are all masked
- **Recursive**: Works on nested objects at any depth
- **Applied to**: `body`, `params`, `requestHeaders`, and `response`

### Example

**Original Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "profile": {
    "name": "John Doe",
    "pin": "1234"
  }
}
```

**Logged Data (with maskFields: ['password', 'pin']):**
```json
{
  "email": "user@example.com",
  "password": "********",
  "profile": {
    "name": "John Doe",
    "pin": "********"
  }
}
```

> **Note:** The masking happens on the client side before data is sent to RekLog servers, ensuring sensitive data never leaves your application.

### start(endpoint, method)

Start tracking a request.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `endpoint` | string | required | Endpoint path |
| `method` | string | `GET` | HTTP method |

**Returns:** `logId` (string)

### end(logId, options)

End tracking and send log to server.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logId` | string | required | Log ID from `start()` |
| `statusCode` | number | `200` | HTTP status code |
| `body` | object | `null` | Request body (POST/PUT/PATCH) |
| `params` | object | `null` | Query parameters (GET) |
| `requestHeaders` | object | `null` | Request headers |
| `response` | object | `null` | Response data |
| `metadata` | object | `{}` | Additional custom data |

### middleware()

Returns Express middleware for automatic logging.

```javascript
app.use(logger.middleware());
```

**Automatically captures:**
- Endpoint and method
- Response time
- Status code
- Request body, query params, headers
- Response body
- Route parameters

---

## License

MIT
