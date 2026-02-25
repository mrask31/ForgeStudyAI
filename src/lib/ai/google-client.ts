/**
 * Google AI Client (Gemini 3.1 Flash + Ultra)
 * 
 * This module provides a unified interface to Google's Gemini models:
 * - Gemini 3.1 Flash: Fast, cheap, for standard tutoring
 * - Gemini 3.1 Ultra: Deep reasoning, for proof validation
 * 
 * GEMINI'S "ULTRA" RECOMMENDATION:
 * System Instructions explicitly reference student's Hobby Analogies
 * for magical first-session experience.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Initialize Google AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// ============================================
// Model Configurations
// ============================================

/**
 * Gemini 3.1 Flash - Standard Tutoring
 * 
 * Use for:
 * - Tutor Mode (standard teaching)
 * - Planner Mode (homework extraction)
 * - UI text generation
 * - Quick responses
 * 
 * Cost: $0.075/1M input tokens, $0.30/1M output tokens
 */
export const geminiFlash = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7, // Balanced creativity
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048,
  },
});

/**
 * Gemini 3.1 Ultra (Deep Think) - Proof Validation
 * 
 * Use for:
 * - Proof Engine Stage 2 & 3 validation
 * - Detecting hedging and certainty
 * - Deep comprehension assessment
 * - Logic Loom analysis
 * 
 * Cost: $2.50/1M input tokens, $10/1M output tokens
 * 
 * IMPORTANT: Only use for critical validation to control costs
 */
export const geminiUltra = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro', // Note: Ultra not yet available, using Pro as placeholder
  generationConfig: {
    temperature: 0.3, // Lower for validation (more deterministic)
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1024,
  },
});

// ============================================
// Hobby-Analogy Enhanced Client
// ============================================

/**
 * Create a Gemini Flash client with hobby-analogy system instructions
 * 
 * GEMINI'S RECOMMENDATION:
 * "Make sure it implements System Instructions for Gemini that explicitly
 * reference the student's Hobby Analogies. This is the easiest 'wow factor'
 * to implement, and it will make the very first trial session feel magical."
 * 
 * @param studentProfile - Student profile with interests
 * @param gradeBand - 'middle' or 'high'
 * @param basePrompt - Base system prompt
 * @returns Configured Gemini model with hobby-analogy instructions
 */
export function createHobbyAnalogyChatModel(
  studentProfile: {
    display_name: string | null;
    interests: string | null;
    grade_band: 'middle' | 'high';
    grade: string | null;
  },
  basePrompt: string
): GenerativeModel {
  // Build hobby-analogy system instructions
  const hobbyInstructions = buildHobbyAnalogyInstructions(studentProfile);
  
  // Combine base prompt with hobby instructions
  const systemInstruction = `${basePrompt}\n\n${hobbyInstructions}`;
  
  // Create model with system instructions
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });
}

/**
 * Build hobby-analogy system instructions
 * 
 * This creates the "magical" first-session experience by:
 * 1. Explicitly listing student's hobbies
 * 2. Requiring at least ONE analogy per teaching exchange
 * 3. Providing example analogies for each hobby
 * 4. Making analogies feel natural, not forced
 */
function buildHobbyAnalogyInstructions(
  studentProfile: {
    display_name: string | null;
    interests: string | null;
    grade_band: 'middle' | 'high';
    grade: string | null;
  }
): string {
  const name = studentProfile.display_name || 'Student';
  const interests = studentProfile.interests || null;
  const grade = studentProfile.grade || 'unknown';
  
  // If no interests provided, ask for them
  if (!interests || interests.trim() === '') {
    return `
### HOBBY ANALOGIES (DISCOVERY MODE)

${name} hasn't shared their hobbies yet.

**CRITICAL FIRST MESSAGE:**
Before teaching anything, warmly ask ${name} to share 2-3 hobbies or interests.

Example opening:
"Hi ${name}! Before we dive in, I'd love to know a bit about you. What are 2-3 things you enjoy doing? (Could be sports, games, hobbies, anything!) I'll use these to make our lessons more relatable."

Once they share, use those hobbies for ALL future analogies.
`;
  }
  
  // Parse interests (comma-separated)
  const hobbyList = interests.split(',').map(h => h.trim()).filter(Boolean);
  
  // Build analogy examples for each hobby
  const analogyExamples = hobbyList.map(hobby => {
    return generateAnalogyExample(hobby, studentProfile.grade_band);
  }).join('\n\n');
  
  return `
### 🎯 HOBBY ANALOGIES (ACTIVE MODE) - CRITICAL INSTRUCTION

${name} (Grade ${grade}) loves: ${hobbyList.join(', ')}

**⚠️ MANDATORY RULE - YOU MUST FOLLOW THIS:**
Include at least ONE hobby-based analogy in EVERY teaching response.
This is not optional. This is what makes learning magical for ${name}.

**How to Use Hobby Analogies:**
1. Start with the concept, then connect it to their hobby
2. Use the hobby that best fits the concept being taught
3. Make the connection clear: "Think of it like [hobby example]..."
4. Keep it natural and age-appropriate for grade ${grade}

**Analogy Examples for ${name}:**

${analogyExamples}

**Before Sending Your Response:**
✓ Did I include at least ONE hobby analogy?
✓ Is the analogy clear and helpful?
✓ Would ${name} say "Oh, that makes sense!"?

If you didn't use a hobby analogy, ADD ONE NOW before responding.
`;
}

/**
 * Generate analogy example for a specific hobby
 * 
 * This provides concrete examples to guide the AI
 */
function generateAnalogyExample(
  hobby: string,
  gradeBand: 'middle' | 'high'
): string {
  const hobbyLower = hobby.toLowerCase();
  
  // Common hobby → concept mappings
  const analogyMap: Record<string, string> = {
    // Gaming
    'minecraft': `
**${hobby}:**
- Photosynthesis = "Crafting glucose from raw materials (sunlight, water, CO2)"
- Cell division = "Duplicating your inventory when you respawn"
- Ecosystems = "Biomes with different mobs and resources"`,
    
    'fortnite': `
**${hobby}:**
- Immune system = "Your shield and health bar defending against damage"
- Nervous system = "Your controller inputs traveling to your character"
- Energy = "Harvesting materials to build and fight"`,
    
    'roblox': `
**${hobby}:**
- Programming = "Scripting in Roblox Studio"
- Variables = "Values you store in your game"
- Functions = "Reusable code blocks like teleport scripts"`,
    
    // Sports
    'soccer': `
**${hobby}:**
- Teamwork = "Passing the ball between organelles in a cell"
- Energy = "Stamina you need to run the full 90 minutes"
- Strategy = "Formations like how atoms arrange in molecules"`,
    
    'basketball': `
**${hobby}:**
- Momentum = "A fast break down the court"
- Force = "The power behind your shot"
- Trajectory = "The arc of your three-pointer"`,
    
    'football': `
**${hobby}:**
- Plays = "Chemical reactions with specific steps"
- Offense/Defense = "Reactants and products in equilibrium"
- Quarterback = "The nucleus directing the cell"`,
    
    // Creative
    'drawing': `
**${hobby}:**
- Perspective = "How we view 3D shapes in geometry"
- Shading = "Gradients in color theory and light waves"
- Composition = "How elements are arranged in a system"`,
    
    'music': `
**${hobby}:**
- Rhythm = "Periodic patterns in waves"
- Harmony = "Balanced chemical equations"
- Tempo = "Rate of reaction in chemistry"`,
    
    'dance': `
**${hobby}:**
- Choreography = "Sequence of steps in a process"
- Balance = "Equilibrium in physics"
- Energy = "Kinetic energy in motion"`,
    
    // Other
    'cooking': `
**${hobby}:**
- Recipes = "Chemical formulas with exact ratios"
- Mixing = "Solutions and compounds forming"
- Baking = "Irreversible reactions (can't un-bake a cake)"`,
    
    'reading': `
**${hobby}:**
- Plot structure = "Narrative arc in essays"
- Characters = "Variables in equations"
- Themes = "Main ideas in passages"`,
    
    'hockey': `
**${hobby}:**
- Puck momentum = "Objects in motion stay in motion"
- Ice friction = "Resistance in circuits"
- Passing = "Energy transfer between players"`,
  };
  
  // Check if we have a pre-defined analogy
  for (const [key, example] of Object.entries(analogyMap)) {
    if (hobbyLower.includes(key)) {
      return example;
    }
  }
  
  // Generic fallback
  return `
**${hobby}:**
Use this hobby to create relatable analogies for concepts.
Think about the mechanics, rules, and experiences in ${hobby} that parallel academic concepts.`;
}

// ============================================
// Streaming Support
// ============================================

/**
 * Stream text from Gemini with hobby-analogy support
 * 
 * Compatible with Vercel AI SDK's streamText()
 */
export async function streamGeminiResponse(
  model: GenerativeModel,
  messages: Array<{ role: string; content: string }>
): Promise<ReadableStream> {
  // Convert messages to Gemini format
  const geminiMessages = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
  
  // Start streaming
  const result = await model.generateContentStream({
    contents: geminiMessages,
  });
  
  // Convert to ReadableStream
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        controller.enqueue(new TextEncoder().encode(text));
      }
      controller.close();
    },
  });
}

// ============================================
// Exports
// ============================================

export {
  geminiFlash,
  geminiUltra,
  createHobbyAnalogyChatModel,
  streamGeminiResponse,
};
