const bcrypt = require("bcryptjs");
const { env } = require("../config/env");

function hashPassword(password) {
  return bcrypt.hash(password, env.bcryptSaltRounds);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  hashPassword,
  comparePassword
};
