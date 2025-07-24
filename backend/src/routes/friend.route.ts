import { Router } from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import {
  createFriend,
  getAllFriends,
  getFriendById,
  updateFriend,
  deleteFriend,
  getFriendPersonality,
  getFriendsStats,
} from "../controllers/friend.controller"; // Assuming friend.controller.ts is the file name

const friendRouter = Router();

// Create a new friend
friendRouter.route("/create").post(
  ClerkExpressRequireAuth() as any,
  createFriend
);

// Get all friends for a user with optional filters, pagination, and sorting
friendRouter.route("/").get(
  ClerkExpressRequireAuth() as any,
  getAllFriends
);

// Get friend by ID
friendRouter.route("/:id").get(
  ClerkExpressRequireAuth() as any,
  getFriendById
);

// Update friend
friendRouter.route("/:id").put(
  ClerkExpressRequireAuth() as any,
  updateFriend
);

// Delete friend
friendRouter.route("/:id").delete(
  ClerkExpressRequireAuth() as any,
  deleteFriend
);

// Get friend's personality summary
friendRouter.route("/:id/personality").get(
  ClerkExpressRequireAuth() as any,
  getFriendPersonality
);

// Get friends statistics for a user
friendRouter.route("/stats").get(
  ClerkExpressRequireAuth() as any,
  getFriendsStats
);

export default friendRouter;