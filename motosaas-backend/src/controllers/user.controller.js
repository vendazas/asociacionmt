const userService = require("../services/user.service");

async function getProfile(req, res) {
  const data = await userService.getProfile(req.user);
  res.status(200).json({ data });
}

async function listUsers(req, res) {
  const data = await userService.listUsers(req.user, req.query);
  res.status(200).json({ data });
}

async function createUser(req, res) {
  const data = await userService.createUser(req.user, req.body);
  res.status(201).json({ data });
}

module.exports = {
  createUser,
  getProfile,
  listUsers
};
