# OSU 361 Pace Calculator

A lightweight REST API microservice that calculates whether a user is on track to finish 100% of their weekly items. It fetches the number of days remaining in the week from the week-parser microservice and compares the user's original planned pace against the pace they need to maintain to finish on time.

## Prerequisites

- [Node.js](https://nodejs.org/)
- npm

## Installation

```bash
git clone https://github.com/richardjhong/osu-361-pace-calculator
cd osu-361-pace-calculator
npm install
```

## Configuration

The service uses the following environment variables:

| Variable          | Default                                    | Description                       |
| ----------------- | ------------------------------------------ | --------------------------------- |
| `PORT`            | `3001`                                     | Port the service listens on       |
| `WEEK_PARSER_URL` | `https://osu-361-week-parser.onrender.com` | URL of the week-parser dependency |

You can set them inline when starting the server:

## Running the Service

```bash
# Production / standard start
npm start

# Development (uses nodemon for auto-restart on file changes)
npm run prod
```

The server will start and log:

```
Pace calculator microservice running on port 3001
```

## API

### `GET /pace?remaining=X&total=Y`

Calculates the pace needed to finish the remaining items before the week ends.

#### Query Parameters

| Parameter   | Type   | Description                                    |
| ----------- | ------ | ---------------------------------------------- |
| `remaining` | number | Items still left to complete. Must be >= 0.    |
| `total`     | number | Total items planned for the week. Must be > 0. |

**Constraints:** `remaining` must be less than or equal to `total`.

#### Example Request

```bash
curl "http://localhost:3001/pace?remaining=9&total=21"
```

#### Example Response (HTTP 200)

```json
{
  "remaining": 9,
  "total": 21,
  "daysRemainingInWeek": 3,
  "originalPace": 3,
  "paceToMaintain": 3,
  "status": "on track",
  "compensation": {
    "message": "You are exactly on track. Continue completing 3 items/day for the remaining 3 day(s).",
    "requiredPace": 3,
    "extraPerDay": 0
  }
}
```

#### Response Fields

| Field                 | Type             | Description                                                                                                               |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `remaining`           | number           | Items left to complete (echoed from input)                                                                                |
| `total`               | number           | Total weekly items (echoed from input)                                                                                    |
| `daysRemainingInWeek` | number           | Days left in the current week (from week-parser)                                                                          |
| `originalPace`        | number           | Planned daily pace (`total / 7`, rounded up)                                                                              |
| `paceToMaintain`      | number or string | Required daily pace to finish on time (`remaining / daysRemainingInWeek`, rounded up). `"N/A"` on the last day if behind. |
| `status`              | string           | `ahead`, `on track`, `behind`, or `complete`                                                                              |
| `compensation`        | object or null   | Guidance message and adjustment numbers. `null` when status is `complete`.                                                |

#### Possible Statuses

- **`ahead`** — `paceToMaintain` is less than `originalPace`.
- **`on track`** — `paceToMaintain` equals `originalPace`.
- **`behind`** — `paceToMaintain` is greater than `originalPace`.
- **`complete`** — No items remaining and it is the last day of the week.

#### Error Responses

- **400 Bad Request** — Invalid query parameters (e.g., missing, non-numeric, negative, or `remaining > total`).
- **500 Internal Server Error** — The week-parser service is unreachable or returned an unexpected response.

## Example Scenarios

**Ahead of schedule**

```bash
curl "http://localhost:3000/pace?remaining=2&total=21"
```

```json
{
  "status": "ahead",
  "paceToMaintain": 1,
  "originalPace": 3,
  "compensation": {
    "message": "You are ahead of schedule! ...",
    "requiredPace": 1,
    "slackPerDay": 2
  }
}
```

**Behind schedule**

```bash
curl "http://localhost:3000/pace?remaining=15&total=21"
```

```json
{
  "status": "behind",
  "paceToMaintain": 5,
  "originalPace": 3,
  "compensation": {
    "message": "You are behind schedule. ...",
    "requiredPace": 5,
    "extraPerDay": 2
  }
}
```

**Last day of the week**

```bash
curl "http://localhost:3000/pace?remaining=4&total=21"
```

```json
{
  "status": "behind",
  "paceToMaintain": "N/A",
  "compensation": {
    "message": "The week ends today and you still have 4 item(s) remaining...",
    "requiredPace": 4,
    "extraPerDay": "N/A"
  }
}
```

## Dependencies

- [express](https://expressjs.com/) — Web framework
- [axios](https://axios-http.com/) — HTTP client for week-parser requests
- [nodemon](https://nodemon.io/) — Development auto-reloader
