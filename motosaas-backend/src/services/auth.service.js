const { env } = require("../config/env");
const { prisma } = require("../config/db");
const { googleClient } = require("../config/google");
const { Roles } = require("../constants/roles");
const associationRepository = require("../repositories/association.repository");
const userRepository = require("../repositories/user.repository");
const { ApiError } = require("../utils/apiError");
const { comparePassword, hashPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { serializeAssociation, serializeUser } = require("../utils/serializers");

async function createSession(user, association) {
  await userRepository.updateLastLogin(user.id);

  return {
    accessToken: signAccessToken(user),
    tokenType: "Bearer",
    expiresIn: env.jwtExpiresIn,
    user: serializeUser(user),
    association: serializeAssociation(association)
  };
}

async function register(payload) {
  const associationSlug = String(payload.associationSlug || "").trim().toLowerCase();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const fullName = String(payload.fullName || payload.full_name || "").trim();
  const phone = payload.phone ? String(payload.phone).trim() : null;
  const role = payload.role || Roles.CUSTOMER;

  if (!associationSlug || !email || !password || !fullName) {
    throw new ApiError(400, "associationSlug, email, password and fullName are required.");
  }

  if (![Roles.CUSTOMER, Roles.DRIVER].includes(role)) {
    throw new ApiError(403, "Public registration is limited to CUSTOMER and DRIVER roles.");
  }

  const association = await associationRepository.findActiveBySlug(associationSlug);
  if (!association) {
    throw new ApiError(404, "Association not found.");
  }

  const existingUser = await userRepository.findActiveByEmail(association.association_id, email);
  if (existingUser) {
    throw new ApiError(409, "Email is already registered in this association.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        association_id: association.association_id,
        email,
        password_hash: passwordHash,
        full_name: fullName,
        phone,
        role,
        created_by: "self-register",
        updated_by: "self-register"
      }
    });

    if (role === Roles.DRIVER) {
      await tx.driverProfile.create({
        data: {
          association_id: association.association_id,
          user_id: createdUser.id,
          license_number: payload.licenseNumber || null,
          availability_status: "OFFLINE",
          created_by: createdUser.id,
          updated_by: createdUser.id
        }
      });
    }

    return createdUser;
  });

  return createSession(user, association);
}

async function loginWithPassword(payload) {
  const associationSlug = String(payload.associationSlug || "").trim().toLowerCase();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  if (!associationSlug || !email || !password) {
    throw new ApiError(400, "associationSlug, email and password are required.");
  }

  const association = await associationRepository.findActiveBySlug(associationSlug);
  if (!association) {
    throw new ApiError(401, "Invalid credentials.");
  }

  const user = await userRepository.findActiveByEmail(association.association_id, email);
  if (!user || !user.password_hash) {
    throw new ApiError(401, "Invalid credentials.");
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid credentials.");
  }

  return createSession(user, association);
}

async function loginWithGoogle(payload) {
  const associationSlug = String(payload.associationSlug || "").trim().toLowerCase();
  const idToken = String(payload.idToken || "");

  if (!associationSlug || !idToken) {
    throw new ApiError(400, "associationSlug and idToken are required.");
  }

  if (!env.googleClientId) {
    throw new ApiError(500, "Google OAuth is not configured.");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.googleClientId
  });

  const googlePayload = ticket.getPayload();
  const email = String(googlePayload.email || "").trim().toLowerCase();

  if (!email || !googlePayload.email_verified) {
    throw new ApiError(401, "Google account email is not verified.");
  }

  const association = await associationRepository.findActiveBySlug(associationSlug);
  if (!association) {
    throw new ApiError(401, "Invalid credentials.");
  }

  const user = await userRepository.findActiveByEmail(association.association_id, email);
  if (!user) {
    throw new ApiError(401, "User is not registered in this association.");
  }

  return createSession(user, association);
}

module.exports = {
  register,
  loginWithPassword,
  loginWithGoogle
};
