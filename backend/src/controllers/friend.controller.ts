import { PrismaClient, Friend, Gender, Tone, Temperament } from "@prisma/client";
import { Request, Response } from "express";
import AsyncHandler from "../utils/AsyncHandler";
import ApiResponse from "../utils/ApiResponse";
import { getCacheKey, getCache, setCache, deleteCache, deleteCachePattern } from '../utils/redis.util';
import { selectProfileImageForFriend } from "../utils/friendImage";

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
  };
}

interface CreateFriendRequest {
  name: string;
  gender: Gender;
  tone: Tone;
  temperament: Temperament;
  humor?: number;
  empathy?: number;
  sarcasm?: number;
  formality?: number;
  curiosity?: number;
  patience?: number;
  creativity?: number;
  optimism?: number;
}

interface UpdateFriendRequest {
  name?: string;
  gender?: Gender;
  tone?: Tone;
  temperament?: Temperament;
  humor?: number;
  empathy?: number;
  sarcasm?: number;
  formality?: number;
  curiosity?: number;
  patience?: number;
  creativity?: number;
  optimism?: number;
}

interface GetAllFriendsQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: "asc" | "desc";
  filters?: {
    name?: string;
    gender?: Gender;
    tone?: Tone;
    temperament?: Temperament;
  };
}

// Validation helper for personality traits
const validatePersonalityTrait = (value: number): boolean => {
  return value >= 0 && value <= 10;
};

// Create a new friend
const createFriend = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    gender,
    tone,
    temperament,
    humor = 5,
    empathy = 5,
    sarcasm = 0,
    formality = 5,
    curiosity = 5,
    patience = 5,
    creativity = 5,
    optimism = 5,
  }: CreateFriendRequest = req.body;

  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (!name || !gender || !tone || !temperament ) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Name, gender, tone, temperament, and profile image are required", false)
    );
  }

  // Validate personality traits
  const traits = { humor, empathy, sarcasm, formality, curiosity, patience, creativity, optimism };
  for (const [key, value] of Object.entries(traits)) {
    if (!validatePersonalityTrait(value)) {
      return res.status(400).json(
        new ApiResponse(400, {}, `${key} must be between 0 and 10`, false)
      );
    }
  }

  try {
 
        const profileImage = selectProfileImageForFriend({
      gender,
      tone,
      temperament,
      humor,
      empathy,
      sarcasm,
      formality,
      curiosity,
      patience,
      creativity,
      optimism,
    });

    const friend = await prisma.friend.create({
      data: {
        name,
        gender,
        tone,
        temperament,
        profileImage,
        humor,
        empathy,
        sarcasm,
        formality,
        curiosity,
        patience,
        creativity,
        optimism,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    // Cache the friend
    const cacheKey = getCacheKey("friend", `${userId}:${friend.id}`);
    await setCache(cacheKey, friend);
    await deleteCachePattern(`friends:${userId}:*`);

    return res.status(201).json(
      new ApiResponse(201, friend, "Friend created successfully", true)
    );
  } catch (error) {
    console.error("Create friend error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Get all friends for a user
const getAllFriends = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    page = "1",
    limit = "10",
    sort = "createdAt",
    order = "desc",
    filters = {},
  }: GetAllFriendsQuery = req.query;

  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  try {
    // Get user's database ID
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json(
        new ApiResponse(404, {}, "User not found", false)
      );
    }

    // Create cache key
    const cacheKey = getCacheKey(
      "friends",
      `${userId}:${page}-${limit}-${sort}-${order}-${JSON.stringify(filters)}`
    );

    let cachedResult = await getCache<any>(cacheKey);

    if (!cachedResult) {
      const where: any = {
        userId: user.id,
      };

      // Apply filters
      if (filters.name) {
        where.name = {
          contains: filters.name,
          mode: "insensitive",
        };
      }

      if (filters.gender) {
        where.gender = filters.gender;
      }

      if (filters.tone) {
        where.tone = filters.tone;
      }

      if (filters.temperament) {
        where.temperament = filters.temperament;
      }

      // Fetch friends with pagination and sorting
      const [friends, totalFriends] = await Promise.all([
        prisma.friend.findMany({
          where,
          orderBy: {
            [sort]: order,
          },
          skip,
          take: limitNum,
          include: {
            _count: {
              select: {
                conversations: true,
              },
            },
          },
        }),
        prisma.friend.count({ where }),
      ]);

      cachedResult = {
        success: true,
        totalFriends,
        totalPages: Math.ceil(totalFriends / limitNum),
        currentPage: pageNum,
        friends,
      };

      // Cache the result for 5 minutes
      await setCache(cacheKey, cachedResult, 300);
    }

    return res.status(200).json(
      new ApiResponse(200, cachedResult, "Friends retrieved successfully", true)
    );
  } catch (error) {
    console.error("Get all friends error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Get friend by ID
const getFriendById = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (!id) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Friend ID is required", false)
    );
  }

  try {
    // Check cache first
    const cacheKey = getCacheKey("friend", `${userId}:${id}`);
    let friend = await getCache<Friend>(cacheKey);

    if (!friend) {
      // Get user's database ID
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!user) {
        return res.status(404).json(
          new ApiResponse(404, {}, "User not found", false)
        );
      }

      friend = await prisma.friend.findFirst({
        where: {
          id,
          userId: user.id, // Ensure user can only access their own friends
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              conversations: true,
            },
          },
        },
      });

      if (!friend) {
        return res.status(404).json(
          new ApiResponse(404, {}, "Friend not found or access denied", false)
        );
      }

      // Cache the friend
      await setCache(cacheKey, friend);
    }

    return res.status(200).json(
      new ApiResponse(200, friend, "Friend retrieved successfully", true)
    );
  } catch (error) {
    console.error("Get friend by ID error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Update friend
const updateFriend = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData: UpdateFriendRequest = req.body;
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (!id) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Friend ID is required", false)
    );
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json(
      new ApiResponse(400, {}, "At least one field is required for update", false)
    );
  }

  // Validate personality traits if provided
  const personalityTraits = ['humor', 'empathy', 'sarcasm', 'formality', 'curiosity', 'patience', 'creativity', 'optimism'];
  for (const trait of personalityTraits) {
    if (updateData[trait as keyof UpdateFriendRequest] !== undefined && !validatePersonalityTrait(updateData[trait as keyof UpdateFriendRequest] as number)) {
      return res.status(400).json(
        new ApiResponse(400, {}, `${trait} must be between 0 and 10`, false)
      );
    }
  }

  try {
    // Get user's database ID
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json(
        new ApiResponse(404, {}, "User not found", false)
      );
    }

    // Check if friend exists and belongs to user
    const existingFriend = await prisma.friend.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingFriend) {
      return res.status(404).json(
        new ApiResponse(404, {}, "Friend not found or access denied", false)
      );
    }

    const updatedFriend = await prisma.friend.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    // Update cache
    const cacheKey = getCacheKey("friend", `${userId}:${id}`);
    await setCache(cacheKey, updatedFriend);
    await deleteCachePattern(`friends:${userId}:*`);

    return res.status(200).json(
      new ApiResponse(200, updatedFriend, "Friend updated successfully", true)
    );
  } catch (error) {
    console.error("Update friend error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Delete friend
const deleteFriend = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (!id) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Friend ID is required", false)
    );
  }

  try {
    // Get user's database ID
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json(
        new ApiResponse(404, {}, "User not found", false)
      );
    }

    // Check if friend exists and belongs to user
    const friend = await prisma.friend.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!friend) {
      return res.status(404).json(
        new ApiResponse(404, {}, "Friend not found or access denied", false)
      );
    }

    // Delete friend (cascade will handle related conversations)
    await prisma.friend.delete({
      where: { id },
    });

    // Remove from cache
    const cacheKey = getCacheKey("friend", `${userId}:${id}`);
    await deleteCache(cacheKey);
    await deleteCachePattern(`friends:${userId}:*`);

    return res.status(200).json(
      new ApiResponse(200, {}, "Friend deleted successfully", true)
    );
  } catch (error) {
    console.error("Delete friend error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Get friend's personality summary
const getFriendPersonality = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (!id) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Friend ID is required", false)
    );
  }

  try {
    // Check cache first
    const cacheKey = getCacheKey("friend_personality", `${userId}:${id}`);
    let personalityData = await getCache<any>(cacheKey);

    if (!personalityData) {
      // Get user's database ID
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!user) {
        return res.status(404).json(
          new ApiResponse(404, {}, "User not found", false)
        );
      }

      const friend = await prisma.friend.findFirst({
        where: {
          id,
          userId: user.id,
        },
        select: {
          id: true,
          name: true,
          gender: true,
          tone: true,
          temperament: true,
          humor: true,
          empathy: true,
          sarcasm: true,
          formality: true,
          curiosity: true,
          patience: true,
          creativity: true,
          optimism: true,
        },
      });

      if (!friend) {
        return res.status(404).json(
          new ApiResponse(404, {}, "Friend not found or access denied", false)
        );
      }

      const personalityTraits = {
        humor: friend.humor,
        empathy: friend.empathy,
        sarcasm: friend.sarcasm,
        formality: friend.formality,
        curiosity: friend.curiosity,
        patience: friend.patience,
        creativity: friend.creativity,
        optimism: friend.optimism,
      };

      // Calculate personality insights
      const averageScore = Object.values(personalityTraits).reduce((sum, score) => sum + score, 0) / 8;
      const dominantTrait = Object.entries(personalityTraits).reduce((max, [trait, score]) => 
        score > max.score ? { trait, score } : max, 
        { trait: 'balanced', score: 0 }
      );

      personalityData = {
        friend: {
          id: friend.id,
          name: friend.name,
          gender: friend.gender,
          tone: friend.tone,
          temperament: friend.temperament,
        },
        personalityTraits,
        insights: {
          averageScore: Math.round(averageScore * 100) / 100,
          dominantTrait: dominantTrait.trait,
          dominantScore: dominantTrait.score,
          personalityType: getPersonalityType(friend),
        },
      };

      // Cache for 1 hour
      await setCache(cacheKey, personalityData, 3600);
    }

    return res.status(200).json(
      new ApiResponse(200, personalityData, "Friend personality retrieved successfully", true)
    );
  } catch (error) {
    console.error("Get friend personality error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Get friends statistics for a user
const getFriendsStats = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  try {
    // Check cache first
    const cacheKey = getCacheKey("friends_stats", userId);
    let stats = await getCache<any>(cacheKey);

    if (!stats) {
      // Get user's database ID
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!user) {
        return res.status(404).json(
          new ApiResponse(404, {}, "User not found", false)
        );
      }

      // Get comprehensive stats
      const [
        totalFriends,
        genderStats,
        toneStats,
        temperamentStats,
        recentFriends,
        friendsWithConversations
      ] = await Promise.all([
        // Total friends count
        prisma.friend.count({
          where: { userId: user.id }
        }),
        
        // Gender distribution
        prisma.friend.groupBy({
          by: ['gender'],
          where: { userId: user.id },
          _count: { gender: true }
        }),
        
        // Tone distribution
        prisma.friend.groupBy({
          by: ['tone'],
          where: { userId: user.id },
          _count: { tone: true }
        }),
        
        // Temperament distribution
        prisma.friend.groupBy({
          by: ['temperament'],
          where: { userId: user.id },
          _count: { temperament: true }
        }),
        
        // Recent friends (last 7 days)
        prisma.friend.count({
          where: {
            userId: user.id,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Friends with conversations
        prisma.friend.count({
          where: {
            userId: user.id,
            conversations: {
              some: {}
            }
          }
        })
      ]);

      stats = {
        totalFriends,
        recentFriends,
        friendsWithConversations,
        activeRate: totalFriends > 0 ? Math.round((friendsWithConversations / totalFriends) * 100) : 0,
        distribution: {
          gender: genderStats.reduce((acc, item) => {
            acc[item.gender] = item._count.gender;
            return acc;
          }, {} as Record<string, number>),
          tone: toneStats.reduce((acc, item) => {
            acc[item.tone] = item._count.tone;
            return acc;
          }, {} as Record<string, number>),
          temperament: temperamentStats.reduce((acc, item) => {
            acc[item.temperament] = item._count.temperament;
            return acc;
          }, {} as Record<string, number>)
        }
      };

      // Cache for 30 minutes
      await setCache(cacheKey, stats, 1800);
    }

    return res.status(200).json(
      new ApiResponse(200, stats, "Friends statistics retrieved successfully", true)
    );
  } catch (error) {
    console.error("Get friends stats error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Helper function to determine personality type
const getPersonalityType = (friend: any): string => {
  const { humor, empathy, sarcasm, formality, curiosity, patience, creativity, optimism } = friend;
  
  if (humor >= 7 && creativity >= 7) return "Creative Jokester";
  if (empathy >= 8 && patience >= 7) return "Compassionate Listener";
  if (curiosity >= 8 && creativity >= 7) return "Innovative Explorer";
  if (formality >= 7 && patience >= 7) return "Professional Mentor";
  if (optimism >= 8 && humor >= 6) return "Positive Motivator";
  if (sarcasm >= 6 && humor >= 7) return "Witty Companion";
  if (empathy >= 7 && optimism >= 7) return "Supportive Friend";
  
  return "Balanced Personality";
};

export {
  createFriend,
  getAllFriends,
  getFriendById,
  updateFriend,
  deleteFriend,
  getFriendPersonality,
  getFriendsStats,
};