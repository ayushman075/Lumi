import Redis from 'ioredis';
import dotenv from 'dotenv';


dotenv.config({
  path:'.env'
});

const redis = new Redis(process.env.REDIS_URL!);

redis.on("connect", () => {
  console.log("Connected to Redis successfully!");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
  throw new Error("Redis connection Error")
});

export default redis;
