import express, { Request, Response, Application } from "express";

const app: Application = express();

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "image-service" });
});

app.get("/v1/gallery", (_req: Request, res: Response) => {
  res.json({ images: [] });
});

app.post("/v1/images", (req: Request, res: Response) => {
  const { url, title, description } = req.body;
  res.json({ 
    id: "1", 
    url: url || "", 
    title: title || "Untitled", 
    description: description || "" 
  });
});

export { app };
