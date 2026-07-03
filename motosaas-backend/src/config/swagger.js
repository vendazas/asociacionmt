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
          required: ["associationSlug", "password"],
          properties: {
            associationSlug: { type: "string", example: "platform" },
            email: { type: "string", example: "admin@motosaas.local" },
            username: { type: "string", example: "driver01" },
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
        ForgotPasswordRequest: {
          type: "object",
          required: ["associationSlug", "email"],
          properties: {
            associationSlug: { type: "string", example: "platform" },
            email: { type: "string", example: "cliente@motosaas.local" }
          }
        },
        AssociationRequest: {
          type: "object",
          required: ["name", "slug", "city"],
          properties: {
            name: { type: "string", example: "Asociacion Centro" },
            slug: { type: "string", example: "asociacion-centro" },
            representativeName: { type: "string", example: "Juan Perez" },
            phone: { type: "string", example: "+59170000000" },
            email: { type: "string", example: "centro@motosaas.local" },
            city: { type: "string", example: "Santa Cruz de la Sierra" },
            address: { type: "string", example: "Av. Principal 123" },
            country: { type: "string", example: "BO" },
            timezone: { type: "string", example: "America/La_Paz" },
            status: { type: "string", enum: ["ACTIVE", "LIMITED", "SUSPENDED"], example: "ACTIVE" },
            driverLimit: { type: "integer", example: 50 },
            vehicleLimit: { type: "integer", example: 50 },
            observation: { type: "string", example: "Alta inicial" }
          }
        },
        AssociationStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["ACTIVE", "LIMITED", "SUSPENDED"], example: "LIMITED" }
          }
        },
        DriverRequest: {
          type: "object",
          required: ["firstName", "lastName", "phone", "documentNumber", "email", "username", "password"],
          properties: {
            firstName: { type: "string", example: "Carlos" },
            lastName: { type: "string", example: "Rojas" },
            phone: { type: "string", example: "+59170000001" },
            documentNumber: { type: "string", example: "9876543" },
            email: { type: "string", example: "carlos.rojas@motosaas.local" },
            username: { type: "string", example: "carlos.rojas" },
            password: { type: "string", example: "Temporal123!" },
            status: { type: "string", enum: ["PENDING", "ACTIVE", "INACTIVE", "BLOCKED"], example: "PENDING" },
            vehicleId: { type: "string", nullable: true }
          }
        },
        DriverStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["PENDING", "ACTIVE", "INACTIVE", "BLOCKED"], example: "ACTIVE" }
          }
        },
        DriverVehicleRequest: {
          type: "object",
          properties: {
            vehicleId: { type: "string", nullable: true }
          }
        },
        VehicleRequest: {
          type: "object",
          required: ["plate"],
          properties: {
            plate: { type: "string", example: "4567ABC" },
            brand: { type: "string", example: "Honda" },
            model: { type: "string", example: "XR 150" },
            color: { type: "string", example: "Rojo" },
            year: { type: "integer", example: 2024 },
            internalNumber: { type: "string", example: "M-001" },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"], example: "ACTIVE" },
            driverUserId: { type: "string", nullable: true }
          }
        },
        VehicleStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"], example: "MAINTENANCE" }
          }
        },
        VehicleAssignRequest: {
          type: "object",
          properties: {
            driverUserId: { type: "string", nullable: true }
          }
        },
        FareConfigRequest: {
          type: "object",
          required: [
            "baseFare",
            "minimumFare",
            "perKilometerFare",
            "nightSurcharge",
            "waitingPerMinuteFare",
            "associationCommissionPercent",
            "platformCommissionPercent",
            "maxDriverSearchRadiusKm"
          ],
          properties: {
            name: { type: "string", example: "Tarifa principal" },
            baseFare: { type: "number", example: 5 },
            minimumFare: { type: "number", example: 8 },
            perKilometerFare: { type: "number", example: 2.5 },
            nightSurcharge: { type: "number", example: 3 },
            waitingPerMinuteFare: { type: "number", example: 0.5 },
            associationCommissionPercent: { type: "number", example: 8 },
            platformCommissionPercent: { type: "number", example: 5 },
            maxDriverSearchRadiusKm: { type: "number", example: 5 },
            nightStartHour: { type: "integer", example: 22 },
            nightEndHour: { type: "integer", example: 6 },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "ACTIVE" }
          }
        },
        FareStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "ACTIVE" }
          }
        },
        FareEstimateRequest: {
          type: "object",
          required: ["originLatitude", "originLongitude", "destinationLatitude", "destinationLongitude"],
          properties: {
            originLatitude: { type: "number", example: -17.7833 },
            originLongitude: { type: "number", example: -63.1821 },
            destinationLatitude: { type: "number", example: -17.775 },
            destinationLongitude: { type: "number", example: -63.195 },
            waitingMinutes: { type: "number", example: 0 },
            coverageZoneId: { type: "string", nullable: true }
          }
        },
        ZoneRequest: {
          type: "object",
          required: ["name", "city", "centerLatitude", "centerLongitude", "radiusKm"],
          properties: {
            name: { type: "string", example: "Centro" },
            city: { type: "string", example: "Santa Cruz de la Sierra" },
            description: { type: "string", example: "Zona central" },
            centerLatitude: { type: "number", example: -17.7833 },
            centerLongitude: { type: "number", example: -63.1821 },
            radiusKm: { type: "number", example: 4 },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "ACTIVE" }
          }
        },
        ZoneStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "INACTIVE" }
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
            destinationLongitude: { type: "number", example: -63.195 },
            coverageZoneId: { type: "string", nullable: true }
          }
        },
        TripFinishRequest: {
          type: "object",
          properties: {
            finalDistanceKm: { type: "number", example: 3.4 },
            waitingMinutes: { type: "number", example: 2 }
          }
        },
        TripStatus: {
          type: "string",
          enum: [
            "REQUESTED",
            "SEARCHING_DRIVER",
            "DRIVER_ASSIGNED",
            "DRIVER_ARRIVING",
            "TRIP_STARTED",
            "TRIP_FINISHED",
            "TRIP_CANCELLED",
            "REJECTED",
            "EXPIRED"
          ],
          example: "SEARCHING_DRIVER"
        },
        TripListResponse: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object" } },
            meta: { type: "object" }
          }
        },
        ReportDashboardResponse: {
          type: "object",
          properties: {
            scope: { type: "string", enum: ["SUPER_ADMIN", "ASSOCIATION_ADMIN"] },
            filters: { type: "object" },
            summary: { type: "object" },
            tripsByStatus: { type: "object" },
            tripsByCity: { type: "array", items: { type: "object" } },
            tripsByAssociation: { type: "array", items: { type: "object" } },
            topDrivers: { type: "array", items: { type: "object" } }
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
      "/api/v1/auth/forgot-password": {
        post: {
          summary: "Solicitar recuperacion de password",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ForgotPasswordRequest" }
              }
            }
          },
          responses: { 200: { description: "Solicitud recibida" } }
        }
      },
      "/api/v1/associations": {
        get: {
          summary: "Listar asociaciones",
          tags: ["Associations"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "search", schema: { type: "string" } },
            { in: "query", name: "status", schema: { type: "string", enum: ["ACTIVE", "LIMITED", "SUSPENDED"] } },
            { in: "query", name: "limit", schema: { type: "integer" } },
            { in: "query", name: "offset", schema: { type: "integer" } }
          ],
          responses: { 200: { description: "Lista paginada de asociaciones" } }
        },
        post: {
          summary: "Crear asociacion",
          tags: ["Associations"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssociationRequest" }
              }
            }
          },
          responses: { 201: { description: "Asociacion creada" } }
        }
      },
      "/api/v1/associations/{associationId}": {
        get: {
          summary: "Ver detalle de asociacion",
          tags: ["Associations"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "associationId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Detalle de asociacion" } }
        },
        put: {
          summary: "Editar asociacion",
          tags: ["Associations"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "associationId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssociationRequest" }
              }
            }
          },
          responses: { 200: { description: "Asociacion actualizada" } }
        }
      },
      "/api/v1/associations/{associationId}/status": {
        patch: {
          summary: "Cambiar estado de asociacion",
          tags: ["Associations"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "associationId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssociationStatusRequest" }
              }
            }
          },
          responses: { 200: { description: "Estado actualizado" } }
        }
      },
      "/api/v1/drivers": {
        get: {
          summary: "Listar mototaxistas de la asociacion",
          tags: ["Drivers"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "search", schema: { type: "string" } },
            { in: "query", name: "status", schema: { type: "string", enum: ["PENDING", "ACTIVE", "INACTIVE", "BLOCKED"] } },
            { in: "query", name: "limit", schema: { type: "integer" } }
          ],
          responses: { 200: { description: "Lista de mototaxistas" } }
        },
        post: {
          summary: "Crear mototaxista",
          tags: ["Drivers"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DriverRequest" }
              }
            }
          },
          responses: { 201: { description: "Mototaxista creado" } }
        }
      },
      "/api/v1/drivers/{driverId}": {
        get: {
          summary: "Ver mototaxista",
          tags: ["Drivers"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "driverId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Detalle de mototaxista" } }
        },
        put: {
          summary: "Editar mototaxista",
          tags: ["Drivers"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "driverId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DriverRequest" }
              }
            }
          },
          responses: { 200: { description: "Mototaxista actualizado" } }
        }
      },
      "/api/v1/drivers/{driverId}/status": {
        patch: {
          summary: "Cambiar estado de mototaxista",
          tags: ["Drivers"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "driverId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DriverStatusRequest" }
              }
            }
          },
          responses: { 200: { description: "Estado actualizado" } }
        }
      },
      "/api/v1/drivers/{driverId}/vehicle": {
        patch: {
          summary: "Asignar o quitar moto a mototaxista",
          tags: ["Drivers"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "driverId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DriverVehicleRequest" }
              }
            }
          },
          responses: { 200: { description: "Moto asignada" } }
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
      "/api/v1/vehicles": {
        get: {
          summary: "Listar vehiculos de la asociacion",
          tags: ["Vehicles"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "search", schema: { type: "string" } },
            { in: "query", name: "status", schema: { type: "string", enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"] } },
            { in: "query", name: "driverUserId", schema: { type: "string" } },
            { in: "query", name: "limit", schema: { type: "integer" } }
          ],
          responses: { 200: { description: "Lista de vehiculos" } }
        },
        post: {
          summary: "Crear vehiculo",
          tags: ["Vehicles"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VehicleRequest" }
              }
            }
          },
          responses: { 201: { description: "Vehiculo creado" } }
        }
      },
      "/api/v1/vehicles/me": {
        get: {
          summary: "Listar vehiculos del mototaxista autenticado",
          tags: ["Vehicles"],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Vehiculos propios" } }
        },
        put: {
          summary: "Crear o actualizar vehiculo propio",
          tags: ["Vehicles"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VehicleRequest" }
              }
            }
          },
          responses: { 200: { description: "Vehiculo propio guardado" } }
        }
      },
      "/api/v1/vehicles/{vehicleId}": {
        get: {
          summary: "Ver vehiculo",
          tags: ["Vehicles"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "vehicleId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Detalle de vehiculo" } }
        },
        put: {
          summary: "Editar vehiculo",
          tags: ["Vehicles"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "vehicleId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VehicleRequest" }
              }
            }
          },
          responses: { 200: { description: "Vehiculo actualizado" } }
        }
      },
      "/api/v1/vehicles/{vehicleId}/status": {
        patch: {
          summary: "Cambiar estado de vehiculo",
          tags: ["Vehicles"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "vehicleId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VehicleStatusRequest" }
              }
            }
          },
          responses: { 200: { description: "Estado actualizado" } }
        }
      },
      "/api/v1/vehicles/{vehicleId}/assign": {
        patch: {
          summary: "Asignar vehiculo a mototaxista",
          tags: ["Vehicles"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "vehicleId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VehicleAssignRequest" }
              }
            }
          },
          responses: { 200: { description: "Asignacion actualizada" } }
        }
      },
      "/api/v1/fares/current": {
        get: {
          summary: "Obtener tarifa activa de la asociacion",
          tags: ["Fares"],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Tarifa activa" }, 404: { description: "Sin tarifa activa" } }
        },
        put: {
          summary: "Crear o actualizar la tarifa activa",
          tags: ["Fares"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FareConfigRequest" }
              }
            }
          },
          responses: { 200: { description: "Tarifa activa guardada" } }
        }
      },
      "/api/v1/fares": {
        get: {
          summary: "Listar configuraciones de tarifa",
          tags: ["Fares"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "search", schema: { type: "string" } },
            { in: "query", name: "status", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
            { in: "query", name: "limit", schema: { type: "integer" } }
          ],
          responses: { 200: { description: "Lista de tarifas" } }
        },
        post: {
          summary: "Crear configuracion de tarifa",
          tags: ["Fares"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FareConfigRequest" }
              }
            }
          },
          responses: { 201: { description: "Tarifa creada" } }
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
      "/api/v1/fares/{fareId}": {
        get: {
          summary: "Ver configuracion de tarifa",
          tags: ["Fares"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "fareId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Detalle de tarifa" } }
        },
        put: {
          summary: "Editar configuracion de tarifa",
          tags: ["Fares"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "fareId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FareConfigRequest" }
              }
            }
          },
          responses: { 200: { description: "Tarifa actualizada" } }
        },
        delete: {
          summary: "Eliminar configuracion de tarifa",
          tags: ["Fares"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "fareId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Tarifa eliminada" } }
        }
      },
      "/api/v1/fares/{fareId}/status": {
        patch: {
          summary: "Cambiar estado de tarifa",
          tags: ["Fares"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "fareId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FareStatusRequest" }
              }
            }
          },
          responses: { 200: { description: "Estado actualizado" } }
        }
      },
      "/api/v1/zones": {
        get: {
          summary: "Listar zonas de cobertura",
          tags: ["Zones"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "search", schema: { type: "string" } },
            { in: "query", name: "status", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
            { in: "query", name: "limit", schema: { type: "integer" } }
          ],
          responses: { 200: { description: "Lista de zonas" } }
        },
        post: {
          summary: "Crear zona de cobertura",
          tags: ["Zones"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ZoneRequest" }
              }
            }
          },
          responses: { 201: { description: "Zona creada" } }
        }
      },
      "/api/v1/zones/{zoneId}": {
        get: {
          summary: "Ver zona de cobertura",
          tags: ["Zones"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "zoneId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Detalle de zona" } }
        },
        put: {
          summary: "Editar zona de cobertura",
          tags: ["Zones"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "zoneId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ZoneRequest" }
              }
            }
          },
          responses: { 200: { description: "Zona actualizada" } }
        },
        delete: {
          summary: "Eliminar zona de cobertura",
          tags: ["Zones"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "zoneId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Zona eliminada" } }
        }
      },
      "/api/v1/zones/{zoneId}/status": {
        patch: {
          summary: "Cambiar estado de zona",
          tags: ["Zones"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "zoneId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ZoneStatusRequest" }
              }
            }
          },
          responses: { 200: { description: "Estado actualizado" } }
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
      "/api/v1/trips/estimate": {
        post: {
          summary: "Calcular tarifa estimada antes de solicitar viaje",
          tags: ["Trips"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FareEstimateRequest" }
              }
            }
          },
          responses: { 200: { description: "Tarifa estimada del viaje" } }
        }
      },
      "/api/v1/trips/current": {
        get: {
          summary: "Consultar viaje activo del pasajero o mototaxista",
          tags: ["Trips"],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Viaje activo o null" } }
        }
      },
      "/api/v1/trips/{tripId}/accept": {
        post: {
          summary: "Aceptar viaje como mototaxista",
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
      "/api/v1/trips/{tripId}/arrived": {
        post: {
          summary: "Marcar llegada al pasajero",
          tags: ["Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Llegada registrada" } }
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
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TripFinishRequest" }
              }
            }
          },
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
      },
      "/api/v1/driver/trips/pending": {
        get: {
          summary: "Listar solicitudes pendientes para polling del mototaxista",
          tags: ["Driver Trips"],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Solicitudes disponibles para aceptar" } }
        }
      },
      "/api/v1/driver/trips/history": {
        get: {
          summary: "Historial de viajes del mototaxista",
          tags: ["Driver Trips"],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Historial paginado del mototaxista" } }
        }
      },
      "/api/v1/driver/trips/{tripId}/accept": {
        post: {
          summary: "Aceptar una solicitud pendiente",
          tags: ["Driver Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Viaje asignado al mototaxista" } }
        }
      },
      "/api/v1/driver/trips/{tripId}/reject": {
        post: {
          summary: "Rechazar una solicitud pendiente",
          tags: ["Driver Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Rechazo registrado" } }
        }
      },
      "/api/v1/driver/trips/{tripId}/arrived": {
        post: {
          summary: "Marcar que el mototaxista llego al pasajero",
          tags: ["Driver Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Llegada registrada" } }
        }
      },
      "/api/v1/driver/trips/{tripId}/start": {
        post: {
          summary: "Iniciar viaje asignado",
          tags: ["Driver Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Viaje iniciado" } }
        }
      },
      "/api/v1/driver/trips/{tripId}/finish": {
        post: {
          summary: "Finalizar viaje asignado",
          tags: ["Driver Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TripFinishRequest" }
              }
            }
          },
          responses: { 200: { description: "Viaje finalizado con tarifa final" } }
        }
      },
      "/api/v1/reports/dashboard": {
        get: {
          summary: "Dashboard de reportes para SUPER_ADMIN o ASSOCIATION_ADMIN",
          tags: ["Reports"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "associationId", schema: { type: "string" } },
            { in: "query", name: "driverId", schema: { type: "string" } },
            { in: "query", name: "startDate", schema: { type: "string", format: "date" } },
            { in: "query", name: "endDate", schema: { type: "string", format: "date" } },
            { in: "query", name: "status", schema: { $ref: "#/components/schemas/TripStatus" } }
          ],
          responses: {
            200: {
              description: "Metricas, tablas y series simples de reportes",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ReportDashboardResponse" }
                }
              }
            }
          }
        }
      },
      "/api/v1/admin/trips": {
        get: {
          summary: "Listar viajes para panel administrativo",
          tags: ["Admin Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "associationId", schema: { type: "string" } },
            { in: "query", name: "status", schema: { $ref: "#/components/schemas/TripStatus" } },
            { in: "query", name: "search", schema: { type: "string" } },
            { in: "query", name: "limit", schema: { type: "integer" } },
            { in: "query", name: "offset", schema: { type: "integer" } }
          ],
          responses: {
            200: {
              description: "Lista paginada de viajes",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TripListResponse" }
                }
              }
            }
          }
        }
      },
      "/api/v1/admin/trips/{tripId}": {
        get: {
          summary: "Ver detalle de viaje para panel administrativo",
          tags: ["Admin Trips"],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "tripId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Detalle de viaje con historial de estados" } }
        }
      }
    }
  },
  apis: ["./src/routes/*.js"]
});

module.exports = { swaggerSpec };
