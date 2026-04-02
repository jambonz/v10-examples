# rest-api/create-call

Create an outbound call using the jambonz REST API.

This is a runnable script (not a server) that uses `JambonzClient` from `@jambonz/sdk/client` to place an outbound call. The call is handled by the application specified by `APPLICATION_SID`.

## Setup

```bash
npm install
```

## Environment Variables

| Variable                     | Description |
|------------------------------|-------------|
| `JAMBONZ_REST_API_BASE_URL`  | Base URL of the jambonz REST API (e.g. `https://api.jambonz.cloud`) |
| `JAMBONZ_ACCOUNT_SID`        | Your jambonz account SID |
| `JAMBONZ_API_KEY`            | Your jambonz API key |
| `FROM`                       | Caller ID in E.164 format (e.g. `+15085551212`) |
| `TO`                         | Destination number in E.164 format (e.g. `+15085551213`) |
| `APPLICATION_SID`            | Application SID that handles the call once answered |

## Running

```bash
JAMBONZ_REST_API_BASE_URL=https://api.jambonz.cloud \
JAMBONZ_ACCOUNT_SID=your-account-sid \
JAMBONZ_API_KEY=your-api-key \
FROM=+15085551212 \
TO=+15085551213 \
APPLICATION_SID=your-app-sid \
npm start
```

## Equivalent curl

```bash
curl -X POST https://api.jambonz.cloud/v1/Accounts/{account_sid}/Calls \
  -H "Authorization: Bearer {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+15085551212",
    "to": {
      "type": "phone",
      "number": "+15085551213"
    },
    "application_sid": "your-app-sid"
  }'
```
