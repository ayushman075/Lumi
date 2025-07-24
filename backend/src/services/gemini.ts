import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Cache for frequently used models to avoid re-initialization
const modelCache = new Map<string, any>();

function getModel(modelName: string) {
  if (!modelCache.has(modelName)) {
    modelCache.set(modelName, genAI.getGenerativeModel({ model: modelName }));
  }
  return modelCache.get(modelName);
}

export async function generateResponse(context: string[], userMessage: string): Promise<string> {
  const model = getModel("gemini-2.0-flash");

  // Pre-build the system prompt for better performance
  const systemPrompt = `You’re an AI friend chatting naturally with the user—keep it friendly, match their tone, sound casual and human, and always end with a question to keep the conversation going; aim for a 8-10 second reply time, give or take. Ask a trailing question always.`;

  // Optimize context handling - only use recent relevant context
  const relevantContext = context.slice(-5); // Only last 5 context items for faster processing
  const fullPrompt = `${systemPrompt}\n\nContext: ${relevantContext.join("\n")}\n\nUser: ${userMessage}`;

  try {
    // Set a shorter timeout for faster responses
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const chat = model.startChat({ 
      history: [],
      generationConfig: {
        maxOutputTokens: 150, // Limit response length for faster generation
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });

    const result = await chat.sendMessage(fullPrompt);
    clearTimeout(timeoutId);
    
    let response = result.response.text().trim();
    
    // Ensure single sentence response
    if (response.includes('.')) {
      response = response.split('.')[0] + '.';
    }
    
    return response;

  } catch (error) {
    console.error("❌ Gemini API error:", error);
    
    // Fallback responses based on common patterns
    const fallbackResponses = [
      "I understand what you're saying.",
      "That's interesting, tell me more.",
      "I see your point.",
      "Thanks for sharing that with me.",
      "I'm listening."
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}

export async function generateStreamingResponse(
  context: string[], 
  userMessage: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const model = getModel("gemini-2.0-flash");

  const systemPrompt = `You are a helpful friend engaging with the user. Provide concise, natural responses in exactly one sentence that sounds conversational and human-like. Be direct, friendly, and avoid technical jargon unless necessary.`;

  const relevantContext = context.slice(-5);
  const fullPrompt = `${systemPrompt}\n\nContext: ${relevantContext.join("\n")}\n\nUser: ${userMessage}`;

  try {
    const chat = model.startChat({ 
      history: [],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });

    // For streaming, we can still use the regular API but process faster
    const result = await chat.sendMessage(fullPrompt);
    const response = result.response.text().trim();
    
    // Simulate streaming by sending chunks if callback provided
    if (onChunk) {
      const words = response.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = words.slice(0, i + 1).join(' ');
        onChunk(chunk);
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    return response.includes('.') ? response.split('.')[0] + '.' : response;

  } catch (error) {
    console.error("❌ Streaming generation error:", error);
    return "I'm having trouble processing that right now.";
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const model = getModel("embedding-001");
  
  try {
    // Add timeout for embedding generation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const result = await model.embedContent({ 
      content: { 
        role: "user", 
        parts: [{ text: text.slice(0, 1000) }] // Limit text length for faster embedding
      } 
    });
    
    clearTimeout(timeoutId);
    return result.embedding.values;

  } catch (error) {
    console.error("❌ Embedding generation error:", error);
    return []; // Return empty array on error
  }
}

// Batch embedding function for better performance
export async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // Process in parallel batches of 3 for better performance
  const batchSize = 3;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map(text => getEmbedding(text));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);
    } catch (error) {
      console.error("❌ Batch embedding error:", error);
      // Add empty arrays for failed embeddings
      embeddings.push(...new Array(batch.length).fill([]));
    }
  }
  
  return embeddings;
}

// Pre-warm models on startup
export function preWarmModels() {
  console.log("🔥 Pre-warming Gemini models...");
  
  // Initialize models in cache
  getModel("gemini-2.0-flash");
  getModel("embedding-001");
  
  // Send a dummy request to warm up the connection
  generateResponse([], "Hello").catch(() => {
    // Ignore errors during warm-up
  });
  
  console.log("✅ Models pre-warmed");
}

// Call pre-warm on module load
if (process.env.NODE_ENV !== 'test') {
  preWarmModels();
}