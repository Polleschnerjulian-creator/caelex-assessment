"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { openApiSpec } from "@/lib/openapi";
import {
  Book,
  Code2,
  Copy,
  Check,
  Terminal,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

// Dynamic import Swagger UI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-white/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  ),
});

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState<"reference" | "examples">(
    "reference",
  );

  return (
    <div className="dark-section min-h-screen bg-[#0A0B10] text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Book className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                API Documentation
              </h1>
              <p className="text-white/60 text-sm">
                Caelex REST API v{openApiSpec.info.version}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("reference")}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "reference"
                  ? "text-emerald-400"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              API Reference
              {activeTab === "reference" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("examples")}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "examples"
                  ? "text-emerald-400"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              Code Examples
              {activeTab === "examples" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "reference" ? (
          <div className="swagger-ui-wrapper">
            <style jsx global>{`
              .swagger-ui-wrapper .swagger-ui {
                font-family: inherit;
              }
              .swagger-ui-wrapper .swagger-ui .info {
                margin: 0;
              }
              .swagger-ui-wrapper .swagger-ui .info .title {
                color: white;
              }
              .swagger-ui-wrapper .swagger-ui .info .description {
                color: rgba(255, 255, 255, 0.7);
              }
              .swagger-ui-wrapper .swagger-ui .info .description p {
                color: rgba(255, 255, 255, 0.7);
              }
              .swagger-ui-wrapper .swagger-ui .info .description code {
                background: rgba(255, 255, 255, 0.1);
                padding: 2px 6px;
                border-radius: 4px;
              }
              .swagger-ui-wrapper .swagger-ui .scheme-container {
                background: transparent;
                padding: 0;
              }
              .swagger-ui-wrapper .swagger-ui .opblock-tag {
                color: white;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              }
              .swagger-ui-wrapper .swagger-ui .opblock {
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                margin-bottom: 8px;
              }
              .swagger-ui-wrapper .swagger-ui .opblock .opblock-summary {
                border-bottom: none;
              }
              .swagger-ui-wrapper .swagger-ui .opblock .opblock-summary-method {
                border-radius: 4px;
              }
              .swagger-ui-wrapper .swagger-ui .opblock .opblock-summary-path {
                color: rgba(255, 255, 255, 0.9);
              }
              .swagger-ui-wrapper
                .swagger-ui
                .opblock
                .opblock-summary-description {
                color: rgba(255, 255, 255, 0.6);
              }
              .swagger-ui-wrapper .swagger-ui .opblock-body {
                background: rgba(0, 0, 0, 0.2);
              }
              .swagger-ui-wrapper .swagger-ui .opblock-section-header {
                background: transparent;
              }
              .swagger-ui-wrapper .swagger-ui .opblock-section-header h4 {
                color: rgba(255, 255, 255, 0.8);
              }
              .swagger-ui-wrapper .swagger-ui table thead tr th {
                color: rgba(255, 255, 255, 0.7);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              }
              .swagger-ui-wrapper .swagger-ui table tbody tr td {
                color: rgba(255, 255, 255, 0.8);
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
              }
              .swagger-ui-wrapper .swagger-ui .parameter__name {
                color: white;
              }
              .swagger-ui-wrapper .swagger-ui .parameter__type {
                color: rgba(255, 255, 255, 0.5);
              }
              .swagger-ui-wrapper .swagger-ui .response-col_status {
                color: rgba(255, 255, 255, 0.8);
              }
              .swagger-ui-wrapper .swagger-ui .response-col_description {
                color: rgba(255, 255, 255, 0.6);
              }
              .swagger-ui-wrapper .swagger-ui .model-box {
                background: rgba(255, 255, 255, 0.02);
              }
              .swagger-ui-wrapper .swagger-ui .model {
                color: rgba(255, 255, 255, 0.8);
              }
              .swagger-ui-wrapper .swagger-ui .model-title {
                color: rgba(255, 255, 255, 0.9);
              }
              .swagger-ui-wrapper .swagger-ui section.models {
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
              }
              .swagger-ui-wrapper .swagger-ui section.models h4 {
                color: white;
              }
              .swagger-ui-wrapper .swagger-ui .btn {
                color: white;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
              }
              .swagger-ui-wrapper .swagger-ui .btn:hover {
                background: rgba(255, 255, 255, 0.15);
              }
              .swagger-ui-wrapper .swagger-ui input[type="text"] {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
              }
              .swagger-ui-wrapper .swagger-ui .execute-wrapper {
                padding: 10px 0;
              }
              .swagger-ui-wrapper .swagger-ui .btn.execute {
                background: #10b981;
                border-color: #10b981;
              }
              .swagger-ui-wrapper .swagger-ui .btn.execute:hover {
                background: #059669;
              }
              .swagger-ui-wrapper .swagger-ui .highlight-code {
                background: rgba(0, 0, 0, 0.4);
              }
              .swagger-ui-wrapper .swagger-ui .highlight-code pre {
                color: rgba(255, 255, 255, 0.9);
              }
            `}</style>
            <SwaggerUI
              spec={openApiSpec}
              deepLinking={true}
              displayOperationId={true}
              docExpansion="list"
              defaultModelsExpandDepth={1}
              tryItOutEnabled={false}
            />
          </div>
        ) : (
          <CodeExamples />
        )}
      </div>
    </div>
  );
}

// Code Examples Section
function CodeExamples() {
  return (
    <div className="space-y-8">
      {/* Quick Start */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Start</h2>
        <p className="text-white/60 mb-4">
          Get started with the Caelex API in minutes. Here are examples in
          popular languages.
        </p>

        <div className="space-y-6">
          <CodeBlock
            title="Authentication"
            language="bash"
            code={`# All requests require an API key in the Authorization header
curl -X GET "https://app.caelex.eu/api/v1/compliance/overview" \\
  -H "Authorization: Bearer caelex_your_api_key_here" \\
  -H "Content-Type: application/json"`}
          />

          <CodeBlock
            title="Get Compliance Overview"
            language="javascript"
            code={`// Using fetch
const response = await fetch('https://app.caelex.eu/api/v1/compliance/overview', {
  headers: {
    'Authorization': 'Bearer caelex_your_api_key_here',
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
// Access compliance data: data.overallScore, data.status
const { overallScore, status } = data;`}
          />

          <CodeBlock
            title="List Spacecraft"
            language="python"
            code={`import requests

API_KEY = "caelex_your_api_key_here"
BASE_URL = "https://app.caelex.eu/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

# Get all spacecraft
response = requests.get(f"{BASE_URL}/spacecraft", headers=headers)
spacecraft = response.json()

for sc in spacecraft["data"]:
    print(f"{sc['name']} - {sc['status']}")`}
          />

          <CodeBlock
            title="Create Spacecraft"
            language="typescript"
            code={`interface SpacecraftInput {
  name: string;
  missionType: 'communication' | 'earth_observation' | 'navigation' | 'scientific';
  orbitType: 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'SSO';
  cosparId?: string;
  noradId?: string;
  launchDate?: string;
}

async function createSpacecraft(data: SpacecraftInput) {
  const response = await fetch('https://app.caelex.eu/api/v1/spacecraft', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}

// Usage
const spacecraft = await createSpacecraft({
  name: 'CAELEX-SAT-1',
  missionType: 'earth_observation',
  orbitType: 'LEO',
  launchDate: '2025-06-15',
});`}
          />

          <CodeBlock
            title="Report an Incident"
            language="go"
            code={`package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

type IncidentInput struct {
    Title       string \`json:"title"\`
    Description string \`json:"description"\`
    Severity    string \`json:"severity"\`
    SpacecraftID string \`json:"spacecraftId,omitempty"\`
}

func reportIncident(incident IncidentInput) error {
    apiKey := "caelex_your_api_key_here"

    body, _ := json.Marshal(incident)

    req, _ := http.NewRequest(
        "POST",
        "https://app.caelex.eu/api/v1/incidents",
        bytes.NewBuffer(body),
    )

    req.Header.Set("Authorization", "Bearer "+apiKey)
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    return nil
}`}
          />
        </div>
      </section>

      {/* Webhooks */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Webhooks</h2>
        <p className="text-white/60 mb-4">
          Receive real-time notifications when events occur in your Caelex
          account.
        </p>

        <CodeBlock
          title="Webhook Payload Example"
          language="json"
          code={`{
  "id": "evt_1234567890",
  "type": "compliance.score_changed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "previousScore": 75,
    "newScore": 82,
    "spacecraftId": "sc_abc123",
    "modules": {
      "debris": { "score": 90, "change": 5 },
      "cybersecurity": { "score": 75, "change": 2 }
    }
  }
}`}
        />

        <CodeBlock
          title="Verifying Webhook Signatures"
          language="javascript"
          code={`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In your webhook handler
app.post('/webhooks/caelex', (req, res) => {
  const signature = req.headers['x-caelex-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Process the webhook event
  const event = req.body;
  // Handle event based on event.type (e.g., 'compliance.updated')

  res.status(200).send('OK');
});`}
        />
      </section>

      {/* Error Handling */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">
          Error Handling
        </h2>

        <CodeBlock
          title="Error Response Format"
          language="json"
          code={`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "field": "missionType",
      "reason": "must be one of: communication, earth_observation, navigation, scientific"
    }
  }
}`}
        />

        <div className="mt-4 bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-white/70 font-medium">
                  Status Code
                </th>
                <th className="px-4 py-3 text-left text-white/70 font-medium">
                  Error Code
                </th>
                <th className="px-4 py-3 text-left text-white/70 font-medium">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="text-white/60">
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">
                  <code className="text-amber-400">400</code>
                </td>
                <td className="px-4 py-3">INVALID_REQUEST</td>
                <td className="px-4 py-3">
                  The request body is malformed or missing required fields
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">
                  <code className="text-red-400">401</code>
                </td>
                <td className="px-4 py-3">UNAUTHORIZED</td>
                <td className="px-4 py-3">Invalid or missing API key</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">
                  <code className="text-red-400">403</code>
                </td>
                <td className="px-4 py-3">FORBIDDEN</td>
                <td className="px-4 py-3">
                  API key doesn&apos;t have required permissions
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">
                  <code className="text-amber-400">404</code>
                </td>
                <td className="px-4 py-3">NOT_FOUND</td>
                <td className="px-4 py-3">
                  The requested resource doesn&apos;t exist
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <code className="text-red-400">429</code>
                </td>
                <td className="px-4 py-3">RATE_LIMITED</td>
                <td className="px-4 py-3">
                  Too many requests, try again later
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// Code Block Component
function CodeBlock({
  title,
  language,
  code,
}: {
  title: string;
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-white/80"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          {title}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 px-2 py-0.5 bg-white/5 rounded">
            {language}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="p-4 bg-black/20 overflow-x-auto">
          <pre className="text-sm text-white/80 font-mono whitespace-pre">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
