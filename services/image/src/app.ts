import express, { Request, Response, Application } from "express";
import cors from "cors";
import imageRoutes from "./routes/imageRoutes";

const app: Application = express();

app.use(
  cors({
    origin: true,
    credentials: false,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Explicit OPTIONS handler as fallback (CORS middleware should handle this, but this ensures it works)
app.options("*", (_req: Request, res: Response) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.sendStatus(200);
});

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "image-service" });
});

app.use("/v1", imageRoutes);

app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error("Error:", err);
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  // Ensure CORS headers are included in error responses
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.status(status).json({ error: message });
});

export { app };
