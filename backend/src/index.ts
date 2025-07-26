import express from 'express';
import dotenv from 'dotenv';
import redis from './configs/redis.config';
import cors from 'cors';
import cookieParser from "cookie-parser";
import prisma from './configs/db.config';
import http from "http";


const app = express();
// Load environment variables
dotenv.config({
  path: '.env'
});

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "https://credit-app-jl8y.vercel.app" , "http://localhost", "http://localhost:8000", "https://lumi-opal.vercel.app" , "https://qulth.vercel.app"],
    methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH" , "DELETE"],
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "16kb"
}));
app.use(express.static("public"));
app.use(cookieParser());

import authRouter from './routes/user.route';
import { setupWebSocket } from './ws/audio';
import friendRouter from './routes/friend.route';


app.use("/api/v1/auth", authRouter);
app.use("/api/v1/friend", friendRouter);

const server = http.createServer(app);
setupWebSocket(server)

// Use the port from environment variables for the main server.listen call
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000; // Parse to number

// Graceful shutdown function
const shutdown = async () => {
  console.log('Shutting down server...');
  server.close(async () => { // Close the HTTP server
    await prisma.$disconnect();
    console.log('Disconnected from database');
    process.exit(0);
  });
};

// Connect and start server
async function startServer() {
  try {
    // Test the database connection
    await prisma.$connect();
    await redis; // Assuming redis.config connects to Redis when imported
    console.log('Connected to Postgres with Prisma and Redis');

    // Only one listen call for the http.Server instance
    server.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });

    // Handle graceful shutdown
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error("Error connecting to database or starting server:", err);
    process.exit(1);
  }
}

startServer();

export default app;