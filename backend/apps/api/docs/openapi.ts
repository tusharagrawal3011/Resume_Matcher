import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Resume Matcher API",
      version: "1.0.0",
      description:
        "API for resume ingestion and JD-to-resume matching using embeddings, vector search, and LLM scoring."
    },
    servers: [
      {
        url: "http://127.0.0.1:3000",
        description: "Local development server"
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key"
        }
      },
      schemas: {
        ResumeMetadata: {
          type: "object",
          properties: {
            yearsOfExperience: { type: "number", minimum: 0 },
            skills: {
              type: "array",
              items: { type: "string" }
            },
            location: { type: "string" },
            roleType: { type: "string" }
          }
        },
        IngestionResumeItem: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
            content: { type: "string" },
            pdfBase64: {
              type: "string",
              description: "Base64-encoded PDF content"
            },
            metadata: { $ref: "#/components/schemas/ResumeMetadata" }
          },
          oneOf: [{ required: ["content"] }, { required: ["pdfBase64"] }]
        },
        IngestResumesRequest: {
          type: "object",
          required: ["resumes"],
          properties: {
            resumes: {
              type: "array",
              minItems: 1,
              items: { $ref: "#/components/schemas/IngestionResumeItem" }
            }
          }
        },
        JobDescription: {
          type: "object",
          required: ["id", "content"],
          properties: {
            id: { type: "string" },
            content: { type: "string" }
          }
        },
        ResumeInput: {
          type: "object",
          required: ["id", "content"],
          properties: {
            id: { type: "string" },
            content: { type: "string" },
            metadata: { $ref: "#/components/schemas/ResumeMetadata" }
          }
        },
        MatchResumesRequest: {
          type: "object",
          required: ["job"],
          properties: {
            job: { $ref: "#/components/schemas/JobDescription" },
            resumeIds: {
              type: "array",
              description: "Optional list of resume IDs to scope vector search",
              items: { type: "string" }
            },
            resumes: {
              type: "array",
              items: { $ref: "#/components/schemas/ResumeInput" }
            },
            topK: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 3
            }
          }
        },
        CandidateMatch: {
          type: "object",
          required: ["resumeId", "score", "decision", "explanation"],
          properties: {
            resumeId: { type: "string" },
            score: { type: "number", minimum: 0, maximum: 1 },
            decision: {
              type: "string",
              enum: ["STRONG_MATCH", "POSSIBLE_MATCH", "REJECTED"]
            },
            explanation: { type: "string" }
          }
        },
        MatchResumesResponse: {
          type: "object",
          required: ["matches", "nonMatches"],
          properties: {
            matches: {
              type: "array",
              items: { $ref: "#/components/schemas/CandidateMatch" }
            },
            nonMatches: {
              type: "array",
              items: { $ref: "#/components/schemas/NonMatchFeedback" }
            }
          }
        },
        NonMatchFeedback: {
          type: "object",
          required: ["resumeId", "score", "reason", "improvementSuggestions"],
          properties: {
            resumeId: { type: "string" },
            score: { type: "number", minimum: 0, maximum: 1 },
            reason: { type: "string" },
            improvementSuggestions: {
              type: "array",
              items: { type: "string" }
            }
          }
        },
        IngestionStatusResponse: {
          type: "object",
          required: [
            "jobId",
            "state",
            "failedReason",
            "processedOn",
            "finishedOn",
            "durationMs"
          ],
          properties: {
            jobId: { oneOf: [{ type: "string" }, { type: "number" }] },
            state: { type: "string" },
            failedReason: { type: "string", nullable: true },
            processedOn: { type: "number", nullable: true },
            finishedOn: { type: "number", nullable: true },
            durationMs: { type: "number", nullable: true }
          }
        },
        ValidationError: {
          type: "object",
          required: ["error", "details"],
          properties: {
            error: { type: "string", example: "Invalid payload" },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path: { type: "string" },
                  message: { type: "string" }
                }
              }
            }
          }
        },
        GenericError: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string" }
          }
        }
      }
    },
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          tags: ["System"],
          responses: {
            "200": {
              description: "Server is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/ingest-resumes": {
        post: {
          summary: "Queue resume ingestion job",
          tags: ["Ingestion"],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IngestResumesRequest" }
              }
            }
          },
          responses: {
            "202": {
              description: "Ingestion job queued",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "queued" },
                      queue: { type: "string", example: "resume-ingestion" },
                      jobId: { oneOf: [{ type: "string" }, { type: "number" }] }
                    }
                  }
                }
              }
            },
            "400": {
              description: "Payload validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ValidationError" }
                }
              }
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericError" }
                }
              }
            },
            "429": {
              description: "Rate limited",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericError" }
                }
              }
            },
            "500": {
              description: "Server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericError" }
                }
              }
            }
          }
        }
      },
      "/ingest-resumes/{jobId}/status": {
        get: {
          summary: "Get ingestion job status",
          tags: ["Ingestion"],
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "jobId",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "Current ingestion status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/IngestionStatusResponse" }
                }
              }
            },
            "404": {
              description: "Job not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericError" }
                }
              }
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericError" }
                }
              }
            }
          }
        }
      },
      "/match": {
        post: {
          summary: "Match resumes against a job description",
          tags: ["Matching"],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MatchResumesRequest" }
              }
            }
          },
          responses: {
            "200": {
              description: "Matching results",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/MatchResumesResponse" }
                }
              }
            },
            "400": {
              description: "Payload validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ValidationError" }
                }
              }
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericError" }
                }
              }
            },
            "429": {
              description: "Rate limited",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericError" }
                }
              }
            },
            "500": {
              description: "Server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericError" }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: []
};

export const openApiSpec = swaggerJsdoc(options);
