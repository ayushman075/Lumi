import { useEffect, useState, useRef } from "react";
import {
  Mic,
  Square,
  Wifi,
  WifiOff,
  Loader2,
  MessageSquare,
  X,
  RotateCcw,
  Trash2,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Radio,
  CheckCircle,
  AlertCircle,
  User,
  Bot
} from "lucide-react";

// Import real WebSocket functions instead of mocks
import {
  connectWS,
  initializeSession,
  initializeSessionSimple,
  sendCompleteAudio,
  playAudioResponse,
  closeSocket,
  type EventHandlers
} from "../lib/ws";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

// Types
interface ConversationMessage {
  id: string;
  type: "user" | "ai" | "error" | "system";
  text: string;
  timestamp: number;
  audioBuffer?: string;
}

interface ConnectionStatusProps {
  isConnected: boolean;
  isReady: boolean;
  userId: string;
  friendId: string;
  onRetry: () => void;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: ConversationMessage[];
  currentlyPlaying: string | null;
  onPlayAudio: (messageId: string, audioBuffer: string) => void;
  onClearConversation: () => void;
  isConnected: boolean;
  isReady: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  conversationLength: number;
}

interface AvatarVisualizerProps {
  isRecording: boolean;
  isProcessing: boolean;
  currentlyPlaying: string | null;
  friendId: string;
}

// Connection Status Component
function ConnectionStatus({ isConnected, isReady, userId, friendId, onRetry }: ConnectionStatusProps) {
  const getConnectionStatus = () => {
    if (!isConnected) return {
      color: 'bg-red-500',
      text: 'Disconnected',
      icon: <WifiOff className="w-4 h-4" />
    };
    if (!isReady) return {
      color: 'bg-yellow-500',
      text: 'Initializing...',
      icon: <Loader2 className="w-4 h-4 animate-spin" />
    };
    return {
      color: 'bg-green-500',
      text: 'Connected & Ready',
      icon: <Wifi className="w-4 h-4" />
    };
  };

  const status = getConnectionStatus();

  return (
    <div className="flex items-center justify-between bg-gray-900 border border-purple-800 rounded-xl p-4 mb-6 shadow-md">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${status.color} animate-pulse`}></div>
        <span className="text-sm font-semibold text-gray-200">{status.text}</span>
        {status.icon}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="bg-purple-900/50 px-2 py-1 rounded-full font-mono text-purple-200 flex items-center gap-1 border border-purple-700/50">
          <User className="w-3 h-3 text-purple-300" />
          {userId}
        </span>
        <ChevronRight className="w-3 h-3 text-purple-400" />
        <span className="bg-purple-900/50 px-2 py-1 rounded-full font-mono text-purple-200 flex items-center gap-1 border border-purple-700/50">
          <Bot className="w-3 h-3 text-purple-300" />
          {friendId}
        </span>
      </div>

      {!isConnected && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-gradient-to-r from-purple-700 to-purple-500 text-white rounded-lg hover:from-purple-800 hover:to-purple-600 transition-colors font-medium flex items-center gap-2 shadow"
        >
          <RotateCcw className="w-4 h-4" />
          Reconnect
        </button>
      )}
    </div>
  );
}

// Avatar with Bouncing Bars
function AvatarVisualizer({ isRecording, isProcessing, currentlyPlaying, friendId }: AvatarVisualizerProps) {
  const isActive = isRecording || isProcessing || currentlyPlaying !== null;

  // Generate avatar emoji based on friendId
  const getAvatarEmoji = (id: string) => {
    const avatars = ['🤖', '👨‍💻', '👩‍💻', '🦾', '🧠', '👾', '🤵', '👸'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return avatars[hash % avatars.length];
  };

  const avatar = getAvatarEmoji(friendId);

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Avatar */}
      <div className={`relative transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
        <div className="w-32 h-32 bg-gradient-to-br from-purple-700 to-purple-500 rounded-full flex items-center justify-center text-5xl shadow-2xl border-4 border-gray-700">
          {avatar}
        </div>

        {/* Glow effect when active */}
        {isActive && (
          <div className="absolute inset-0 w-32 h-32 bg-gradient-to-br from-purple-600 to-purple-400 rounded-full animate-pulse opacity-30 blur-lg"></div>
        )}
      </div>

      {/* Status Text */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-50 mb-2 flex items-center justify-center gap-2">
          <Bot className="w-6 h-6 text-purple-400" />
          {friendId.charAt(0).toUpperCase() + friendId.slice(1)}
        </h2>
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          {isRecording ? (
            <>
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="text-red-300">Listening...</span>
            </>
          ) : isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
              <span className="text-yellow-300">Processing...</span>
            </>
          ) : currentlyPlaying ? (
            <>
              <Volume2 className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300">Speaking...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Ready to chat</span>
            </>
          )}
        </div>
      </div>

      {/* Bouncing Bars */}
      {isActive && (
        <div className="flex items-end justify-center gap-1 h-16">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={`w-2 rounded-full transition-all duration-150 ${
                isRecording ? 'bg-red-500' :
                isProcessing ? 'bg-yellow-500' :
                'bg-purple-500' // Changed from green to purple for speaking
              }`}
              style={{
                height: `${Math.random() * 40 + 20}px`,
                animation: `bounce 0.8s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`
              }}
            ></div>
          ))}
        </div>
      )}

      {/* Recording Timer */}
      {isRecording && (
        <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2 text-red-400">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <Radio className="w-4 h-4" />
            <span className="text-sm font-mono">Recording...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Chat Sidebar Component
function ChatSidebar({
  isOpen,
  onToggle,
  messages,
  currentlyPlaying,
  onPlayAudio,
  onClearConversation,
  isConnected,
  isReady,
  isRecording,
  isProcessing,
  conversationLength
}: ChatSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="w-3 h-3" />;
      case "ai":
        return <Bot className="w-3 h-3" />;
      case "error":
        return <AlertCircle className="w-3 h-3" />;
      case "system":
        return <CheckCircle className="w-3 h-3" />;
      default:
        return <MessageSquare className="w-3 h-3" />;
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full bg-gray-900 rounded-l-lg shadow-2xl transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } w-96`}>

        {/* Header */}
        <div className="p-4 rounded-tl-lg bg-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-300">
            <MessageSquare className="w-5 h-5" />
            <h3 className="text-lg font-semibold text-gray-50">Chat History</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClearConversation}
              disabled={conversationLength === 0}
              className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                conversationLength > 0
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-purple-900 rounded-md transition-colors text-purple-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 h-[calc(100vh-200px)] custom-scrollbar">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-purple-600" />
              <p>No messages yet</p>
              <p className="text-sm mt-2">Start talking to see your conversation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-sm ${
                      message.type === "user"
                        ? "bg-purple-700 text-white shadow-md" // User message bubble: purple
                        : message.type === "error"
                        ? "bg-red-900 bg-opacity-50 text-red-400 border border-red-700 shadow-md"
                        : message.type === "system"
                        ? "bg-yellow-900 bg-opacity-50 text-yellow-400 border border-yellow-700 shadow-md"
                        : "bg-gray-800 text-gray-200 shadow-md" // AI message bubble: darker gray
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs opacity-75 flex items-center gap-1 text-gray-400">
                            {getMessageIcon(message.type)}
                            {message.type === "user" ? "You" :
                             message.type === "error" ? "Error" :
                             message.type === "system" ? "System" : "AI"}
                          </span>
                          <span className="text-xs opacity-60 text-gray-500">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-gray-100">
                          {message.text}
                        </p>
                      </div>

                      {/* Audio controls for AI messages */}
                      {message.type === "ai" && message.audioBuffer && (
                        <button
                          onClick={() => onPlayAudio(message.id, message.audioBuffer!)}
                          disabled={currentlyPlaying === message.id}
                          className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors"
                          title="Play audio response"
                        >
                          {currentlyPlaying === message.id ? (
                            <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-gray-400 hover:text-purple-300" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="p-4 rounded-bl-lg bg-gray-900">
          <div className="text-xs text-gray-400">
            <div className="font-semibold mb-2 flex items-center gap-1 text-purple-300">
              <CheckCircle className="w-3 h-3" />
              Debug Status
            </div>
            <div className="grid grid-cols-2 gap-1 text-gray-300">
              <div className="flex items-center gap-1">
                <span>Connected:</span>
                {isConnected ? <CheckCircle className="w-3 h-3 text-green-400" /> : <X className="w-3 h-3 text-red-400" />}
              </div>
              <div className="flex items-center gap-1">
                <span>Ready:</span>
                {isReady ? <CheckCircle className="w-3 h-3 text-green-400" /> : <X className="w-3 h-3 text-red-400" />}
              </div>
              <div className="flex items-center gap-1">
                <span>Recording:</span>
                {isRecording ? <Radio className="w-3 h-3 text-red-400" /> : <X className="w-3 h-3 text-gray-400" />}
              </div>
              <div className="flex items-center gap-1">
                <span>Processing:</span>
                {isProcessing ? <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" /> : <CheckCircle className="w-3 h-3 text-green-400" />}
              </div>
              <div>Messages: {messages.length}</div>
              <div className="flex items-center gap-1">
                <span>Playing:</span>
                {currentlyPlaying ? <Volume2 className="w-3 h-3 text-purple-400" /> : <X className="w-3 h-3 text-gray-400" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-40 bg-gray-900 border border-purple-800 text-purple-300 p-3 rounded-l-lg hover:bg-purple-900 transition-all duration-300 shadow-lg ${
          isOpen ? 'right-96' : 'right-0'
        }`}
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Custom Scrollbar Styling (add to global CSS if not already) */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937; /* gray-800 */
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #8b5cf6; /* purple-500 */
          border-radius: 10px;
          border: 2px solid #1f2937; /* gray-800 */
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a78bfa; /* purple-400 */
        }
      `}</style>
    </>
  );
}

// Main Audio Chat Component
export function Talker({
  friendId = "lumi-ai"
}: { userId?: string; friendId?: string }) {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSignedIn, user, isLoaded } = useUser();

  const [userId,setUserId] = useState('user123');

  useEffect(()=>{
    if(isLoaded && isSignedIn){
        setUserId(user.username||user.id)
    }
  },[isSignedIn,isLoaded])

  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isInitializedRef = useRef(false);

  const maxRecordingTime = 5;

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initializeWebSocket = async () => {
      try {
        console.log("🚀 Initializing Audio Chat...");

        const welcomeMessage: ConversationMessage = {
          id: `system-${Date.now()}`,
          type: "system",
          text: "🚀 Connecting to AI... Please wait while we establish the connection.",
          timestamp: Date.now(),
        };
        setConversation([welcomeMessage]);

        const handlers: EventHandlers = {
          onConnect: () => {
            console.log("🟢 Connected to WebSocket");
            setIsConnected(true);
            setError("");

            const connectMessage: ConversationMessage = {
              id: `system-${Date.now()}`,
              type: "system",
              text: "✅ Connected successfully! Initializing session...",
              timestamp: Date.now(),
            };
            setConversation(prev => [...prev, connectMessage]);
          },

          onDisconnect: () => {
            console.log("🔴 Disconnected from WebSocket");
            setIsConnected(false);
            setIsReady(false);

            const disconnectMessage: ConversationMessage = {
              id: `system-${Date.now()}`,
              type: "error",
              text: "🔴 Connection lost. Click 'Reconnect' to try again.",
              timestamp: Date.now(),
            };
            setConversation(prev => [...prev, disconnectMessage]);
          },

          onReady: (sessionId: string) => {
            console.log("✅ Session ready:", sessionId);
            setIsReady(true);
            setError("");

            const readyMessage: ConversationMessage = {
              id: `system-${Date.now()}`,
              type: "system",
              text: "🎉 Ready to chat! You can now start talking.",
              timestamp: Date.now(),
            };
            setConversation(prev => [...prev, readyMessage]);
          },

          onProcessing: (message: string) => {
            console.log("⚙️ Processing:", message);
            setIsProcessing(true);
          },

          onResponse: (response: any) => {
            console.log("📤 Response received:", response);
            setIsProcessing(false);

            const timestamp = Date.now();
            const newMessages: ConversationMessage[] = [];

            if (response.transcript && response.transcript.trim()) {
              const userMessage: ConversationMessage = {
                id: `user-${timestamp}`,
                type: "user",
                text: response.transcript,
                timestamp: timestamp - 1,
              };
              newMessages.push(userMessage);
            }

            const aiMessage: ConversationMessage = {
              id: `ai-${timestamp}`,
              type: "ai",
              text: response.text,
              timestamp,
              audioBuffer: response.audioBuffer || undefined,
            };
            newMessages.push(aiMessage);

            setConversation(prev => [...prev, ...newMessages]);

            if (response.audioBuffer) {
              setTimeout(() => {
                playAudioForMessage(`ai-${timestamp}`, response.audioBuffer!);
              }, 500);
            }
          },

          onError: (error: any) => {
            console.error("❌ WebSocket error:", error);
            setError(error.message);
            setIsProcessing(false);

            const errorMessage: ConversationMessage = {
              id: `error-${Date.now()}`,
              type: "error",
              text: `❌ ${error.message}`,
              timestamp: Date.now(),
            };
            setConversation(prev => [...prev, errorMessage]);
          }
        };

        await connectWS(handlers);

        try {
          await initializeSession(userId, friendId);
        } catch (initError) {
          console.log("⚠️ Normal init failed, trying simple init:", initError);
          await initializeSessionSimple(userId, friendId);
        }

        console.log("🎉 Audio Chat fully initialized!");

      } catch (err) {
        console.error("❌ Failed to initialize:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to connect: ${errorMessage}`);

        const errorMsg: ConversationMessage = {
          id: `error-${Date.now()}`,
          type: "error",
          text: `❌ Connection failed: ${errorMessage}. Make sure the server is running on ws://lumi-vtx4.onrender.com`,
          timestamp: Date.now(),
        };
        setConversation(prev => [...prev, errorMsg]);
      }
    };

    initializeWebSocket();

    return () => {
      console.log("🧹 Cleaning up...");
      if (!isInitializedRef.current) { // Ensure this only runs on actual unmount, not re-renders from state changes
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
        if (recordingTimeIntervalRef.current) clearInterval(recordingTimeIntervalRef.current);
        closeSocket();
      }
    };
  }, [userId, friendId]); // userId and friendId are dependencies now

  const playAudioForMessage = async (messageId: string, audioBuffer: string) => {
    try {
      setCurrentlyPlaying(messageId);
      await playAudioResponse(audioBuffer);
      setCurrentlyPlaying(null);
    } catch (error) {
      console.error("❌ Failed to play audio:", error);
      setCurrentlyPlaying(null);
    }
  };

  const setupMediaRecorder = async () => {
    try {
      console.log("🎤 Setting up microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      streamRef.current = stream;

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];

      let selectedMimeType = 'audio/webm';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstart = () => {
        setIsRecording(true);
        setError("");
        audioChunksRef.current = [];
        setRecordingTime(0);

        recordingTimeIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);

        recordingTimerRef.current = setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, maxRecordingTime * 1000);
      };

      recorder.onstop = () => {
        setIsRecording(false);

        if (recordingTimerRef.current) {
          clearTimeout(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        if (recordingTimeIntervalRef.current) {
          clearInterval(recordingTimeIntervalRef.current);
          recordingTimeIntervalRef.current = null;
        }

        setTimeout(() => {
          sendCompleteAudioFile();
        }, 100);
      };

      recorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setError('Recording error occurred');
        setIsRecording(false);

        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
        if (recordingTimeIntervalRef.current) clearInterval(recordingTimeIntervalRef.current);
      };

      setMediaRecorder(recorder);
      console.log('✅ Microphone ready!');

    } catch (err) {
      console.error('❌ Failed to setup microphone:', err);
      setError('Failed to access microphone. Please allow microphone permissions.');
    }
  };

  const sendCompleteAudioFile = async () => {
    if (audioChunksRef.current.length === 0) {
      setError('No audio recorded');
      return;
    }

    try {
      const completeAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('📡 Sending audio:', completeAudioBlob.size, 'bytes');

      await sendCompleteAudio(completeAudioBlob);
      audioChunksRef.current = [];

    } catch (err) {
      console.error('❌ Failed to send audio:', err);
      setError('Failed to process audio: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const startRecording = async () => {
    if (!isConnected || !isReady) {
      setError('Please wait for connection to be ready');
      return;
    }

    if (!mediaRecorder) {
      await setupMediaRecorder();
      return;
    }

    if (mediaRecorder && !isRecording) {
      mediaRecorder.start(1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setCurrentlyPlaying(null);
  };

  const retryConnection = async () => {
    setError("");
    setIsConnected(false);
    setIsReady(false);

    try {
      closeSocket();
      await new Promise(resolve => setTimeout(resolve, 1000));
      isInitializedRef.current = false;

      window.location.reload();

    } catch (err) {
      console.error("❌ Retry failed:", err);
      setError("Retry failed. Please check if the server is running.");
    }
  };

  const canRecord = isConnected && isReady && !isRecording && !isProcessing;
  const canStop = isRecording;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-50 relative overflow-hidden font-sans">
      {/* Dynamic Background Pattern (from LandingPage) */}
      <div className="absolute inset-0 z-0 opacity-10"
           style={{
             backgroundImage: `radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%), /* Purple-500 */
                               linear-gradient(to bottom right, rgba(168, 85, 247, 0.05) 0%, transparent 50%), /* Purple-600 */
                               linear-gradient(to top left, rgba(139, 92, 246, 0.05) 0%, transparent 50%)`, /* Purple-500 */
             backgroundSize: '150% 150%',
             animation: 'pan-background 60s linear infinite alternate',
           }}>
      </div>

      <div className={`container mx-auto px-6 py-8 min-h-screen flex flex-col justify-center transition-all duration-300 relative z-10 ${
        sidebarOpen ? 'mr-96' : 'mr-0'
      }`}>

        {/* Connection Status */}
        <ConnectionStatus
          isConnected={isConnected}
          isReady={isReady}
          userId={userId}
          friendId={friendId}
          onRetry={retryConnection}
        />

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 bg-opacity-50 border border-red-700 rounded-xl flex items-center gap-3 shadow-md">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-400 font-medium">{error}</p>
              {error.includes("connect") && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Make sure your WebSocket server is running on ws://lumi-vtx4.onrender.com
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full space-y-8">

          {/* Avatar with Visualizer */}
          <AvatarVisualizer
            isRecording={isRecording}
            isProcessing={isProcessing}
            currentlyPlaying={currentlyPlaying}
            friendId={friendId}
          />

          {/* Control Buttons */}
          <div className="flex gap-6">
            <button
              onClick={startRecording}
              disabled={!canRecord}
              className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 flex items-center gap-3 ${
                canRecord
                  ? 'bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-800 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-700 cursor-not-allowed text-gray-500 shadow-md'
              }`}
            >
              <Mic className="w-6 h-6" />
              {isRecording ? 'Recording...' : 'Speak'}
            </button>

            <button
              onClick={stopRecording}
              disabled={!canStop}
              className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 flex items-center gap-3 ${
                canStop
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-700 cursor-not-allowed text-gray-500 shadow-md'
              }`}
            >
              <Square className="w-6 h-6" />
              Stop
            </button>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        messages={conversation}
        currentlyPlaying={currentlyPlaying}
        onPlayAudio={playAudioForMessage}
        onClearConversation={clearConversation}
        isConnected={isConnected}
        isReady={isReady}
        isRecording={isRecording}
        isProcessing={isProcessing}
        conversationLength={conversation.length}
      />

      {/* CSS for animations and custom scrollbar */}
      <style jsx>{`
        @keyframes pan-background {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
            transform: translate3d(0, -15px, 0);
          }
          70% {
            animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
            transform: translate3d(0, -7px, 0);
          }
          90% {
            transform: translate3d(0, -2px, 0);
          }
        }
      `}</style>
    </div>
  );
}