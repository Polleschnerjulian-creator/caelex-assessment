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
      url: `${process.env.NEXT_PUBLIC_APP_URL || "https://caelex.eu"}/api/v1`,
      description: "Local development",
    },
  ],
  tags: [
    {
      name: "Compliance",
      description: "Compliance status and scoring endpoints",
    },
    {
      name: "Assessment",
      description:
        "Run compliance assessments against EU Space Act, NIS2, and national space law engines",
    },
    {
      name: "Public",
      description:
        "Unauthenticated endpoints for embeddable widgets and quick checks (rate limited: 5/hour)",
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

    // ─── Assessment Endpoints ───

    "/compliance/assess": {
      post: {
        tags: ["Assessment"],
        summary: "EU Space Act compliance assessment",
        description:
          "Run a full EU Space Act compliance assessment. Returns operator classification, applicable articles (redacted), module statuses, and checklist.",
        operationId: "assessEUSpaceAct",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EUSpaceActAssessInput" },
            },
          },
        },
        responses: {
          "200": { description: "Assessment result" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/compliance/nis2/classify": {
      post: {
        tags: ["Assessment"],
        summary: "NIS2 entity classification",
        description:
          "Classify a space sector entity under NIS2 Directive (essential, important, or out of scope).",
        operationId: "classifyNIS2",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NIS2ClassifyInput" },
            },
          },
        },
        responses: {
          "200": { description: "Classification result" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/compliance/nis2/assess": {
      post: {
        tags: ["Assessment"],
        summary: "Full NIS2 compliance assessment",
        description:
          "Run a full NIS2 compliance assessment including applicable requirements (redacted), incident timeline, and penalties.",
        operationId: "assessNIS2",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NIS2AssessInput" },
            },
          },
        },
        responses: {
          "200": { description: "NIS2 assessment result" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/compliance/space-law/assess": {
      post: {
        tags: ["Assessment"],
        summary: "Multi-jurisdiction space law assessment",
        description:
          "Assess compliance across up to 10 European national space law jurisdictions. Returns comparison matrix, favorability scores, and recommendations.",
        operationId: "assessSpaceLaw",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SpaceLawAssessInput" },
            },
          },
        },
        responses: {
          "200": { description: "Space law assessment result" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/compliance/modules": {
      get: {
        tags: ["Compliance"],
        summary: "List compliance modules",
        description:
          "Returns all EU Space Act compliance modules with article ranges and overall progress.",
        operationId: "getComplianceModules",
        security: [{ apiKey: [] }],
        responses: {
          "200": { description: "Module list with progress" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/compliance/articles": {
      get: {
        tags: ["Compliance"],
        summary: "List EU Space Act articles",
        description:
          "Paginated, filterable list of EU Space Act articles (redacted). Filter by operator type or compliance type.",
        operationId: "listArticles",
        security: [{ apiKey: [] }],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/limit" },
          {
            name: "operatorType",
            in: "query",
            description:
              "Filter by operator abbreviation (SCO, LO, LSO, ISOS, CAP, PDP, TCO, ALL)",
            schema: { type: "string" },
          },
          {
            name: "complianceType",
            in: "query",
            description: "Filter by compliance type",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Paginated article list" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    // ─── Public Endpoints ───

    "/../public/compliance/quick-check": {
      post: {
        tags: ["Public"],
        summary: "Quick compliance check (unauthenticated)",
        description:
          "3-field quick EU Space Act compliance check. Rate limited to 5 requests/hour per IP. No API key required.",
        operationId: "quickCheck",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["activityType", "entitySize", "establishment"],
                properties: {
                  activityType: {
                    type: "string",
                    enum: [
                      "spacecraft",
                      "launch_vehicle",
                      "launch_site",
                      "isos",
                      "data_provider",
                    ],
                  },
                  entitySize: {
                    type: "string",
                    enum: ["small", "research", "medium", "large"],
                  },
                  establishment: {
                    type: "string",
                    enum: [
                      "eu",
                      "third_country_eu_services",
                      "third_country_no_eu",
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Quick check result" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/../public/compliance/nis2/quick-classify": {
      post: {
        tags: ["Public"],
        summary: "Quick NIS2 classification (unauthenticated)",
        description:
          "2-field NIS2 entity classification for space sector. Rate limited to 5 requests/hour per IP. No API key required.",
        operationId: "nis2QuickClassify",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["entitySize"],
                properties: {
                  entitySize: {
                    type: "string",
                    enum: ["micro", "small", "medium", "large"],
                  },
                  sector: { type: "string", default: "space" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "NIS2 classification result" },
          "429": { $ref: "#/components/responses/RateLimited" },
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
      EUSpaceActAssessInput: {
        type: "object",
        required: ["activityType", "establishment", "entitySize"],
        properties: {
          activityType: {
            type: "string",
            enum: [
              "spacecraft",
              "launch_vehicle",
              "launch_site",
              "isos",
              "data_provider",
            ],
          },
          establishment: {
            type: "string",
            enum: ["eu", "third_country_eu_services", "third_country_no_eu"],
          },
          entitySize: {
            type: "string",
            enum: ["small", "research", "medium", "large"],
          },
          isDefenseOnly: { type: "boolean", nullable: true },
          hasPostLaunchAssets: { type: "boolean", nullable: true },
          operatesConstellation: { type: "boolean", nullable: true },
          constellationSize: { type: "integer", nullable: true },
          primaryOrbit: {
            type: "string",
            enum: ["LEO", "MEO", "GEO", "beyond"],
            nullable: true,
          },
          offersEUServices: { type: "boolean", nullable: true },
        },
      },
      NIS2ClassifyInput: {
        type: "object",
        required: ["entitySize"],
        properties: {
          entitySize: {
            type: "string",
            enum: ["micro", "small", "medium", "large"],
          },
          sector: { type: "string", default: "space" },
          spaceSubSector: { type: "string", nullable: true },
          isEUEstablished: { type: "boolean", default: true },
          operatesGroundInfra: { type: "boolean", nullable: true },
          operatesSatComms: { type: "boolean", nullable: true },
          providesLaunchServices: { type: "boolean", nullable: true },
        },
      },
      NIS2AssessInput: {
        type: "object",
        required: ["entitySize"],
        description:
          "Extends NIS2ClassifyInput with additional fields for full assessment",
        properties: {
          entitySize: {
            type: "string",
            enum: ["micro", "small", "medium", "large"],
          },
          sector: { type: "string", default: "space" },
          spaceSubSector: { type: "string", nullable: true },
          isEUEstablished: { type: "boolean", default: true },
          operatesGroundInfra: { type: "boolean", nullable: true },
          operatesSatComms: { type: "boolean", nullable: true },
          providesLaunchServices: { type: "boolean", nullable: true },
          manufacturesSpacecraft: { type: "boolean", nullable: true },
          providesEOData: { type: "boolean", nullable: true },
          employeeCount: { type: "integer", nullable: true },
          annualRevenue: { type: "number", nullable: true },
          memberStateCount: { type: "integer", nullable: true },
          hasISO27001: { type: "boolean", nullable: true },
          hasExistingCSIRT: { type: "boolean", nullable: true },
          hasRiskManagement: { type: "boolean", nullable: true },
        },
      },
      SpaceLawAssessInput: {
        type: "object",
        required: ["selectedJurisdictions"],
        properties: {
          selectedJurisdictions: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "FR",
                "UK",
                "BE",
                "NL",
                "LU",
                "AT",
                "DK",
                "DE",
                "IT",
                "NO",
              ],
            },
            minItems: 1,
            maxItems: 10,
          },
          activityType: { type: "string", nullable: true },
          entityNationality: { type: "string", nullable: true },
          entitySize: { type: "string", nullable: true },
          primaryOrbit: { type: "string", nullable: true },
          constellationSize: { type: "integer", nullable: true },
          licensingStatus: { type: "string", nullable: true },
        },
      },
    },
  },
};
