// services/conversation.ts
import { transcribeAudio } from "./stt";
import { searchMemory, storeVector } from "./pinecone";
import { getEmbedding, generateResponse } from "./gemini";
import { getRecentChats, pushChat } from "../utils/redis.util";
import { synthesizeSpeech } from "./tts";

interface Session {
  userId: string;
  friendId: string;
  context: string[];
}

const sessions = new Map<string, Session>();

export async function initializeSession(userId: string, friendId: string): Promise<string> {
  const sessionId = `${userId}-${friendId}`;
  
  // Pre-load context for faster processing
  let context: string[] = [];
  try {
    const recent = await getRecentChats(userId);
    context = recent.map(m => `${m.role}: ${m.message}`);
  } catch (error) {
    console.error("❌ Failed to load context:", error);
    context = [];
  }

  sessions.set(sessionId, {
    userId,
    friendId,
    context
  });

  console.log(`✅ Session initialized: ${sessionId} with ${context.length} context items`);
  return sessionId;
}

export async function processCompleteAudio(
  audioBuffer: Buffer, 
  userId: string, 
  friendId: string
) {
  const sessionId = `${userId}-${friendId}`;
  let session = sessions.get(sessionId);
  
  if (!session) {
    // Initialize session if not exists
    await initializeSession(userId, friendId);
    session = sessions.get(sessionId)!;
  }

  try {
    console.log(`🎵 Processing complete audio: ${audioBuffer.length} bytes`);

    // Step 1: Transcribe the audio
    console.log("🎤 Starting transcription...");
    const transcript = await transcribeAudio(audioBuffer);
    
    if (!transcript || transcript.trim().length === 0) {
      console.log("🔇 No transcript generated");
      return {
        response: "I didn't catch that. Could you please try again?",
        transcript: "",
        audioBuffer: await synthesizeSpeech("I didn't catch that. Could you please try again?").catch(() => null)
      };
    }

    console.log(`📝 Transcript: "${transcript}"`);

    // Step 2: Store user message
    await pushChat(userId, "user", transcript);

    // Step 3: Get embedding and search long-term memory in parallel
    console.log("🧠 Getting embedding and searching memory...");
    const [embedding, longTermMemory] = await Promise.all([
      getEmbedding(transcript).catch((error) => {
        console.error("❌ Failed to get embedding:", error);
        return [];
      }),
      searchMemory(userId, []).catch((error) => {
        console.error("❌ Failed to search memory:", error);
        return [];
      })
    ]);

    // Step 4: Build enhanced context
    const enhancedContext = [
      ...session.context,
      ...longTermMemory,
      `user: ${transcript}`
    ].filter((v): v is string => typeof v === "string");

    console.log(`🧠 Enhanced context items: ${enhancedContext.length}`);

    // Step 5: Generate AI response
    console.log("🤖 Generating AI response...");
    const aiResponse = await generateResponse(enhancedContext, transcript);
    console.log(`🤖 AI Response: "${aiResponse}"`);

    // Step 6: Store AI response and generate TTS in parallel, plus background vector storage
    const [audioResponseBuffer] = await Promise.all([
      synthesizeSpeech(aiResponse).catch((error) => {
        console.error("❌ TTS failed:", error);
        return null;
      }),
      pushChat(userId, "ai", aiResponse).catch((error) => {
        console.error("❌ Failed to store AI response:", error);
      }),
      // Store vectors in background (don't await)
      storeVectorsInBackground(userId, transcript, aiResponse, embedding)
    ]);

    // Step 7: Update session context
    session.context = [
      ...session.context, 
      `user: ${transcript}`, 
      `ai: ${aiResponse}`
    ].slice(-10); // Keep last 10 messages

    console.log("✅ Audio processing completed successfully");

    return {
      response: aiResponse,
      transcript: transcript,
      audioBuffer: audioResponseBuffer
    };

  } catch (error) {
    console.error("❌ Error in processCompleteAudio:", error);
    
    const errorMessage = "I'm having trouble processing your audio right now. Please try again.";
    
    return {
      response: errorMessage,
      transcript: "",
      audioBuffer: await synthesizeSpeech(errorMessage).catch(() => null),
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

async function storeVectorsInBackground(
  userId: string, 
  userMessage: string, 
  aiResponse: string, 
  embedding: number[]
) {
  // Don't await this - let it run in background
  Promise.all([
    embedding.length > 0 ? storeVector(userId, userMessage, embedding) : Promise.resolve(),
    getEmbedding(aiResponse).then(responseEmbedding => 
      storeVector(userId, aiResponse, responseEmbedding)
    ).catch(error => {
      console.error("❌ Failed to store AI response vector:", error);
    })
  ]).catch(error => {
    console.error("❌ Background vector storage failed:", error);
  });
}

export function cleanupSession(userId: string, friendId: string): void {
  const sessionId = `${userId}-${friendId}`;
  sessions.delete(sessionId);
  console.log(`🧹 Cleaned up session: ${sessionId}`);
}

// Legacy function for backward compatibility (if needed)
export async function handleAudioStream(audio: Buffer, userId: string, friendId: string) {
  return await processCompleteAudio(audio, userId, friendId);
}

// Function to get session info (useful for debugging)
export function getSessionInfo(userId: string, friendId: string) {
  const sessionId = `${userId}-${friendId}`;
  const session = sessions.get(sessionId);
  
  return {
    sessionId,
    exists: !!session,
    contextItems: session?.context.length || 0
  };
}