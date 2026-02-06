// OpenAPI 3.0 Specification for Caelex Public API

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Caelex Public API",
    description: `
# Caelex API

The Caelex API provides programmatic access to your space compliance data. Use it to integrate Caelex with your existing systems, automate workflows, and build custom dashboards.

## Authentication

All API requests require an API key. Include your key in the \`Authorization\` header:

\`\`\`
Authorization: Bearer caelex_your_api_key_here
\`\`\`

API keys can be generated in the [Settings > API Keys](/settings/api-keys) section of your dashboard.

## Rate Limits

- **Standard plan**: 1,000 requests per hour
- **Professional plan**: 10,000 requests per hour
- **Enterprise plan**: Custom limits

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Maximum requests per hour
- \`X-RateLimit-Remaining\`: Remaining requests
- \`X-RateLimit-Reset\`: Unix timestamp when the limit resets

## Pagination

List endpoints support pagination using \`page\` and \`limit\` query parameters:
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 20, max: 100)

Paginated responses include:
\`\`\`json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
\`\`\`

## Errors

The API uses standard HTTP status codes. Error responses include:
\`\`\`json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
\`\`\`
`,
    version: "1.0.0",
    contact: {
      name: "Caelex Support",
      email: "support@caelex.eu",
      url: "https://caelex.eu/support",
    },
    license: {
      name: "Proprietary",
      url: "https://caelex.eu/terms",
    },
  },
  servers: [
    {
      url: "https://app.caelex.eu/api/v1",
      description: "Production",
    },
    {
      url: "http://localhost:3000/api/v1",
      description: "Local development",
    },
  ],
  tags: [
    {
      name: "Compliance",
      description: "Compliance status and scoring endpoints",
    },
    {
      name: "Spacecraft",
      description: "Spacecraft and space asset management",
    },
    {
      name: "Reports",
      description: "Report generation and retrieval",
    },
    {
      name: "Incidents",
      description: "Incident reporting and management",
    },
    {
      name: "Deadlines",
      description: "Compliance deadlines and reminders",
    },
    {
      name: "Documents",
      description: "Document management",
    },
  ],
  paths: {
    "/compliance/overview": {
      get: {
        tags: ["Compliance"],
        summary: "Get compliance overview",
        description:
          "Returns an overview of your organization's compliance status across all modules.",
        operationId: "getComplianceOverview",
        security: [{ apiKey: [] }],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    overallScore: {
                      type: "number",
                      example: 78,
                      description: "Overall compliance score (0-100)",
                    },
                    status: {
                      type: "string",
                      enum: ["compliant", "at_risk", "non_compliant"],
                      example: "at_risk",
                    },
                    modules: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/ModuleStatus",
                      },
                    },
                    lastUpdated: {
                      type: "string",
                      format: "date-time",
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/compliance/score": {
      get: {
        tags: ["Compliance"],
        summary: "Get compliance score breakdown",
        description:
          "Returns detailed compliance scoring with breakdown by module and article.",
        operationId: "getComplianceScore",
        security: [{ apiKey: [] }],
        parameters: [
          {
            name: "spacecraftId",
            in: "query",
            description: "Filter by specific spacecraft",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ComplianceScore",
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/spacecraft": {
      get: {
        tags: ["Spacecraft"],
        summary: "List spacecraft",
        description:
          "Returns a paginated list of spacecraft/space assets registered to your organization.",
        operationId: "listSpacecraft",
        security: [{ apiKey: [] }],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/limit" },
          {
            name: "status",
            in: "query",
            description: "Filter by status",
            schema: {
              type: "string",
              enum: [
                "pre_launch",
                "launched",
                "operational",
                "decommissioning",
                "deorbited",
              ],
            },
          },
          {
            name: "orbitType",
            in: "query",
            description: "Filter by orbit type",
            schema: {
              type: "string",
              enum: ["LEO", "MEO", "GEO", "HEO", "SSO", "OTHER"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Spacecraft" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Spacecraft"],
        summary: "Create spacecraft",
        description: "Register a new spacecraft/space asset.",
        operationId: "createSpacecraft",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SpacecraftInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Spacecraft created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Spacecraft" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/spacecraft/{id}": {
      get: {
        tags: ["Spacecraft"],
        summary: "Get spacecraft details",
        operationId: "getSpacecraft",
        security: [{ apiKey: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Spacecraft" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Spacecraft"],
        summary: "Update spacecraft",
        operationId: "updateSpacecraft",
        security: [{ apiKey: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SpacecraftInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Spacecraft updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Spacecraft" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Spacecraft"],
        summary: "Delete spacecraft",
        operationId: "deleteSpacecraft",
        security: [{ apiKey: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": { description: "Spacecraft deleted" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/reports": {
      get: {
        tags: ["Reports"],
        summary: "List reports",
        operationId: "listReports",
        security: [{ apiKey: [] }],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/limit" },
          {
            name: "type",
            in: "query",
            schema: {
              type: "string",
              enum: ["compliance", "incident", "annual", "audit"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Report" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Reports"],
        summary: "Generate report",
        operationId: "generateReport",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type"],
                properties: {
                  type: {
                    type: "string",
                    enum: ["compliance", "incident", "annual", "audit"],
                  },
                  spacecraftId: { type: "string" },
                  dateRange: {
                    type: "object",
                    properties: {
                      from: { type: "string", format: "date" },
                      to: { type: "string", format: "date" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Report generated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Report" },
              },
            },
          },
        },
      },
    },
    "/reports/{id}": {
      get: {
        tags: ["Reports"],
        summary: "Get report",
        operationId: "getReport",
        security: [{ apiKey: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Report" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/deadlines": {
      get: {
        tags: ["Deadlines"],
        summary: "List deadlines",
        operationId: "listDeadlines",
        security: [{ apiKey: [] }],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/limit" },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["upcoming", "overdue", "completed"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Deadline" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/incidents": {
      get: {
        tags: ["Incidents"],
        summary: "List incidents",
        operationId: "listIncidents",
        security: [{ apiKey: [] }],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/limit" },
          {
            name: "severity",
            in: "query",
            schema: {
              type: "string",
              enum: ["critical", "major", "minor", "informational"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Incident" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Incidents"],
        summary: "Report incident",
        operationId: "createIncident",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/IncidentInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Incident created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Incident" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      apiKey: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key",
        description:
          "API key authentication. Get your key from Settings > API Keys.",
      },
    },
    parameters: {
      page: {
        name: "page",
        in: "query",
        description: "Page number",
        schema: { type: "integer", default: 1, minimum: 1 },
      },
      limit: {
        name: "limit",
        in: "query",
        description: "Items per page",
        schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
      },
    },
    responses: {
      Unauthorized: {
        description: "Invalid or missing API key",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              error: {
                code: "UNAUTHORIZED",
                message: "Invalid API key",
              },
            },
          },
        },
      },
      Forbidden: {
        description: "Insufficient permissions",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      BadRequest: {
        description: "Invalid request body",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      RateLimited: {
        description: "Rate limit exceeded",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              error: {
                code: "RATE_LIMITED",
                message: "Rate limit exceeded. Try again in 60 seconds.",
              },
            },
          },
        },
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "object" },
            },
          },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      ModuleStatus: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          score: { type: "number" },
          status: {
            type: "string",
            enum: ["compliant", "at_risk", "non_compliant", "not_started"],
          },
          completedItems: { type: "integer" },
          totalItems: { type: "integer" },
        },
      },
      ComplianceScore: {
        type: "object",
        properties: {
          overall: { type: "number" },
          breakdown: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: {
                score: { type: "number" },
                weight: { type: "number" },
                status: { type: "string" },
              },
            },
          },
          lastCalculated: { type: "string", format: "date-time" },
        },
      },
      Spacecraft: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          cosparId: { type: "string", nullable: true },
          noradId: { type: "string", nullable: true },
          missionType: { type: "string" },
          orbitType: { type: "string" },
          status: { type: "string" },
          launchDate: { type: "string", format: "date", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      SpacecraftInput: {
        type: "object",
        required: ["name", "missionType", "orbitType"],
        properties: {
          name: { type: "string" },
          cosparId: { type: "string" },
          noradId: { type: "string" },
          missionType: {
            type: "string",
            enum: [
              "communication",
              "earth_observation",
              "navigation",
              "scientific",
              "technology_demo",
              "other",
            ],
          },
          orbitType: {
            type: "string",
            enum: ["LEO", "MEO", "GEO", "HEO", "SSO", "OTHER"],
          },
          launchDate: { type: "string", format: "date" },
          altitudeKm: { type: "number" },
          inclinationDeg: { type: "number" },
        },
      },
      Report: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          title: { type: "string" },
          status: { type: "string" },
          downloadUrl: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Deadline: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          dueDate: { type: "string", format: "date-time" },
          status: { type: "string" },
          priority: { type: "string" },
          relatedEntity: {
            type: "object",
            properties: {
              type: { type: "string" },
              id: { type: "string" },
              name: { type: "string" },
            },
          },
        },
      },
      Incident: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          severity: { type: "string" },
          status: { type: "string" },
          reportedAt: { type: "string", format: "date-time" },
          spacecraftId: { type: "string", nullable: true },
        },
      },
      IncidentInput: {
        type: "object",
        required: ["title", "severity"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          severity: {
            type: "string",
            enum: ["critical", "major", "minor", "informational"],
          },
          spacecraftId: { type: "string" },
          occurredAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
};
