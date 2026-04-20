import express from "express";

export function createApp() {
  const app = express();
  // Needed behind our load balancer so req.ip is the real client, not the LB.
  app.set("trust proxy", 1);

  app.get("/whoami", (req, res) => {
    res.json({ ip: req.ip });
  });
  return app;
}
