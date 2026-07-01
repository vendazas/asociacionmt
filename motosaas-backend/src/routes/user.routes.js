const express = require("express");
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { requireFields } = require("../validators/common.validator");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/api/v1/users/me", authenticate, asyncHandler(userController.getProfile));
router.get(
  "/api/v1/users",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(userController.listUsers)
);
router.post(
  "/api/v1/users",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  requireFields("email", "password", "fullName", "role"),
  asyncHandler(userController.createUser)
);

module.exports = { userRoutes: router };
