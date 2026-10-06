# Exercise: Odometer Reading Service

## Overview

**Estimated time:** 3–4 hours

Please don't spend more than that. We respect your time and will evaluate accordingly.

At Just Insure, we offer pay-per-mile car insurance. One of the ways we verify a customer's mileage is by asking them to submit a photo of their odometer. To process these at scale, we need a service that can automatically extract the mileage reading from an image.

This is a real problem we've solved at Just. Your task is to build a small service that does the same thing.

---

## The Task

Build a Node.js HTTP service in TypeScript with a single endpoint:

```
POST /odometer/reading
```

The endpoint should:

- Accept an image (JPEG or PNG) of a car odometer
- Return the mileage reading extracted from the image
- Handle cases where the reading cannot be determined

### Success Response

```json
{
  "reading": 48253,
  "unit": "miles",
  "confidence": "high"
}
```

### Unreadable Image Response

```json
{
  "error": "UNREADABLE_IMAGE",
  "message": "Could not extract a mileage reading from the provided image"
}
```

---

## Requirements

### Functional Requirements

- Accept image uploads via:
    - `multipart/form-data`, or
    - Base64-encoded image in a JSON payload
- Extract the numeric odometer reading from the image
- Return a structured JSON response
- Handle error cases gracefully:
    - Missing image
    - Unsupported file type
    - Unreadable image
    - Other invalid inputs

### Non-Functional Requirements

- Written in TypeScript with strict mode enabled
- Include tests
- Include a README with setup instructions

### OCR Approach

Use any OCR solution you think is appropriate.

If your chosen approach requires credentials:

- Include clear setup instructions
- Provide a mock/stub mode so we can evaluate the service without creating an account

---

## Setup and running the service

You need Node.js 20.3 or newer and npm. Clone the repository, install dependencies, and start the service:

```bash
git clone https://github.com/just-insure/backend-exercise-odometer.git
cd backend-exercise-odometer
npm install
npm run dev
```

The development server listens on port `3000` by default. Set `PORT` to use a different port.

Without `ANTHROPIC_API_KEY`, the service uses `MockReader` and returns fixture-backed answers for the four supplied sample images. Unknown images fail explicitly rather than receiving a guessed reading.

To use Claude, set `ANTHROPIC_API_KEY` before starting the service. The default model is `claude-sonnet-5-5`; set `ANTHROPIC_MODEL` to use another model available to your Anthropic account. The selected reader is logged at startup. The API key and image data are never logged.

### Send a sample image

The endpoint accepts a base64-encoded JPEG or PNG in a JSON request. In PowerShell, start the server in one terminal, then send one of the supplied fixtures from the repository root in another:

```powershell
$image = [Convert]::ToBase64String([IO.File]::ReadAllBytes("images/3ae9d173-8895-409e-844c-77b5841138d7.jpeg"))
$body = @{ image = $image; mediaType = "image/jpeg" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/odometer/reading" -Method Post -ContentType "application/json" -Body $body
```

The response contains `reading`, `unit`, and `confidence`. In mock mode the response reading is resolved from the fixture image's SHA-256 hash.

### Run checks

Run tests and the TypeScript check with:

```bash
npm test
npm run typecheck
npm run test:integration
```
### Claude conversation

Link: https://claude.ai/share/1302b6d9-055b-4dab-8187-486b0c6ac764

## Test Images

A set of odometer images is included in the `/images` folder of the base repository.

---

## What to Submit

Provide a folder or repository link containing:

- Service source code
- Tests
- README with setup instructions
- A copy of your chat with Claude (or a similar AI assistant)

Using AI such as Claude for this task is completely fine, and we ask that you include a copy of your chat/conversation with the AI assistant as part of your submission.

To be clear about why: we want to see how you think about a problem, and how you work with an agent. We're interested in how you use AI to help *yourself* think through a problem.

---

## How We'll Evaluate Your Submission

We are not looking for a production-ready system.

We are evaluating:

- How you think through problems
- How you structure code
- How you communicate technical decisions

---

## Questions?

If anything is unclear, please contact:

[**vitalij@just.insure**](mailto:vitalij@just.insure)

We'd rather you ask than make assumptions.
