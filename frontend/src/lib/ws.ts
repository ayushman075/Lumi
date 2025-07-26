// lib/ws.ts
let socket: WebSocket | null = null;
let isSessionReady = false;
let connectionPromise: Promise<void> | null = null;

interface WSResponse {
  type: "ready" | "processing" | "response" | "error";
  message?: string;
  sessionId?: string;
  text?: string;
  transcript?: string;
  audioBuffer?: string | null;
  details?: string;
  timestamp?: number;
}

// Event handlers type
type EventHandlers = {
  onReady?: (sessionId?: string) => void;
  onProcessing?: (message: string) => void;
  onResponse?: (response: { text: string; transcript: string; audioBuffer?: string | null }) => void;
  onError?: (error: { message: string; details?: string }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

let eventHandlers: EventHandlers = {};

export function connectWS(handlers: EventHandlers = {}): Promise<void> {
  eventHandlers = handlers;
  
  // Return existing connection promise if already connecting
  if (connectionPromise) {
    return connectionPromise;
  }
  
  connectionPromise = new Promise((resolve, reject) => {
    // Close existing socket if any
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }
    
    socket = new WebSocket("ws://lumi-vtx4.onrender.com");

    const timeoutId = setTimeout(() => {
      if (socket && socket.readyState === WebSocket.CONNECTING) {
        socket.close();
        reject(new Error("Connection timeout"));
      }
    }, 5000);

    socket.onopen = () => {
      clearTimeout(timeoutId);
      console.log("🟢 WebSocket connected");
      eventHandlers.onConnect?.();
      resolve();
    };
    
    socket.onclose = () => {
      clearTimeout(timeoutId);
      console.log("🔴 WebSocket closed");
      isSessionReady = false;
      connectionPromise = null;
      eventHandlers.onDisconnect?.();
    };
    
    socket.onmessage = (event) => {
      try {
        const message: WSResponse = JSON.parse(event.data);
        console.log("📨 Received:", message);
        
        handleMessage(message);
      } catch (error) {
        console.error("❌ Failed to parse message:", error);
      }
    };

    socket.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error("❌ WebSocket error:", error);
      connectionPromise = null;
      eventHandlers.onError?.({ 
        message: "WebSocket connection error",
        details: "Check if server is running on ws://lumi-vtx4.onrender.com"
      });
      reject(new Error("WebSocket connection failed"));
    };
  });

  return connectionPromise;
}

function handleMessage(message: WSResponse) {
  switch (message.type) {
    case "ready":
      console.log("✅ Session ready:", message.message);
      isSessionReady = true;
      eventHandlers.onReady?.(message.sessionId);
      break;
    
    case "processing":
      console.log("⚙️ Processing:", message.message);
      eventHandlers.onProcessing?.(message.message || "Processing your audio...");
      break;
    
    case "response":
      console.log("💬 AI Response:", message.text);
      console.log("📜 User Transcript:", message.transcript);
      if (message.audioBuffer) {
        console.log("🎵 Audio response available");
      }
      
      eventHandlers.onResponse?.({
        text: message.text || "",
        transcript: message.transcript || "",
        audioBuffer: message.audioBuffer
      });
      break;
    
    case "error":
      console.error("❌ Server Error:", message.message);
      if (message.details) {
        console.error("🔍 Details:", message.details);
      }
      
      eventHandlers.onError?.({
        message: message.message || "Unknown error",
        details: message.details
      });
      break;
    
    default:
      console.log("ℹ️ Unknown message type:", (message as any).type);
      break;
  }
}

export async function initializeSession(userId: string, friendId: string): Promise<string> {
  // Ensure WebSocket is connected first
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket not connected. Call connectWS() first.");
  }

  return new Promise((resolve, reject) => {
    // Set up one-time handlers for this initialization
    const originalOnReady = eventHandlers.onReady;
    const originalOnError = eventHandlers.onError;

    const timeoutId = setTimeout(() => {
      // Restore original handlers
      eventHandlers.onReady = originalOnReady;
      eventHandlers.onError = originalOnError;
      reject(new Error("Session initialization timeout"));
    }, 10000);

    eventHandlers.onReady = (sessionId) => {
      clearTimeout(timeoutId);
      // Restore original handler
      eventHandlers.onReady = originalOnReady;
      eventHandlers.onError = originalOnError;
      
      resolve(sessionId || `${userId}-${friendId}`);
      originalOnReady?.(sessionId);
    };

    eventHandlers.onError = (error) => {
      clearTimeout(timeoutId);
      // Restore original handlers
      eventHandlers.onReady = originalOnReady;
      eventHandlers.onError = originalOnError;
      
      reject(new Error(error.message));
      originalOnError?.(error);
    };

    // Send initialization message (UNCOMMENTED)
    socket!.send(JSON.stringify({
      type: "init",
      userId,
      friendId
    }));

    console.log("📤 Sent init message:", { userId, friendId });
  });
}

// Alternative initialization for servers that auto-initialize
export async function initializeSessionSimple(userId: string, friendId: string): Promise<string> {
  // For servers that don't require explicit initialization
  // Just mark as ready after connection
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket not connected. Call connectWS() first.");
  }

  // Simulate ready state for servers that auto-initialize
  setTimeout(() => {
    isSessionReady = true;
    eventHandlers.onReady?.(`${userId}-${friendId}`);
  }, 100);

  return `${userId}-${friendId}`;
}

export function sendCompleteAudio(audioData: ArrayBuffer | Blob): Promise<{ text: string; transcript: string; audioBuffer?: string | null }> {
  return new Promise(async (resolve, reject) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      reject(new Error("WebSocket not connected"));
      return;
    }

    if (!isSessionReady) {
      reject(new Error("Session not initialized. Call initializeSession() first."));
      return;
    }

    try {
      // Convert audio data to base64
      let base64Audio: string;
      
      if (audioData instanceof ArrayBuffer) {
        const uint8Array = new Uint8Array(audioData);
        base64Audio = btoa(String.fromCharCode(...uint8Array));
      } else if (audioData instanceof Blob) {
        // Convert Blob to ArrayBuffer first
        const arrayBuffer = await audioData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        base64Audio = btoa(String.fromCharCode(...uint8Array));
      } else {
        throw new Error("Unsupported audio data type. Use ArrayBuffer or Blob.");
      }

      // Set up one-time handlers for this request
      const originalOnResponse = eventHandlers.onResponse;
      const originalOnError = eventHandlers.onError;

      const timeoutId = setTimeout(() => {
        eventHandlers.onResponse = originalOnResponse;
        eventHandlers.onError = originalOnError;
        reject(new Error("Audio processing timeout"));
      }, 30000);

      eventHandlers.onResponse = (response) => {
        clearTimeout(timeoutId);
        // Restore original handlers
        eventHandlers.onResponse = originalOnResponse;
        eventHandlers.onError = originalOnError;
        
        resolve(response);
        originalOnResponse?.(response);
      };

      eventHandlers.onError = (error) => {
        clearTimeout(timeoutId);
        // Restore original handlers
        eventHandlers.onResponse = originalOnResponse;
        eventHandlers.onError = originalOnError;
        
        reject(new Error(error.message));
        originalOnError?.(error);
      };

      // Send audio message
      socket.send(JSON.stringify({
        type: "audio",
        data: base64Audio
      }));

      console.log("📡 Sent complete audio:", audioData instanceof ArrayBuffer ? audioData.byteLength : audioData.size, "bytes");

    } catch (error) {
      reject(error);
    }
  });
}

// Utility function to convert base64 audio to playable format
export function playAudioResponse(base64Audio: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Convert base64 to blob
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error("Failed to play audio"));
      };
      
      audio.play();
    } catch (error) {
      reject(error);
    }
  });
}

// Utility functions
export function getSocketState(): string {
  if (!socket) return "NOT_CREATED";
  
  switch (socket.readyState) {
    case WebSocket.CONNECTING: return "CONNECTING";
    case WebSocket.OPEN: return "OPEN";
    case WebSocket.CLOSING: return "CLOSING";
    case WebSocket.CLOSED: return "CLOSED";
    default: return "UNKNOWN";
  }
}

export function isSocketConnected(): boolean {
  return socket?.readyState === WebSocket.OPEN;
}

export function isSessionInitialized(): boolean {
  return isSessionReady;
}

export function closeSocket(): void {
  if (socket) {
    socket.close();
    socket = null;
    isSessionReady = false;
    connectionPromise = null;
    console.log("🔌 Socket connection closed");
  }
}

// Update event handlers after connection
export function updateEventHandlers(newHandlers: Partial<EventHandlers>): void {
  eventHandlers = { ...eventHandlers, ...newHandlers };
}

// Export types for use in other files
export type { WSResponse, EventHandlers };