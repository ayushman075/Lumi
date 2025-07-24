import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { 
  processCompleteAudio, 
  initializeSession, 
  cleanupSession 
} from "../services/conversation";

interface ClientSession {
  userId: string;
  friendId: string;
  sessionId?: string;
  isProcessing: boolean;
}

interface InitMessage {
  type: "init";
  userId: string;
  friendId: string;
}

interface AudioMessage {
  type: "audio";
  data: string; // base64 encoded complete audio file
}

interface ProcessCompleteAudioResult {
  error?: string;
  response: string;
  transcript: string;
  audioBuffer?: Buffer | null;
}

type WebSocketMessage = InitMessage | AudioMessage;

interface ErrorResponse {
  type: "error";
  message: string;
  details?: string;
  timestamp: number;
}

interface ReadyResponse {
  type: "ready";
  message: string;
  sessionId?: string;
}

interface ProcessingResponse {
  type: "processing";
  message: string;
}

interface FinalResponse {
  type: "response";
  text: string;
  transcript: string;
  audioBuffer?: string | null;
  timestamp: number;
}

type WebSocketResponse = ErrorResponse | ReadyResponse | ProcessingResponse | FinalResponse;

const sessions = new Map<WebSocket, ClientSession>();

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection");

    ws.on("message", async (data: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        // Handle different data types from WebSocket
        let messageData: Buffer;
        if (Buffer.isBuffer(data)) {
          messageData = data;
        } else if (data instanceof ArrayBuffer) {
          messageData = Buffer.from(data);
        } else if (Array.isArray(data)) {
          messageData = Buffer.concat(data);
        } else {
          throw new Error("Unsupported data type");
        }

        const message: WebSocketMessage = JSON.parse(messageData.toString());
        
        switch (message.type) {
          case "init":
            await handleInit(ws, message);
            break;
          case "audio":
            await handleCompleteAudio(ws, message);
            break;
          default:
            const unknownMessage = message as { type: string };
            console.warn("Unknown message type:", unknownMessage.type);
        }
      } catch (error) {
        console.error("❌ Error parsing message:", error);
        const errorResponse: ErrorResponse = {
          type: "error",
          message: "Invalid message format",
          details: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now()
        };
        sendMessage(ws, errorResponse);
      }
    });

    ws.on("close", () => {
      handleDisconnection(ws);
    });

    ws.on("error", (error: Error) => {
      console.error("WebSocket error:", error);
      handleDisconnection(ws);
    });
  });

  console.log("WebSocket ready for audio processing");
}

async function handleInit(ws: WebSocket, message: InitMessage): Promise<void> {
  const { userId, friendId } = message;
  
  if (!userId || !friendId) {
    const errorResponse: ErrorResponse = { 
      type: "error", 
      message: "userId and friendId are required",
      timestamp: Date.now()
    };
    sendMessage(ws, errorResponse);
    return;
  }

  try {
    // Initialize session
    const sessionId: string = await initializeSession(userId, friendId);
    
    sessions.set(ws, {
      userId,
      friendId,
      sessionId,
      isProcessing: false
    });

    const readyResponse: ReadyResponse = { 
      type: "ready", 
      message: "Session initialized and ready to process audio",
      sessionId
    };
    sendMessage(ws, readyResponse);
    
    console.log(`✅ Session initialized: ${sessionId}`);
  } catch (error) {
    console.error("❌ Failed to initialize session:", error);
    const errorResponse: ErrorResponse = { 
      type: "error", 
      message: "Failed to initialize session",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now()
    };
    sendMessage(ws, errorResponse);
  }
}

async function handleCompleteAudio(ws: WebSocket, message: AudioMessage): Promise<void> {
  const session = sessions.get(ws);
  if (!session) {
    const errorResponse: ErrorResponse = { 
      type: "error", 
      message: "Session not initialized. Please send init message first.",
      timestamp: Date.now()
    };
    sendMessage(ws, errorResponse);
    return;
  }

  if (session.isProcessing) {
    const errorResponse: ErrorResponse = { 
      type: "error", 
      message: "Already processing audio. Please wait for current request to complete.",
      timestamp: Date.now()
    };
    sendMessage(ws, errorResponse);
    return;
  }

  session.isProcessing = true;

  try {
    // Send processing notification
    const processingResponse: ProcessingResponse = { 
      type: "processing", 
      message: "Processing your audio..." 
    };
    sendMessage(ws, processingResponse);

    const audioBuffer = Buffer.from(message.data, 'base64');
    console.log(`🎵 Processing complete audio: ${audioBuffer.length} bytes`);

    // Process the complete audio file
    const result: ProcessCompleteAudioResult = await processCompleteAudio(
      audioBuffer, 
      session.userId, 
      session.friendId
    );

    if (result.error) {
      const errorResponse: ErrorResponse = { 
        type: "error", 
        message: "Audio processing failed",
        details: result.error,
        timestamp: Date.now()
      };
      sendMessage(ws, errorResponse);
      return;
    }

    // Send final response
    const finalResponse: FinalResponse = {
      type: "response",
      text: result.response,
      transcript: result.transcript,
      audioBuffer: result.audioBuffer ? result.audioBuffer.toString('base64') : null,
      timestamp: Date.now()
    };
    sendMessage(ws, finalResponse);
    console.log("📤 Response sent to client");
    console.log(`📝 Transcript: "${result.transcript}"`);
    console.log(`🤖 Response: "${result.response}"`);

  } catch (error) {
    console.error("❌ Error processing complete audio:", error);
    const errorResponse: ErrorResponse = { 
      type: "error", 
      message: "Failed to process audio",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now()
    };
    sendMessage(ws, errorResponse);
  } finally {
    session.isProcessing = false;
  }
}

function handleDisconnection(ws: WebSocket): void {
  const session = sessions.get(ws);
  if (session) {
    try {
      cleanupSession(session.userId, session.friendId);
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
    }
  }
  sessions.delete(ws);
  console.log("🔌 WebSocket disconnected and session cleaned up");
}

// Utility function to send messages with proper error handling
function sendMessage(ws: WebSocket, message: WebSocketResponse): void {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn("⚠️ Attempted to send message to closed WebSocket");
    }
  } catch (error) {
    console.error("❌ Failed to send message:", error);
  }
}

// Export types for use in other modules
export type {
  ClientSession,
  WebSocketMessage,
  ProcessCompleteAudioResult,
  WebSocketResponse
};