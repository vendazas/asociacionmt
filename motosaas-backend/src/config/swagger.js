const swaggerJsdoc = require("swagger-jsdoc");
const { env } = require("./env");

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "MotoSaaS Backend API",
      version: "0.1.0",
      description: "REST API base para SaaS multi asociacion."
    },
    servers: [
      {
        url: env.swaggerServerUrl,
        description: env.nodeEnv
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        LoginRequest: {
          type: "object",
          required: ["associationSlug", "email", "password"],
          properties: {
            associationSlug: { type: "string", example: "platform" },
            email: { type: "string", example: "admin@motosaas.local" },
            password: { type: "string", example: "ChangeMe123!" }
          }
        },
        GoogleLoginRequest: {
          type: "object",
          required: ["associationSlug", "idToken"],
          properties: {
            associationSlug: { type: "string", example: "platform" },
            idToken: { type: "string" }
          }
        },
        RegisterRequest: {
          type: "object",
          required: ["associationSlug", "email", "password", "fullName"],
          properties: {
            associationSlug: { type: "string", example: "platform" },
            email: { type: "string", example: "cliente@motosaas.local" },
            password: { type: "string", example: "ChangeMe123!" },
            fullName: { type: "string", example: "Cliente Demo" },
            phone: { type: "string", example: "+59170000000" },
            role: { type: "string", enum: ["CUSTOMER", "DRIVER"], example: "CUSTOMER" }
          }
        },
        FareEstimateRequest: {
          type: "object",
          required: ["originLatitude", "originLongitude", "destinationLatitude", "destinationLongitude"],
          properties: {
            originLatitude: { type: "number", example: -17.7833 },
            originLongitude: { type: "number", example: -63.1821 },
            destinationLatitude: { type: "number", example: -17.775 },
            destinationLongitude: { type: "number", example: -63.195 }
          }
        },
        TripRequest: {
          type: "object",
          required: ["originLatitude", "originLongitude", "destinationLatitude", "destinationLongitude"],
          properties: {
            originAddress: { type: "string", example: "Plaza principal" },
            originLatitude: { type: "number", example: -17.7833 },
            originLongitude: { type: "number", example: -63.1821 },
            destinationAddress: { type: "string", example: "Terminal bimodal" },
            destinationLatitude: { type: "number", example: -17.775 },
            destinationLongitude: { type: "number", example: -63.195 }
          }
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                message: { type: "string" },
                details: { nullable: true }
              }
            }
          }
        }
      }
    },
    paths: {
      "/api/v1/auth/register": {
        post: {
          summary: "Registro publico de cliente o motociclista",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" }
              }
            }
          },
          responses: { 201: { description: "Usuario registrado" } }
        }
      },
      "/api/v1/drivers/me/location": {
        patch: {
          summary: "Actualizar ubicacion del motociclista",
          tags: ["Drivers"],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Ubicacion actualizada" } }
        }
      },
      "/api/v1/drivers/available": {
        get: {
          summary: "Consultar motociclistas disponibles",
          tags: ["Drivers"],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Lista de motociclistas disponibles" } }
        }
      },
      "/api/v1/fares/estimate": {
        post: {
          summary: "Calcular tarifa estimada",
          tags: ["Fares"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FareEstimateRequest" }
              }
            }
          },
          responses: { 200: { description: "Tarifa estimada" } }
        }
      },
      "/api/v1/trips/request": {
        post: {
          summary: "Solicitar viaje",
          tags: ["Trips"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TripRequest" }
              }
            }
          },
          responses: { 201: { description: "Viaje solicitado" } }
        }
      },
      "/api/v1/trips/{tripId}/accept": {
        post: {
          summary: "Aceptar viaje",
          tags: ["Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Viaje aceptado" } }
        }
      },
      "/api/v1/trips/{tripId}/reject": {
        post: {
          summary: "Rechazar viaje",
          tags: ["Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Viaje rechazado" } }
        }
      },
      "/api/v1/trips/{tripId}/start": {
        post: {
          summary: "Iniciar viaje",
          tags: ["Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Viaje iniciado" } }
        }
      },
      "/api/v1/trips/{tripId}/finish": {
        post: {
          summary: "Finalizar viaje",
          tags: ["Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Viaje finalizado" } }
        }
      },
      "/api/v1/trips/{tripId}/cancel": {
        post: {
          summary: "Cancelar viaje",
          tags: ["Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Viaje cancelado" } }
        }
      },
      "/api/v1/trips/{tripId}/status": {
        get: {
          summary: "Consultar estado del viaje para polling",
          tags: ["Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Estado del viaje" } }
        }
      },
      "/api/v1/trips/history": {
        get: {
          summary: "Historial de viajes",
          tags: ["Trips"],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Historial paginado" } }
        }
      }
    }
  },
  apis: ["./src/routes/*.js"]
});

module.exports = { swaggerSpec };
