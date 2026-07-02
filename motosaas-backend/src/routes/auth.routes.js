const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  validateForgotPassword,
  validateGoogleLogin,
  validateLogin,
  validateRegister
} = require("../validators/auth.validator");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login con email o usuario y password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Sesion iniciada
 */
router.post("/login", validateLogin, asyncHandler(authController.login));

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Registro publico de cliente o motociclista
 *     tags: [Auth]
 *     responses:
 *       201:
 *         description: Usuario registrado
 */
router.post("/register", validateRegister, asyncHandler(authController.register));

/**
 * @swagger
 * /api/v1/auth/google:
 *   post:
 *     summary: Login con Google OAuth ID token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleLoginRequest'
 *     responses:
 *       200:
 *         description: Sesion iniciada
 */
router.post("/google", validateGoogleLogin, asyncHandler(authController.googleLogin));

router.post("/forgot-password", validateForgotPassword, asyncHandler(authController.forgotPassword));

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contexto de sesion
 */
router.get("/me", authenticate, asyncHandler(authController.me));

module.exports = { authRoutes: router };
