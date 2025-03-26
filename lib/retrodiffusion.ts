/**
 * Retro Diffusion API Client
 * Functions for generating and downloading pixel art
 */

// Types
export interface GenerationResult {
  imageUrl: string;
  message?: string;
  success: boolean;
  prompt?: string;
  pixelArtAscii?: string;
  remainingCredits?: number;
}

/**
 * Generate pixel art using the Retro Diffusion API
 * @param prompt Text prompt to generate pixel art from
 * @returns Object containing the image URL and any messages
 */
export const generatePixelArt = async (prompt: string): Promise<GenerationResult> => {
  try {
    if (!prompt || prompt.trim() === '') {
      return {
        imageUrl: '',
        message: 'Please provide a prompt to generate an image',
        success: false
      };
    }

    // Sanitize the prompt
    const sanitizedPrompt = sanitizePrompt(prompt);

    // Check for API key and endpoint
    const apiKey = process.env.NEXT_PUBLIC_RETRODIFFUSION_API_KEY;
    const apiEndpoint = process.env.NEXT_PUBLIC_RETRODIFFUSION_API_ENDPOINT || 'https://api.retrodiffusion.ai/v1/images';

    if (!apiKey) {
      console.error('Missing API key for Retro Diffusion');
      return {
        imageUrl: '/placeholder-pixel-art.png', // Fallback to placeholder
        message: 'API key not configured. Using placeholder image.',
        success: false,
        prompt: sanitizedPrompt
      };
    }

    console.log('Generating with prompt:', sanitizedPrompt);
    
    // Make API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        prompt: sanitizedPrompt,
        n: 1,
        format: 'url'
      })
    });

    // Handle API response
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      // If rate limited, return a special message and placeholder
      if (response.status === 429) {
        return {
          imageUrl: '/rate-limit-pixel-art.png', // Rate limit placeholder
          message: 'Credit limit reached. Try again later or upgrade your plan.',
          success: false,
          prompt: sanitizedPrompt
        };
      }
      
      console.error('API error:', response.status, errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Error parsing API response:', e);
      throw new Error('Invalid response from the API (JSON parsing failed)');
    }

    // Validate response data
    if (!data || !data.images || !data.images[0]) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid response from the API');
    }

    // Determine if we have ASCII art in the response
    const pixelArtAscii = data.pixelArtAscii || generatePlaceholderAsciiArt(sanitizedPrompt);

    return {
      imageUrl: data.images[0],
      success: true,
      prompt: sanitizedPrompt,
      pixelArtAscii,
      remainingCredits: data.remainingCredits
    };
  } catch (error) {
    console.error('Error generating pixel art:', error);
    
    // Return a more user-friendly error and fallback image
    return {
      imageUrl: '/error-pixel-art.png', // Error placeholder 
      message: error instanceof Error 
        ? `Error: ${error.message}` 
        : 'An unknown error occurred while generating the image',
      success: false,
      prompt: prompt
    };
  }
};

/**
 * Download an image from a URL
 * @param url URL of the image to download
 * @param filename Name to save the file as
 */
export const downloadPixelArt = async (url: string, filename: string): Promise<void> => {
  try {
    if (!url) {
      throw new Error('No image URL provided for download');
    }
    
    // For data URLs, we can download directly
    if (url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    
    // For remote URLs, we need to fetch first
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error('Failed to download the image');
  }
};

/**
 * Sanitize a user prompt to prevent injection attacks
 * @param prompt The prompt to sanitize
 * @returns A sanitized version of the prompt
 */
function sanitizePrompt(prompt: string): string {
  if (!prompt) return '';
  
  // Remove any HTML tags
  let sanitized = prompt.replace(/<[^>]*>/g, '');
  
  // Limit length
  return sanitized.trim().substring(0, 1000);
}

/**
 * Generate placeholder ASCII art
 * @param prompt The prompt used to seed the ASCII art pattern
 * @returns A string containing ASCII art
 */
function generatePlaceholderAsciiArt(prompt: string): string {
  if (!prompt) {
    return "";
  }
  
  const patterns = [
    `
■■■■■■■■■■■■■■■■
■                ■
■  ♥♥      ♥♥   ■
■  ♥♥      ♥♥   ■
■                ■
■       ♥♥       ■
■      ♥♥♥♥      ■
■       ♥♥       ■
■                ■
■■■■■■■■■■■■■■■■
    `,
    `
□□□□□□□□□□□□□□□□
□  ▓▓▓▓▓▓▓▓▓▓  □
□  ▓        ▓  □
□  ▓  ◘  ◘  ▓  □
□  ▓        ▓  □
□  ▓   ⌣    ▓  □
□  ▓        ▓  □
□  ▓▓▓▓▓▓▓▓▓▓  □
□□□□□□□□□□□□□□□□
    `,
    `
╔════════════╗
║ ▄▄▄    ▄▄▄ ║
║ █▀█    █▀█ ║
║            ║
║    ╭──╮    ║
║    ╰──╯    ║
║            ║
╚════════════╝
    `,
    `
┌──────────────┐
│   ╭─╮  ╭─╮   │
│   ╰─╯  ╰─╯   │
│              │
│      /\\     │
│     /  \\    │
│    /____\\   │
└──────────────┘
    `
  ];
  
  // Pick a pattern based on the prompt (just for demonstration)
  const promptLength = prompt?.length || 0;
  const index = Math.floor(promptLength % patterns.length);
  return patterns[index];
} 