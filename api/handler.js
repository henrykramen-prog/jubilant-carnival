const { handleApiRequest } = require("../server.js");

module.exports = async (req, res) => {
  await handleApiRequest(req, res);
};
