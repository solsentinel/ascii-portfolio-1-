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

// In-memory cache to prevent duplicate requests
const requestCache: { [key: string]: { result: GenerationResult, timestamp: number } } = {};

// Track when the last request was made to prevent rapid fire requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000; // Increase to 3 seconds between requests

// Track pending requests to prevent duplicate submissions
let pendingRequests: { [key: string]: boolean } = {};

// Track API request totals for monitoring
let apiRequestsThisSession = 0;
const MAX_REQUESTS_PER_SESSION = 50; // Safety limit

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Save request count to sessionStorage to persist across page refreshes but not browser sessions
if (isBrowser) {
  try {
    const savedCount = sessionStorage.getItem('api_request_count');
    if (savedCount) {
      apiRequestsThisSession = parseInt(savedCount, 10);
    }
  } catch (e) {
    console.error('Failed to access sessionStorage:', e);
  }
}

/**
 * Update API call metrics
 */
function trackApiRequest() {
  apiRequestsThisSession++;
  
  if (isBrowser) {
    try {
      sessionStorage.setItem('api_request_count', apiRequestsThisSession.toString());
      
      // Also track the last request time to prevent rapid reloads from bypassing limits
      sessionStorage.setItem('last_api_request_time', Date.now().toString());
    } catch (e) {
      console.error('Failed to update sessionStorage:', e);
    }
  }
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

    // Prevent API spamming by enforcing session limits
    if (apiRequestsThisSession >= MAX_REQUESTS_PER_SESSION) {
      console.warn('Session API request limit reached:', apiRequestsThisSession);
      return {
        imageUrl: getPlaceholderImageForError(429),
        message: 'You have reached the maximum number of generations for this session. Please try again later.',
        success: false
      };
    }

    // Normalize the prompt for caching (trim whitespace, lowercase)
    const normalizedPrompt = prompt.trim().toLowerCase();
    
    // Check if we have a cached result for this prompt
    const cachedResult = requestCache[normalizedPrompt];
    if (cachedResult && Date.now() - cachedResult.timestamp < 1000 * 60 * 30) { // Cache valid for 30 minutes
      console.log('Using cached result for prompt:', normalizedPrompt);
      return cachedResult.result;
    }
    
    // Check if this exact request is already pending
    if (pendingRequests[normalizedPrompt]) {
      console.log('Request already in progress for prompt:', normalizedPrompt);
      return {
        imageUrl: '',
        message: 'A generation with this prompt is already in progress. Please wait a moment.',
        success: false
      };
    }
    
    // Prevent API spamming by enforcing a minimum time between requests
    const now = Date.now();
    
    // Check both in-memory and session-stored last request time
    let lastStoredRequestTime = 0;
    if (isBrowser) {
      try {
        const storedTime = sessionStorage.getItem('last_api_request_time');
        if (storedTime) {
          lastStoredRequestTime = parseInt(storedTime, 10);
        }
      } catch (e) {
        console.error('Failed to read from sessionStorage:', e);
      }
    }
    
    // Use the more recent of the two timestamps
    const effectiveLastRequestTime = Math.max(lastRequestTime, lastStoredRequestTime);
    
    if (now - effectiveLastRequestTime < MIN_REQUEST_INTERVAL) {
      const waitTime = Math.ceil((MIN_REQUEST_INTERVAL - (now - effectiveLastRequestTime)) / 1000);
      console.log(`Request throttled. Please wait ${waitTime} seconds.`);
      return {
        imageUrl: '',
        message: `Please wait ${waitTime} seconds before generating another image.`,
        success: false
      };
    }
    
    // Mark this request as pending
    pendingRequests[normalizedPrompt] = true;
    
    // Update last request time
    lastRequestTime = now;
    if (isBrowser) {
      try {
        sessionStorage.setItem('last_api_request_time', now.toString());
      } catch (e) {
        console.error('Failed to update sessionStorage:', e);
      }
    }

    console.log('Generating pixel art with prompt:', normalizedPrompt);
    
    // Add a unique request ID to help identify duplicate requests on the server
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    try {
      // Call our secure API route instead of the RetoDiffusion API directly
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({ 
          prompt,
          cacheBuster: requestId // Include this to prevent browser caching
        })
      });

      // Track the API request
      trackApiRequest();

      // Parse the API response
      const result = await response.json();
      
      if (!response.ok) {
        // If there was an error, send back the error message
        delete pendingRequests[normalizedPrompt]; // Clear pending flag
        return {
          imageUrl: getPlaceholderImageForError(response.status),
          message: result.message || 'Error generating image',
          success: false,
          prompt: prompt
        };
      }
      
      // Add ASCII art to the result
      const finalResult = {
        ...result,
        pixelArtAscii: generatePlaceholderAsciiArt(prompt)
      };
      
      // Cache the successful result
      if (result.success && result.imageUrl) {
        requestCache[normalizedPrompt] = {
          result: finalResult,
          timestamp: Date.now()
        };
        
        // Clean up old cache entries (keep last 20 successful generations)
        const cacheEntries = Object.keys(requestCache);
        if (cacheEntries.length > 20) {
          const oldestKey = cacheEntries.reduce((oldest, key) => {
            return requestCache[key].timestamp < requestCache[oldest].timestamp ? key : oldest;
          }, cacheEntries[0]);
          delete requestCache[oldestKey];
        }
      }
      
      // Request completed, remove from pending
      delete pendingRequests[normalizedPrompt];
      
      // Return the successful result
      return finalResult;
    } catch (error) {
      // Clear pending status on error
      delete pendingRequests[normalizedPrompt];
      throw error; // Rethrow to be caught by the outer try/catch
    }
    
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