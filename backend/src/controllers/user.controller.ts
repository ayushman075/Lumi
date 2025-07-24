import { clerkClient } from "@clerk/clerk-sdk-node";
import { PrismaClient, User } from "@prisma/client";
import { Request, Response } from "express";
import { Webhook } from "svix";
import redis from "../configs/redis.config";
import AsyncHandler from "../utils/AsyncHandler";
import ApiResponse from "../utils/ApiResponse";
import {getCacheKey,getCache,setCache,deleteCache,deleteCachePattern} from '../utils/redis.util'

 
const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
  };
}

interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
}

interface UpdateUserRequest {
  userId: string;
  name?: string;
}

interface GetAllUsersQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: "asc" | "desc";
  filters?: {
    name?: string;
    email?: string;
  };
}

// Controllers
const clerkWebhookListener = AsyncHandler(async (req: Request, res: Response) => {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET_KEY;
  
  if (!SIGNING_SECRET) {
    console.error("Error: SIGNING_SECRET is missing in environment variables.");
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }

  const webhook = new Webhook(SIGNING_SECRET);
  const headers = req.headers;
  const payload = JSON.stringify(req.body);

  const svix_id = headers["svix-id"] as string;
  const svix_timestamp = headers["svix-timestamp"] as string;
  const svix_signature = headers["svix-signature"] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Missing Svix headers for webhook verification", false)
    );
  }

  let evt: any;
  try {
    evt = webhook.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err: any) {
    console.error("Webhook verification failed:", err.message);
    return res.status(400).json(
      new ApiResponse(400, {}, "Webhook verification failed", false)
    );
  }

  const userData = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const userPayload = {
      userId: userData.id,
      email: userData.email_addresses?.[0]?.email_address || "",
      name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim(),
    };

    try {
      const user = await prisma.user.upsert({
        where: { userId: userData.id },
        update: userPayload,
        create: userPayload,
      });

      // Invalidate user cache
      await deleteCachePattern(`user:*`);
      await deleteCachePattern(`users:*`);
      
    } catch (error) {
      console.error("Database error:", error);
      return res.status(500).json(
        new ApiResponse(500, {}, "Database error", false)
      );
    }
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "Webhook processed successfully", true)
  );
});

const updateUserProfile = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId, name }: UpdateUserRequest = req.body;
  const currentUserId = req.auth?.userId;

  if (!currentUserId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (!userId) {
    return res.status(400).json(
      new ApiResponse(400, {}, "User ID is required", false)
    );
  }

  if (!name) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Name is required for update", false)
    );
  }

  // Users can only update their own profile
  if (currentUserId !== userId) {
    return res.status(403).json(
      new ApiResponse(403, {}, "You can only update your own profile", false)
    );
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { userId },
    });

    if (!existingUser) {
      return res.status(404).json(
        new ApiResponse(404, {}, "User not found", false)
      );
    }

    const updatedUser = await prisma.user.update({
      where: { userId },
      data: { name },
      include: {
        subscription: true,
        friends: true,
        _count: {
          select: {
            payments: true,
            conversations: true,
          },
        },
      },
    });

    // Update cache
    const cacheKey = getCacheKey("user", userId);
    await setCache(cacheKey, updatedUser);
    await deleteCachePattern(`users:*`);

    return res.status(200).json(
      new ApiResponse(200, updatedUser, "User updated successfully", true)
    );
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

const getUserProfile = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Unauthorized Request", false)
    );
  }

  try {
    // Check cache first
    const cacheKey = getCacheKey("user", userId);
    let user = await getCache<User>(cacheKey);

    if (!user) {
      user = await prisma.user.findUnique({
        where: { userId },
        include: {
          subscription: true,
          friends: {
                select: {
                  id: true,
                  name: true,
                  gender: true,
            },
          },
          _count: {
            select: {
              payments: true,
              conversations: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json(
          new ApiResponse(404, {}, "User not found", false)
        );
      }

      // Cache the user
      await setCache(cacheKey, user);
    }

    return res.status(200).json(
      new ApiResponse(200, user, "User retrieved successfully", true)
    );
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

const getAllUsers = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    page = "1",
    limit = "10",
    sort = "createdAt",
    order = "desc",
    filters = {},
  }: GetAllUsersQuery = req.query;

  const currentUserId = req.auth?.userId;

  if (!currentUserId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  try {
    // Create cache key
    const cacheKey = getCacheKey(
      "users",
      `${page}-${limit}-${sort}-${order}-${JSON.stringify(filters)}`
    );
    
    let cachedResult = await getCache<any>(cacheKey);

    if (!cachedResult) {
      const where: any = {};

      // Apply filters
      if (filters.name) {
        where.name = {
          contains: filters.name,
          mode: "insensitive",
        };
      }

      if (filters.email) {
        where.email = {
          contains: filters.email,
          mode: "insensitive",
        };
      }

      // Fetch users with pagination and sorting
      const [users, totalUsers] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: {
            [sort]: order,
          },
          skip,
          take: limitNum,
          select: {
            id: true,
            userId: true,
            email: true,
            name: true,
            createdAt: true,
            subscription: {
              select: {
                id: true,
                credits: true,
                isPro: true,
              },
            },
            _count: {
              select: {
                friends: true,
                payments: true,
                conversations: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      cachedResult = {
        success: true,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limitNum),
        currentPage: pageNum,
        users,
      };

      // Cache the result for 5 minutes
      await setCache(cacheKey, cachedResult, 300);
    }

    return res.status(200).json(
      new ApiResponse(200, cachedResult, "Users retrieved successfully", true)
    );
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

const createUser = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, name }: CreateUserRequest = req.body;
    const currentUserId = req.auth?.userId;

    if (!currentUserId) {
      return res.status(401).json(
        new ApiResponse(401, {}, "Authentication required", false)
      );
    }

    if (!email || !password) {
      return res.status(400).json(
        new ApiResponse(400, {}, "Email and password are required", false)
      );
    }

    // Create user in Clerk
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      password: password,
      ...(name && { firstName: name.split(" ")[0], lastName: name.split(" ").slice(1).join(" ") }),
    });

    if (!clerkUser) {
      return res.status(500).json(
        new ApiResponse(500, {}, "Error creating user in Clerk", false)
      );
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        userId: clerkUser.id,
        email,
        name: name || "",
      },
      include: {
        subscription: true,
        _count: {
          select: {
            friends: true,
            payments: true,
            conversations: true,
          },
        },
      },
    });

    // Cache the new user
    const cacheKey = getCacheKey("user", user.userId);
    await setCache(cacheKey, user);
    await deleteCachePattern(`users:*`); // Invalidate list cache

    return res.status(201).json(
      new ApiResponse(201, user, "User created successfully", true)
    );
  } catch (error: any) {
    console.error("Create user error:", error);
    
    if (error.errors) {
      return res.status(422).json(
        new ApiResponse(422, {}, error.errors, false)
      );
    }

    return res.status(500).json(
      new ApiResponse(500, {}, "Internal Server Error", false)
    );
  }
});

const deleteUser = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.auth?.userId;

  if (!currentUserId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (!id) {
    return res.status(400).json(
      new ApiResponse(400, {}, "User ID is required", false)
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json(
        new ApiResponse(404, {}, "User not found", false)
      );
    }

    // Users can only delete their own account
    if (currentUserId !== user.userId) {
      return res.status(403).json(
        new ApiResponse(403, {}, "You can only delete your own account", false)
      );
    }

    // Delete user from Clerk
    await clerkClient.users.deleteUser(user.userId);

    // Delete user from database (cascade will handle related records)
    await prisma.user.delete({
      where: { id },
    });

    // Remove from cache
    const cacheKey = getCacheKey("user", user.userId);
    await deleteCache(cacheKey);
    await deleteCachePattern(`users:*`); // Invalidate list cache

    return res.status(200).json(
      new ApiResponse(200, {}, "User deleted successfully", true)
    );
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Error deleting user", false)
    );
  }
});

// Get user by ID
const getUserById = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.auth?.userId;

  if (!currentUserId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (!id) {
    return res.status(400).json(
      new ApiResponse(400, {}, "User ID is required", false)
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: {
          select: {
            id: true,
            credits: true,
            isPro: true,
          },
        },
        _count: {
          select: {
            friends: true,
            payments: true,
            conversations: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json(
        new ApiResponse(404, {}, "User not found", false)
      );
    }

    return res.status(200).json(
      new ApiResponse(200, user, "User retrieved successfully", true)
    );
  } catch (error) {
    console.error("Get user by ID error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Cleanup function to close connections
const cleanup = async (): Promise<void> => {
  await prisma.$disconnect();
  await redis.quit();
};

export {
  clerkWebhookListener,
  updateUserProfile,
  getUserProfile,
  getAllUsers,
  createUser,
  deleteUser,
  getUserById,
  cleanup,
};