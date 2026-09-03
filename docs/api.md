# Contact API

The workspace reads contacts through two Next.js Route Handlers. Both successful server responses and successful client inputs are parsed with the shared strict Zod schemas in [`contact-api.schema.ts`](../src/features/contacts/application/contact-api.schema.ts). No OpenAPI generator or parallel contract is introduced.

## Start the API

```bash
pnpm dev
```

The examples below assume `http://localhost:3000`.

## List contacts

```http
GET /api/contacts
GET /api/contacts?q=<text>&source=<source>
```

### Query parameters

| Parameter | Required | Contract                                                          | Behavior                                                                                                                       |
| --------- | -------: | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `q`       |       No | String, trimmed, maximum 80 characters                            | Case-insensitive auxiliary match over normalized contact identity fields. This is not full heterogeneous qualification search. |
| `source`  |       No | `voice`, `whatsapp`, `web`, `meta`, `crm`, `manual`, or `unknown` | Restricts the normalized origin.                                                                                               |

Unknown parameters, duplicate parameters, invalid sources, or overlong queries return `400`. Empty `q` is accepted after trimming and omitted from response metadata.

### Successful response

Status: `200 OK`

```json
{
  "data": [
    {
      "id": "demo-contact-01",
      "displayName": "Aina Ficticia Compradora",
      "initials": "AF",
      "source": "voice",
      "phone": "+34 100 00 00 01",
      "email": "aina.compradora@example.invalid",
      "latestInteraction": {
        "id": "demo-interaction-01-b",
        "channel": "whatsapp",
        "direction": "inbound",
        "occurredAt": "2026-07-09T08:00:00.000Z",
        "content": "Confirma que puede visitar una propiedad de demostración.",
        "summary": null,
        "transcript": null,
        "durationSeconds": null
      }
    }
  ],
  "meta": {
    "count": 1,
    "query": "Aina",
    "source": "voice"
  }
}
```

`meta.query` and `meta.source` appear only when their filters are active. `meta.count` is the returned item count.

### curl examples

```bash
curl --fail-with-body \
  "http://localhost:3000/api/contacts"

curl --fail-with-body \
  "http://localhost:3000/api/contacts?q=Aina&source=voice"
```

## Get contact detail

```http
GET /api/contacts/{id}
```

`id` must contain 1–80 ASCII letters, digits, `_`, or `-`.

### Successful response

Status: `200 OK`

The detail envelope has this top-level contract:

```json
{
  "data": {
    "id": "demo-contact-07",
    "identity": {
      "displayName": "Dora Caso Cumplimiento",
      "fullName": "Dora Caso Cumplimiento",
      "initials": "DC",
      "phone": {
        "display": "+34 100 000 007",
        "href": "tel:+34100000007"
      },
      "email": {
        "value": "dora.cumplimiento@example.invalid",
        "actionable": true,
        "href": "mailto:dora.cumplimiento@example.invalid"
      }
    },
    "source": "crm",
    "createdAt": "2026-07-13T13:00:00.000Z",
    "qualification": {
      "sale": [],
      "rental": [],
      "shared": []
    },
    "timeline": [],
    "policy": {
      "status": "restricted",
      "actions": {
        "call": {
          "status": "blocked",
          "available": false,
          "reason": "El tag estructurado no-llamar bloquea las llamadas."
        },
        "email": {
          "status": "available",
          "available": true,
          "reason": "Hay un email técnicamente válido; su disponibilidad no acredita consentimiento."
        },
        "whatsapp": {
          "status": "unknown",
          "available": false,
          "reason": "No hay una señal estructurada suficiente; no se infiere permiso desde texto libre."
        }
      }
    },
    "duplicates": [],
    "handoff": {
      "status": "requested",
      "reason": "Solicita que una persona revise el caso sintético.",
      "requestedAt": "2026-07-14T08:30:00.000Z"
    },
    "beforeCall": {
      "operation": "Por confirmar",
      "keyNeeds": [
        {
          "label": "Preferred contact channel",
          "value": "email"
        }
      ],
      "latestInteraction": "Mensaje sintético de seguimiento por correo.",
      "blockers": [
        "Llamadas bloqueadas por señal estructurada no-llamar.",
        "Traspaso humano solicitado."
      ]
    }
  },
  "meta": {
    "found": true
  }
}
```

The example above shows the complete property shape but uses shortened empty arrays for readability; live `qualification.shared` and `timeline` contain this fixture's records. Obtain the complete runtime-validated payload with:

```bash
curl --fail-with-body \
  "http://localhost:3000/api/contacts/demo-contact-07" | jq
```

Nested contract highlights:

- qualification groups are always `sale`, `rental`, and `shared` arrays;
- renderable fact values may be strings, finite numbers, booleans, nulls, arrays, or nested records;
- evidence includes `source`, nullable ISO timestamp, and explicit `isCurrent`;
- timeline duration is finite, nonnegative, and nullable, so `0` remains valid;
- duplicate evidence names only same-tenant candidates and matching signals;
- `meta.found` is exactly `true` on success.

### curl examples

```bash
curl --fail-with-body \
  "http://localhost:3000/api/contacts/demo-contact-01"

curl --fail-with-body \
  "http://localhost:3000/api/contacts/demo-contact-99"
```

The second command intentionally exits non-zero because the endpoint returns `404`.

## Error envelope and status codes

All handled failures use:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Contacto no encontrado."
  }
}
```

| Status | Code              | When                                                                         |
| -----: | ----------------- | ---------------------------------------------------------------------------- |
|  `400` | `INVALID_REQUEST` | Invalid/duplicate/unknown list query parameters or invalid detail ID syntax. |
|  `404` | `NOT_FOUND`       | The detail ID is unknown **or belongs to another tenant**.                   |
|  `500` | `INTERNAL_ERROR`  | Repository mapping or success-contract validation fails unexpectedly.        |

Responses include `Cache-Control: no-store, max-age=0` to avoid caching contact payloads.

## Tenant and non-disclosure behavior

The repository filters the synthetic fixture to the current demo organization before listing, detail lookup, or duplicate detection. A hidden cross-tenant ID and a nonexistent ID return the same status, code, message, and response shape. The API never confirms whether a contact exists in another tenant, and duplicate suggestions never cross that boundary.

This challenge fixture is local and immutable; production authentication and tenant derivation are explicitly outside the implementation scope.

## Runtime schema validation

The two success schemas are application-owned and strict:

- Route Handlers parse mapped data before serializing a `200` response.
- The client parses JSON before committing list or detail state.
- Unknown properties, malformed timestamps, invalid enums, negative/non-finite durations, and incomplete nested structures reject the success payload.
- Client rejection uses the existing retryable error state; an HTTP `404` remains a distinct not-found state.
- Error envelopes are explicit Route Handler responses; they are not represented as successful DTOs.

## Contract and behavior checks

```bash
pnpm test -- tests/integration/contacts/contact.api.test.ts
pnpm test -- tests/unit/contacts/contact-ui.test.tsx
pnpm typecheck
```

The integration suite validates list/detail success envelopes with the shared schemas, malformed payload rejection, query validation, cache headers, and tenant-safe not found. The component suite validates client-side parsing and recovery behavior.
