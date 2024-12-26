import http from "node:http";
import path from "node:path";
import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import { connectDb } from "./db";
import { config } from "./config";
import { login, regenatateKey, register } from "./controller/auth";
import { posts } from "./controller/posts";
import { User } from "./model/User";
import cors from "cors";
import { socketServer } from "./socket";
import { videoQueue } from "./queue/VideoQueue";

declare global {
  var appRoot: string;
}

dotenv.config();
const app = express();
// (global as typeof globalThis & { appRoot: string }).appRoot = path.resolve(__dirname);
global.appRoot = path.resolve(__dirname);

app.use(
  cors({
    origin: "*",
    methods: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// Serve static files for HLS and thumbnails
app.use("/hls", express.static(path.join(__dirname, "public/hls")));
app.use(
  "/thumbnails",
  express.static(path.join(__dirname, "public/thumbnails"))
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDb();

const server = http.createServer(app);
socketServer(server);

app.post("/authenticate", async (req: Request, res: Response) => {
  const { name } = req.body;
  console.log("authenticated", name);
  try {
    const user = await User.findOne({ streamKey: name });
    if (user && !user.isLive) {
      // await User.updateOne({streamKey: name}, {isLive: true});
      res.status(200).send("OK"); // Stream can be published
    } else {
      res.status(403).send("FORBIDDEN"); // Stream can't be published
    }
  } catch (err) {
    res.status(500).send("SERVER ERROR");
  }
});
app.post("/streams/record-done", (req: Request, res: Response) => {
  const { name, path } = req.body;
  // Update database with path of the completed recording
  videoQueue.add({ name, videoPath: path });

  console.log("stream stopped");
  res.sendStatus(200);
});

app.post("/register", register);
app.post("/login", login);
app.post("/regenerate", regenatateKey);
app.get("/posts", posts);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ message: err.message || "Something went wrong" });
});

server.listen(config.port, () => {
  console.log(`server listening on ${config.port}`);
});
