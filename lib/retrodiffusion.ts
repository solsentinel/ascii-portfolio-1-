/**
 * Retro Diffusion API Client
 * Functions for generating and downloading pixel art
 * Uses a secure server-side API route to protect API keys
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
 * Generate pixel art using a secure server API route
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

    console.log('Generating pixel art with prompt:', prompt);
    
    // Call our secure API route instead of the RetoDiffusion API directly
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt })
    });

    // Parse the API response
    const result = await response.json();
    
    if (!response.ok) {
      // If there was an error, send back the error message
      return {
        imageUrl: getPlaceholderImageForError(response.status),
        message: result.message || 'Error generating image',
        success: false,
        prompt: prompt
      };
    }
    
    // Return the successful result
    return {
      ...result,
      pixelArtAscii: generatePlaceholderAsciiArt(prompt)
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
 * Get a placeholder image for different error types
 * @param errorCode The HTTP error code
 * @returns A data URL for the appropriate placeholder image
 */
function getPlaceholderImageForError(errorCode: number): string {
  if (errorCode === 429) {
    // Rate limit placeholder
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEX/AAAZ4gk3AAAAXklEQVR42u3BMQEAAADCIPunNsU+YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+A0mCAABQ2/jwwAAAABJRU5ErkJggg==';
  } else if (errorCode === 401 || errorCode === 403) {
    // Auth error placeholder
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAADJJREFUaN7twTEBAAAAwiD7p14MH2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4N8AKvgAAUFrhu4AAAAASUVORK5CYII=';
  } else {
    // Generic error placeholder
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEUfAAANkyPdAAAATklEQVR42u3BAQ0AAADCIPunNsIVYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAODfAEQSAAFrfHJ/AAAAAElFTkSuQmCC';
  }
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