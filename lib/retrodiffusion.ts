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
    const apiEndpoint = process.env.NEXT_PUBLIC_RETRODIFFUSION_API_ENDPOINT || 'https://api.retrodiffusion.ai/v1/inferences';
    
    console.log('Debug - Environment variables:', { 
      hasApiKey: !!apiKey, 
      keyLength: apiKey?.length || 0,
      apiEndpoint 
    });

    if (!apiKey) {
      console.error('Missing API key for Retro Diffusion');
      return {
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAADJJREFUaN7twTEBAAAAwiD7p14MH2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4N8AKvgAAUFrhu4AAAAASUVORK5CYII=',
        message: 'API key not configured. Using placeholder image.',
        success: false,
        prompt: sanitizedPrompt
      };
    }

    console.log('Generating with prompt:', sanitizedPrompt);
    
    // Create API request payload according to latest documentation
    const payload = {
      model: "RD_FLUX", // RD_CLASSIC is no longer supported
      width: 256,
      height: 256,
      prompt: sanitizedPrompt,
      num_images: 1,
      prompt_style: "default" // Optional style parameter
    };
    
    console.log('Sending request with payload:', JSON.stringify(payload));
    
    // Make API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RD-Token': apiKey
      },
      body: JSON.stringify(payload)
    });
    
    // Handle API response
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      if (response.status === 429) {
        return {
          imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEX/AAAZ4gk3AAAAXklEQVR42u3BMQEAAADCIPunNsU+YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+A0mCAABQ2/jwwAAAABJRU5ErkJggg==',
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

    // Expected response format based on documentation:
    // {
    //   "created_at": 1733425519,
    //   "credit_cost": 1,
    //   "base64_images": ["..."],
    //   "model": "RDModel.RD_FLUX",
    //   "type": "txt2img",
    //   "remaining_credits": 999
    // }
    
    // Validate response data
    if (!data || !data.base64_images || !data.base64_images[0]) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid response from the API');
    }

    // Convert base64 image to URL
    const imageUrl = `data:image/png;base64,${data.base64_images[0]}`;
    const pixelArtAscii = generatePlaceholderAsciiArt(sanitizedPrompt);

    return {
      imageUrl: imageUrl,
      success: true,
      prompt: sanitizedPrompt,
      pixelArtAscii,
      remainingCredits: data.remaining_credits
    };
  } catch (error) {
    console.error('Error generating pixel art:', error);
    
    // Return a more user-friendly error and fallback image
    return {
      imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEUfAAANkyPdAAAATklEQVR42u3BAQ0AAADCIPunNsIVYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAODfAEQSAAFrfHJ/AAAAAElFTkSuQmCC',
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