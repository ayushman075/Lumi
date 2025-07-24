import { PrismaClient, Subscription } from "@prisma/client";
import { Request, Response } from "express";
import AsyncHandler from "../utils/AsyncHandler";
import ApiResponse from "../utils/ApiResponse";
import { getCacheKey, getCache, setCache, deleteCache, deleteCachePattern } from '../utils/redis.util';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
  };
}

interface CreateSubscriptionRequest {
  isPro?: boolean;
  credits?: number;
  proExpiry?: string;
}

interface UpdateSubscriptionRequest {
  isPro?: boolean;
  credits?: number;
  freeCredits?: number;
  proExpiry?: string;
}

interface DeductCreditsRequest {
  amount: number;
}

interface AddCreditsRequest {
  amount: number;
  type?: 'free' | 'paid';
}

// Create free subscription for new user (called during user registration)
const createFreeSubscription = async (userId: string): Promise<Subscription> => {
  try {
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        isPro: false,
        freeCredits: 100,
        credits: 100,
        proExpiry: null,
      },
    });

    // Cache the subscription
    const cacheKey = getCacheKey("subscription", userId);
    await setCache(cacheKey, subscription);

    return subscription;
  } catch (error) {
    console.error("Create free subscription error:", error);
    throw error;
  }
};

// Get user's subscription
const getSubscription = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  try {
    // Check cache first
    const cacheKey = getCacheKey("subscription", userId);
    let subscription = await getCache<Subscription>(cacheKey);

    if (!subscription) {
      subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!subscription) {
        return res.status(404).json(
          new ApiResponse(404, {}, "Subscription not found", false)
        );
      }

      // Cache the subscription
      await setCache(cacheKey, subscription);
    }

    // Check if pro subscription has expired
    if (subscription.isPro && subscription.proExpiry && new Date() > new Date(subscription.proExpiry)) {
      subscription = await prisma.subscription.update({
        where: { userId },
        data: { isPro: false, proExpiry: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update cache
      await setCache(cacheKey, subscription);
    }

    return res.status(200).json(
      new ApiResponse(200, subscription, "Subscription retrieved successfully", true)
    );
  } catch (error) {
    console.error("Get subscription error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Create subscription (admin function)
const createSubscription = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { isPro = false, credits = 100, proExpiry }: CreateSubscriptionRequest = req.body;
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  try {
    // Check if subscription already exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (existingSubscription) {
      return res.status(400).json(
        new ApiResponse(400, {}, "Subscription already exists for this user", false)
      );
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        isPro,
        freeCredits: isPro ? 0 : credits,
        credits,
        proExpiry: proExpiry ? new Date(proExpiry) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Cache the subscription
    const cacheKey = getCacheKey("subscription", userId);
    await setCache(cacheKey, subscription);

    return res.status(201).json(
      new ApiResponse(201, subscription, "Subscription created successfully", true)
    );
  } catch (error) {
    console.error("Create subscription error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Update subscription
const updateSubscription = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { isPro, credits, freeCredits, proExpiry }: UpdateSubscriptionRequest = req.body;
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (isPro === undefined && credits === undefined && freeCredits === undefined && !proExpiry) {
    return res.status(400).json(
      new ApiResponse(400, {}, "At least one field is required for update", false)
    );
  }

  try {
    const updateData: any = {};
    if (isPro !== undefined) updateData.isPro = isPro;
    if (credits !== undefined) updateData.credits = credits;
    if (freeCredits !== undefined) updateData.freeCredits = freeCredits;
    if (proExpiry) updateData.proExpiry = new Date(proExpiry);

    const subscription = await prisma.subscription.update({
      where: { userId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update cache
    const cacheKey = getCacheKey("subscription", userId);
    await setCache(cacheKey, subscription);

    return res.status(200).json(
      new ApiResponse(200, subscription, "Subscription updated successfully", true)
    );
  } catch (error) {
    console.error("Update subscription error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Deduct credits
const deductCredits = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { amount }: DeductCreditsRequest = req.body;
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (!amount || amount <= 0) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Valid credit amount is required", false)
    );
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return res.status(404).json(
        new ApiResponse(404, {}, "Subscription not found", false)
      );
    }

    if (subscription.credits < amount) {
      return res.status(400).json(
        new ApiResponse(400, {}, "Insufficient credits", false)
      );
    }

    // Deduct from free credits first, then from paid credits
    let newFreeCredits = subscription.freeCredits;
    let newCredits = subscription.credits;

    if (newFreeCredits >= amount) {
      newFreeCredits -= amount;
      newCredits -= amount;
    } else {
      const remainingToDeduct = amount - newFreeCredits;
      newFreeCredits = 0;
      newCredits -= amount;
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { userId },
      data: {
        credits: newCredits,
        freeCredits: newFreeCredits,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update cache
    const cacheKey = getCacheKey("subscription", userId);
    await setCache(cacheKey, updatedSubscription);

    return res.status(200).json(
      new ApiResponse(200, updatedSubscription, "Credits deducted successfully", true)
    );
  } catch (error) {
    console.error("Deduct credits error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Add credits
const addCredits = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { amount, type = 'paid' }: AddCreditsRequest = req.body;
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (!amount || amount <= 0) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Valid credit amount is required", false)
    );
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return res.status(404).json(
        new ApiResponse(404, {}, "Subscription not found", false)
      );
    }

    const updateData: any = {
      credits: subscription.credits + amount,
    };

    // If adding free credits, update freeCredits as well
    if (type === 'free') {
      updateData.freeCredits = subscription.freeCredits + amount;
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { userId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update cache
    const cacheKey = getCacheKey("subscription", userId);
    await setCache(cacheKey, updatedSubscription);

    return res.status(200).json(
      new ApiResponse(200, updatedSubscription, "Credits added successfully", true)
    );
  } catch (error) {
    console.error("Add credits error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Upgrade to Pro
const upgradeToPro = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { proExpiry }: { proExpiry: string } = req.body;
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  if (!proExpiry) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Pro expiry date is required", false)
    );
  }

  try {
    const subscription = await prisma.subscription.update({
      where: { userId },
      data: {
        isPro: true,
        proExpiry: new Date(proExpiry),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update cache
    const cacheKey = getCacheKey("subscription", userId);
    await setCache(cacheKey, subscription);

    return res.status(200).json(
      new ApiResponse(200, subscription, "Upgraded to Pro successfully", true)
    );
  } catch (error) {
    console.error("Upgrade to Pro error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Delete subscription
const deleteSubscription = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json(
      new ApiResponse(401, {}, "Authentication required", false)
    );
  }

  try {
    await prisma.subscription.delete({
      where: { userId },
    });

    // Remove from cache
    const cacheKey = getCacheKey("subscription", userId);
    await deleteCache(cacheKey);

    return res.status(200).json(
      new ApiResponse(200, {}, "Subscription deleted successfully", true)
    );
  } catch (error) {
    console.error("Delete subscription error:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Internal server error", false)
    );
  }
});

// Check if user has enough credits (utility function for other controllers)
const checkCredits = async (userId: string, requiredCredits: number): Promise<boolean> => {
  try {
    const cacheKey = getCacheKey("subscription", userId);
    let subscription = await getCache<Subscription>(cacheKey);

    if (!subscription) {
      subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (subscription) {
        await setCache(cacheKey, subscription);
      }
    }

    return subscription ? subscription.credits >= requiredCredits : false;
  } catch (error) {
    console.error("Check credits error:", error);
    return false;
  }
};

export {
  createFreeSubscription,
  getSubscription,
  createSubscription,
  updateSubscription,
  deductCredits,
  addCredits,
  upgradeToPro,
  deleteSubscription,
  checkCredits,
};