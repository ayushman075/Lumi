import redis from "../configs/redis.config";


const getCacheKey = (prefix: string, id: string): string => `${prefix}:${id}`;

const setCache = async (key: string, data: any, ttl: number = 3600): Promise<void> => {
  await redis.setex(key, ttl, JSON.stringify(data));
};

const getCache = async <T>(key: string): Promise<T | null> => {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
};

const deleteCache = async (key: string): Promise<void> => {
  await redis.del(key);
};

const deleteCachePattern = async (pattern: string): Promise<void> => {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};


const pushChat = async (userId: string, role: "user" | "ai", message: string) => {
  await redis.rpush(`chat:${userId}`, JSON.stringify({ role, message }));
  await redis.ltrim(`chat:${userId}`, -100, -1); // keep only last 10
}

const getRecentChats = async(userId: string) => {
  const messages = await redis.lrange(`chat:${userId}`, 0, -1);
  return messages.map(m => JSON.parse(m));
}

export {getCacheKey, getCache, setCache, deleteCache, deleteCachePattern, pushChat, getRecentChats}