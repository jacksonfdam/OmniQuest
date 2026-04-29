module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.statusCode = 200;
  res.end(JSON.stringify({
    status: "ok",
    app: "OmniQuest",
    time: new Date().toISOString()
  }));
};
