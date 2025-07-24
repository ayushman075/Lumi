import axios from "axios";
import FormData from "form-data";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY!;
const CHARACTER_ID = "Pedro_ProfessionalLook_public"; // customize per friend

export async function sendToHeygen(audio: Buffer, text: string): Promise<string> {
  try {
    // Step 1: Create video using the correct endpoint and structure
    const videoPayload = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: CHARACTER_ID,
            avatar_style: "normal"
          },
          voice: {
            type: "text", // For text-to-speech
            input_text: text,
            voice_id: "119caed25533477ba63822d5d1552d25", // Default voice ID - you should get this from /v2/voices
            speed: 1.0
          }
        }
      ],
      dimension: {
        width: 1280,
        height: 720
      }
    };

    // Create video
    const createResponse = await axios.post(
      "https://api.heygen.com/v2/video/generate", // Correct endpoint
      videoPayload,
      {
        headers: {
          "X-Api-Key": HEYGEN_API_KEY, // Correct header format
          "Content-Type": "application/json"
        }
      }
    );

    const videoId = createResponse.data.data.video_id;
    console.log("Video creation started, ID:", videoId);

    // Step 2: Poll for completion
    return await pollVideoStatus(videoId);
    
  } catch (error) {
    console.error("Error creating video:", error);
    throw error;
  }
}



// First, upload the audio file to get a URL
async function uploadAudioToHeyGen(audioBuffer: Buffer): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.wav',
      contentType: 'audio/wav'
    });

    const uploadResponse = await axios.post(
      'https://api.heygen.com/v1/asset',
      formData,
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          ...formData.getHeaders()
        }
      }
    );

    if (uploadResponse.data.code === 100) {
      return uploadResponse.data.data.url;
    } else {
      throw new Error(`Audio upload failed: ${uploadResponse.data.message}`);
    }
  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
}




// Upload TTS audio buffer to HeyGen
async function uploadTTSBufferToHeyGen(audioBuffer: Buffer, audioFormat: string = 'wav'): Promise<string> {
  try {
    // Determine content type based on format
    const contentTypeMap: { [key: string]: string } = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'mpeg': 'audio/mpeg',
      'ogg': 'audio/ogg',
      'webm': 'audio/webm'
    };
    
    const contentType = contentTypeMap[audioFormat.toLowerCase()] || 'audio/wav';
    
    console.log(`Uploading ${audioBuffer.length} bytes of ${audioFormat} audio to HeyGen...`);

    // Use the correct upload endpoint and send the buffer directly
    const uploadResponse = await axios.post(
      'https://upload.heygen.com/v1/asset', // Fixed: Use upload.heygen.com instead of api.heygen.com
      audioBuffer, // Send buffer directly, not as FormData
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': contentType // Set the correct content type
        },
        timeout: 30000 // 30 second timeout for upload
      }
    );

    if (uploadResponse.data.code === 100) {
      console.log('Audio upload successful:', uploadResponse.data.data);
      return uploadResponse.data.data.url;
    } else {
      throw new Error(`Audio upload failed: ${uploadResponse.data.message || uploadResponse.data.msg}`);
    }
  } catch (error) {
    console.error('Error uploading TTS buffer:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}

export async function sendToHeygenWithTTSBuffer(ttsBuffer: Buffer, text: string, audioFormat: string = 'wav'): Promise<string> {
  try {
    // Step 1: Upload the TTS buffer to get a URL
    console.log('Uploading TTS buffer to HeyGen...');
    const audioUrl = await uploadTTSBufferToHeyGen(ttsBuffer, audioFormat);
    console.log('TTS audio uploaded successfully:', audioUrl);

    // Step 2: Create video with the uploaded audio URL
    const videoPayload = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: CHARACTER_ID,
            avatar_style: "normal"
          },
          voice: {
            type: "audio",
            audio_url: audioUrl, // Using the uploaded TTS audio URL
            speed: 1.0
          }
        }
      ],
      dimension: {
        width: 1280,
        height: 720
      }
    };

    console.log('Creating video with TTS audio...');

    const createResponse = await axios.post(
      "https://api.heygen.com/v2/video/generate", // This endpoint is correct
      videoPayload,
      {
        headers: {
          "X-Api-Key": HEYGEN_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    if (createResponse.data.code === 100) {
      const videoId = createResponse.data.data.video_id;
      console.log('Video creation initiated with TTS audio:', videoId);
      return await pollVideoStatus(videoId);
    } else {
      throw new Error(`Video creation failed: ${createResponse.data.message || createResponse.data.msg}`);
    }
    
  } catch (error) {
    console.error("Error creating video with TTS buffer:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}

async function pollVideoStatus(videoId: string): Promise<string> {
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  const pollInterval = 5000; // 5 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const statusResponse = await axios.get(
        `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
        {
          headers: {
            "X-Api-Key": HEYGEN_API_KEY,
            "Accept": "application/json"
          }
        }
      );

      const status = statusResponse.data.data.status;
      console.log(`Video status (attempt ${attempt + 1}):`, status);

      if (status === "completed") {
        const videoUrl = statusResponse.data.data.video_url;
        console.log("Video generation completed:", videoUrl);
        return videoUrl;
      } else if (status === "failed") {
        const error = statusResponse.data.data.error;
        throw new Error(`Video generation failed: ${error?.message || 'Unknown error'}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      console.error(`Error polling video status (attempt ${attempt + 1}):`, error);
      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error("Video generation timed out");
}

// Helper function to convert TTS buffer to specific format if needed
export function convertTTSBuffer(ttsBuffer: Buffer, fromFormat: string, toFormat: string): Buffer {
  // This is a placeholder - you might need to use a library like ffmpeg-static
  // or implement actual audio conversion based on your TTS output format
  console.log(`Converting audio from ${fromFormat} to ${toFormat}`);
  
  // If no conversion needed, return original buffer
  if (fromFormat.toLowerCase() === toFormat.toLowerCase()) {
    return ttsBuffer;
  }
  
  // For now, return original buffer
  // In a real implementation, you'd use audio processing libraries
  console.warn('Audio conversion not implemented, using original buffer');
  return ttsBuffer;
}



export async function sendToHeygenWithAudio(audio: Buffer, text: string): Promise<string> {
  try {
    // Step 1: Upload the audio file to get a URL
    console.log('Uploading audio to HeyGen...');
    const audioUrl = await uploadAudioToHeyGen(audio);
    console.log('Audio uploaded successfully:', audioUrl);

    // Step 2: Create video with the uploaded audio URL
    const videoPayload = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: CHARACTER_ID,
            avatar_style: "normal"
          },
          voice: {
            type: "audio",
            audio_url: audioUrl, // Now using the actual uploaded audio URL
            speed: 1.0
          }
        }
      ],
      dimension: {
        width: 1280,
        height: 720
      }
    };

    console.log('Creating video with payload:', JSON.stringify(videoPayload, null, 2));

    const createResponse = await axios.post(
      "https://api.heygen.com/v2/video/generate",
      videoPayload,
      {
        headers: {
          "X-Api-Key": HEYGEN_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    if (createResponse.data.code === 100) {
      const videoId = createResponse.data.data.video_id;
      console.log('Video creation initiated:', videoId);
      return await pollVideoStatus(videoId);
    } else {
      throw new Error(`Video creation failed: ${createResponse.data.message}`);
    }
    
  } catch (error) {
    console.error("Error creating video with audio:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}



// Alternative: Use text-to-speech instead of audio upload
export async function sendToHeygenWithText(text: string): Promise<string> {
  try {
    const videoPayload = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: CHARACTER_ID,
            avatar_style: "normal"
          },
          voice: {
            type: "text",
            input_text: text,
            voice_id: "1bd001e7e50f421d891986aad5158bc8", // Default English voice
            speed: 1.0
          }
        }
      ],
      dimension: {
        width: 1280,
        height: 720
      }
    };

    const createResponse = await axios.post(
      "https://api.heygen.com/v2/video/generate",
      videoPayload,
      {
        headers: {
          "X-Api-Key": HEYGEN_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    if (createResponse.data.code === 100) {
      const videoId = createResponse.data.data.video_id;
      return await pollVideoStatus(videoId);
    } else {
      throw new Error(`Video creation failed: ${createResponse.data.message}`);
    }
    
  } catch (error) {
    console.error("Error creating video with text:", error);
    throw error;
  }
}



// Helper function to get available avatars
export async function getAvailableAvatars() {
  try {
    const response = await axios.get(
      "https://api.heygen.com/v2/avatars",
      {
        headers: {
          "X-Api-Key": HEYGEN_API_KEY,
          "Accept": "application/json"
        }
      }
    );
    return response.data.data.avatars;
  } catch (error) {
    console.error("Error fetching avatars:", error);
    throw error;
  }
}

// Helper function to get available voices
export async function getAvailableVoices() {
  try {
    const response = await axios.get(
      "https://api.heygen.com/v2/voices",
      {
        headers: {
          "X-Api-Key": HEYGEN_API_KEY,
          "Accept": "application/json"
        }
      }
    );
    return response.data.data.voices;
  } catch (error) {
    console.error("Error fetching voices:", error);
    throw error;
  }
}