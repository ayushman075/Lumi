import { Gender, Tone, Temperament } from "@prisma/client";

interface ProfileImage {
  id: string;
  url: string;
  gender: Gender;
  features: {
    // Physical characteristics
    hairColor: 'blonde' | 'brown' | 'black' | 'red' | 'gray';
    eyeColor: 'blue' | 'brown' | 'green' | 'hazel' | 'gray';
    skinTone: 'light' | 'medium' | 'dark';
    age: 'young' | 'middle' | 'mature';
    
    // Personality-related visual cues
    expression: 'cheerful' | 'serious' | 'mysterious' | 'gentle' | 'confident';
    style: 'casual' | 'professional' | 'artistic' | 'sporty' | 'elegant';
    
    // Trait indicators
    traits: {
      humor: number; // 0-10 based on how the image conveys humor/playfulness
      empathy: number; // 0-10 based on warmth in expression
      creativity: number; // 0-10 based on artistic/unique elements
      formality: number; // 0-10 based on professional appearance
      optimism: number; // 0-10 based on positive expression
      confidence: number; // 0-10 based on posture/expression
    };
  };
}

interface FriendCharacteristics {
  gender: Gender;
  tone: Tone;
  temperament: Temperament;
  personalityTraits: {
    humor: number;
    empathy: number;
    sarcasm: number;
    formality: number;
    curiosity: number;
    patience: number;
    creativity: number;
    optimism: number;
  };
}

// Predefined image database with features
const PROFILE_IMAGES: ProfileImage[] = [
  // Male Images
  {
    id: "male_1",
    url: "/images/profiles/male_professional.jpg",
    gender: "MALE",
    features: {
      hairColor: "brown",
      eyeColor: "brown",
      skinTone: "medium",
      age: "middle",
      expression: "confident",
      style: "professional",
      traits: {
        humor: 4,
        empathy: 6,
        creativity: 5,
        formality: 9,
        optimism: 7,
        confidence: 9
      }
    }
  },
  {
    id: "male_2",
    url: "/images/profiles/male_casual_cheerful.jpg",
    gender: "MALE",
    features: {
      hairColor: "blonde",
      eyeColor: "blue",
      skinTone: "light",
      age: "young",
      expression: "cheerful",
      style: "casual",
      traits: {
        humor: 9,
        empathy: 8,
        creativity: 7,
        formality: 3,
        optimism: 9,
        confidence: 7
      }
    }
  },
  {
    id: "male_3",
    url: "/images/profiles/male_artistic.jpg",
    gender: "MALE",
    features: {
      hairColor: "black",
      eyeColor: "green",
      skinTone: "medium",
      age: "young",
      expression: "mysterious",
      style: "artistic",
      traits: {
        humor: 6,
        empathy: 7,
        creativity: 10,
        formality: 2,
        optimism: 6,
        confidence: 8
      }
    }
  },
  {
    id: "male_4",
    url: "/images/profiles/male_gentle.jpg",
    gender: "MALE",
    features: {
      hairColor: "brown",
      eyeColor: "hazel",
      skinTone: "light",
      age: "middle",
      expression: "gentle",
      style: "casual",
      traits: {
        humor: 5,
        empathy: 10,
        creativity: 6,
        formality: 4,
        optimism: 8,
        confidence: 6
      }
    }
  },
  {
    id: "male_5",
    url: "/images/profiles/male_sporty.jpg",
    gender: "MALE",
    features: {
      hairColor: "black",
      eyeColor: "brown",
      skinTone: "dark",
      age: "young",
      expression: "confident",
      style: "sporty",
      traits: {
        humor: 7,
        empathy: 6,
        creativity: 5,
        formality: 3,
        optimism: 8,
        confidence: 10
      }
    }
  },
  
  // Female Images
  {
    id: "female_1",
    url: "/images/profiles/female_professional.jpg",
    gender: "FEMALE",
    features: {
      hairColor: "brown",
      eyeColor: "brown",
      skinTone: "medium",
      age: "middle",
      expression: "confident",
      style: "professional",
      traits: {
        humor: 5,
        empathy: 7,
        creativity: 6,
        formality: 9,
        optimism: 7,
        confidence: 9
      }
    }
  },
  {
    id: "female_2",
    url: "/images/profiles/female_cheerful.jpg",
    gender: "FEMALE",
    features: {
      hairColor: "blonde",
      eyeColor: "blue",
      skinTone: "light",
      age: "young",
      expression: "cheerful",
      style: "casual",
      traits: {
        humor: 9,
        empathy: 9,
        creativity: 7,
        formality: 2,
        optimism: 10,
        confidence: 8
      }
    }
  },
  {
    id: "female_3",
    url: "/images/profiles/female_artistic.jpg",
    gender: "FEMALE",
    features: {
      hairColor: "red",
      eyeColor: "green",
      skinTone: "light",
      age: "young",
      expression: "mysterious",
      style: "artistic",
      traits: {
        humor: 6,
        empathy: 8,
        creativity: 10,
        formality: 1,
        optimism: 6,
        confidence: 7
      }
    }
  },
  {
    id: "female_4",
    url: "/images/profiles/female_elegant.jpg",
    gender: "FEMALE",
    features: {
      hairColor: "black",
      eyeColor: "brown",
      skinTone: "dark",
      age: "middle",
      expression: "gentle",
      style: "elegant",
      traits: {
        humor: 4,
        empathy: 9,
        creativity: 8,
        formality: 8,
        optimism: 7,
        confidence: 8
      }
    }
  },
  {
    id: "female_5",
    url: "/images/profiles/female_sporty.jpg",
    gender: "FEMALE",
    features: {
      hairColor: "brown",
      eyeColor: "hazel",
      skinTone: "medium",
      age: "young",
      expression: "confident",
      style: "sporty",
      traits: {
        humor: 8,
        empathy: 7,
        creativity: 6,
        formality: 3,
        optimism: 9,
        confidence: 10
      }
    }
  }
];

/**
 * Calculates the compatibility score between friend characteristics and a profile image
 */
function calculateCompatibilityScore(
  friendCharacteristics: FriendCharacteristics,
  profileImage: ProfileImage
): number {
  let score = 0;
  const weights = {
    gender: 100, // Must match
    personalityTraits: 60,
    tone: 25,
    temperament: 15
  };

  // Gender must match (mandatory)
  if (friendCharacteristics.gender !== profileImage.gender) {
    return 0;
  }
  score += weights.gender;

  // Personality traits matching (most important)
  const friendTraits = friendCharacteristics.personalityTraits;
  const imageTraits = profileImage.features.traits;
  
  // Only use traits that exist in both friendTraits and imageTraits
  const traitKeys: Array<'humor' | 'empathy' | 'creativity' | 'formality' | 'optimism'> = [
    'humor', 'empathy', 'creativity', 'formality', 'optimism'
  ];
  
  let traitScore = 0;
  let usedTraitCount = 0;
  traitKeys.forEach(trait => {
    if (
      friendTraits[trait] !== undefined &&
      imageTraits[trait] !== undefined
    ) {
      // Calculate similarity (closer values = higher score)
      const difference = Math.abs(friendTraits[trait] - imageTraits[trait]);
      const similarity = 10 - difference; // 0-10 scale
      traitScore += similarity;
      usedTraitCount++;
    }
  });
  
  // Average trait score
  const avgTraitScore = usedTraitCount > 0 ? traitScore / usedTraitCount : 0;
  score += (avgTraitScore / 10) * weights.personalityTraits;

  // Tone matching
  const toneScore = getToneScore(friendCharacteristics.tone, profileImage.features);
  score += toneScore * weights.tone;

  // Temperament matching
  const temperamentScore = getTemperamentScore(friendCharacteristics.temperament, profileImage.features);
  score += temperamentScore * weights.temperament;

  return Math.round(score * 100) / 100;
}

/**
 * Maps tone to visual characteristics
 */
function getToneScore(tone: Tone, features: ProfileImage['features']): number {
  const toneMapping: Record<Tone, { expression: string[]; style: string[]; confidence: number }> = {
    FRIENDLY: {
      expression: ['cheerful', 'gentle'],
      style: ['casual', 'sporty'],
      confidence: 7
    },
    PROFESSIONAL: {
      expression: ['confident', 'serious'],
      style: ['professional', 'elegant'],
      confidence: 8
    },
    CASUAL: {
      expression: ['cheerful', 'gentle'],
      style: ['casual', 'sporty'],
      confidence: 6
    },
    EMOTIONAL: {
      expression: ['cheerful'],
      style: ['casual', 'artistic'],
      confidence: 7
    },
    FORMAL: {
      expression: ['gentle', 'cheerful'],
      style: ['casual', 'elegant'],
      confidence: 6
    }
  };

  const mapping = toneMapping[tone];
  if (!mapping) return 0;

  let score = 0;
  
  // Expression match
  if (mapping.expression.includes(features.expression)) {
    score += 0.4;
  }
  
  // Style match
  if (mapping.style.includes(features.style)) {
    score += 0.3;
  }
  
  // Confidence level match
  const confidenceDiff = Math.abs(mapping.confidence - features.traits.confidence);
  score += (1 - confidenceDiff / 10) * 0.3;

  return Math.max(0, Math.min(1, score));
}

/**
 * Maps temperament to visual characteristics
 */
function getTemperamentScore(temperament: Temperament, features: ProfileImage['features']): number {
  const temperamentMapping: Record<Temperament, { expression: string[]; traits: Partial<ProfileImage['features']['traits']> }> = {
    CALM: {
      expression: ['gentle', 'serious'],
      traits: { empathy: 7, confidence: 6 }
    },
    HUMOROUS: {
      expression: ['cheerful', 'confident'],
      traits: { humor: 7, optimism: 8, confidence: 8 }
    },
    SUPPORTIVE: {
      expression: ['serious', 'mysterious'],
      traits: { creativity: 7, empathy: 7 }
    },
    NEUTRAL: {
      expression: ['cheerful'],
      traits: { humor: 8, creativity: 7, optimism: 8 }
    },
    AGGRESSIVE: {
      expression: ['serious', 'confident'],
      traits: { formality: 7, confidence: 8 }
    }
  };

  const mapping = temperamentMapping[temperament];
  if (!mapping) return 0;

  let score = 0;
  
  // Expression match
  if (mapping.expression.includes(features.expression)) {
    score += 0.5;
  }
  
  // Trait alignment
  let traitScore = 0;
  let traitCount = 0;
  
  Object.entries(mapping.traits).forEach(([trait, expectedValue]) => {
    if (expectedValue !== undefined) {
      const actualValue = features.traits[trait as keyof typeof features.traits];
      if (actualValue !== undefined) {
        const diff = Math.abs(expectedValue - actualValue);
        traitScore += (10 - diff) / 10;
        traitCount++;
      }
    }
  });
  
  if (traitCount > 0) {
    score += (traitScore / traitCount) * 0.5;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Main function to get the best fitting profile image
 */
export function getBestFitProfileImage(
  friendCharacteristics: FriendCharacteristics
): { image: ProfileImage; score: number; alternatives: Array<{ image: ProfileImage; score: number }> } {
  // Filter images by gender first
  const genderMatchedImages = PROFILE_IMAGES.filter(
    img => img.gender === friendCharacteristics.gender
  );

  if (genderMatchedImages.length === 0) {
    throw new Error(`No images available for gender: ${friendCharacteristics.gender}`);
  }

  // Calculate compatibility scores for all matching images
  const scoredImages = genderMatchedImages.map(image => ({
    image,
    score: calculateCompatibilityScore(friendCharacteristics, image)
  }));

  // Sort by score (highest first)
  scoredImages.sort((a, b) => b.score - a.score);

  const bestMatch = scoredImages[0];
  const alternatives = scoredImages.slice(1, 4); // Top 3 alternatives

  return {
    image: bestMatch.image,
    score: bestMatch.score,
    alternatives
  };
}

/**
 * Get all available profile images with their features (for admin/debugging)
 */
export function getAllProfileImages(): ProfileImage[] {
  return PROFILE_IMAGES;
}

/**
 * Get profile images by gender
 */
export function getProfileImagesByGender(gender: Gender): ProfileImage[] {
  return PROFILE_IMAGES.filter(img => img.gender === gender);
}

/**
 * Utility function to create friend characteristics from database friend object
 */
export function createFriendCharacteristics(friend: {
  gender: Gender;
  tone: Tone;
  temperament: Temperament;
  humor: number;
  empathy: number;
  sarcasm: number;
  formality: number;
  curiosity: number;
  patience: number;
  creativity: number;
  optimism: number;
}): FriendCharacteristics {
  return {
    gender: friend.gender,
    tone: friend.tone,
    temperament: friend.temperament,
    personalityTraits: {
      humor: friend.humor,
      empathy: friend.empathy,
      sarcasm: friend.sarcasm,
      formality: friend.formality,
      curiosity: friend.curiosity,
      patience: friend.patience,
      creativity: friend.creativity,
      optimism: friend.optimism
    }
  };
}

// Example usage function
export function selectProfileImageForFriend(friend: {
  gender: Gender;
  tone: Tone;
  temperament: Temperament;
  humor: number;
  empathy: number;
  sarcasm: number;
  formality: number;
  curiosity: number;
  patience: number;
  creativity: number;
  optimism: number;
}): string {
  const characteristics = createFriendCharacteristics(friend);
  const result = getBestFitProfileImage(characteristics);
  
  console.log(`Selected profile image: ${result.image.id} with score: ${result.score}`);
  console.log(`Alternatives:`, result.alternatives.map(alt => `${alt.image.id} (${alt.score})`));
  
  return result.image.url;
}