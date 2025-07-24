// services/stt.ts
import speech from '@google-cloud/speech';
import fs from 'fs';
import path from 'path';

const client = new speech.SpeechClient();

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    console.log(`🎙️ Transcribing audio buffer of ${audioBuffer.length} bytes`);

    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error("Audio buffer is empty");
    }

    // Check if audio buffer is too small (likely not valid audio)
    if (audioBuffer.length < 1000) {
      console.warn("⚠️ Audio buffer seems too small, might be invalid");
      return "";
    }

    const request = {
      audio: {
        content: audioBuffer.toString('base64'),
      },
      config: {
        encoding: 'WEBM_OPUS' as const, // Match your frontend audio format
        sampleRateHertz: 48000, // Common sample rate for WebM
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        useEnhanced: true,
        model: 'latest_long', // Better for conversation
        // Add these for better accuracy
        enableWordTimeOffsets: false,
        enableWordConfidence: false,
        maxAlternatives: 1,
      },
    };

    console.log("📡 Sending request to Google Speech-to-Text...");
    
    const [response] = await client.recognize(request);
    
    if (!response.results || response.results.length === 0) {
      console.log("🔇 No speech detected in audio");
      return "";
    }

    const transcription = response.results
      .map(result => result.alternatives?.[0]?.transcript || "")
      .join(" ")
      .trim();

    console.log(`✅ Transcription successful: "${transcription}"`);
    return transcription;

  } catch (error) {
    console.error("❌ Speech-to-Text error:", error);
    
    // Log specific error details
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    // Check for specific Google Cloud errors
    if (error && typeof error === 'object' && 'code' in error) {
      const gError = error as any;
      console.error("Google Cloud error code:", gError.code);
      console.error("Google Cloud error details:", gError.details);
      
      // Handle specific error codes
      switch (gError.code) {
        case 16: // UNAUTHENTICATED
          throw new Error("Google Cloud authentication failed. Check your credentials.");
        case 3: // INVALID_ARGUMENT
          throw new Error("Invalid audio format or configuration.");
        case 8: // RESOURCE_EXHAUSTED
          throw new Error("Google Cloud quota exceeded.");
        default:
          throw new Error(`Google Cloud error: ${gError.message || 'Unknown error'}`);
      }
    }

    throw new Error("Failed to transcribe audio");
  }
}

// Alternative: Test function to validate your setup
export async function testSTTSetup(): Promise<void> {
  try {
    // Test with a small dummy audio buffer
    const testBuffer = Buffer.alloc(1024);
    console.log("🧪 Testing STT setup...");
    
    const result = await transcribeAudio(testBuffer);
    console.log("✅ STT setup test completed");
  } catch (error) {
    console.error("❌ STT setup test failed:", error);
    throw error;
  }
}