import textToSpeech from "@google-cloud/text-to-speech";

const client = new textToSpeech.TextToSpeechClient();

export async function synthesizeSpeech(text: string): Promise<Buffer> {



  const request = {
    input: { text },
    voice: {
     "languageCode": "en-IN",
    "name": "en-IN-Chirp3-HD-Achernar"
    },
    audioConfig: {
      audioEncoding: "MP3" as const,
      speakingRate: 1.0,
    },
  };

  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent as Buffer;
}
