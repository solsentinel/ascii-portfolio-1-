import { NextRequest, NextResponse } from 'next/server';

// Maximum prompt length for security
const MAX_PROMPT_LENGTH = 1000;

// In-memory request tracking to prevent duplicates
// Will reset on server restart, but helps during active sessions
// Key is requestId+prompt hash, value is timestamp of processing
const processedRequests = new Map<string, number>();
const DUPLICATE_REQUEST_WINDOW = 10 * 1000; // 10 seconds window to detect duplicates

// Clean up old entries periodically to prevent memory leaks
const cleanupProcessedRequests = () => {
  const now = Date.now();
  for (const [key, timestamp] of processedRequests.entries()) {
    if (now - timestamp > DUPLICATE_REQUEST_WINDOW) {
      processedRequests.delete(key);
    }
  }
};

// Setup periodic cleanup (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupProcessedRequests, 5 * 60 * 1000);
}

// Create a hash for request deduplication
function createRequestHash(requestId: string, prompt: string): string {
  // Simple hash function for strings
  let hash = 0;
  const str = `${requestId}:${prompt}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

// Validate that the input is safe and meets requirements
function validateRequest(prompt: string): { valid: boolean; error?: string } {
  if (!prompt) {
    return { valid: false, error: 'Missing prompt' };
  }
  
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: 'Prompt exceeds maximum allowed length' };
  }
  
  // Check for potential XSS or command injection patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /eval\(/i,
    /document\.cookie/i,
    /\$\{/i  // Template injection attempt
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(prompt)) {
      return { 
        valid: false, 
        error: 'Prompt contains potentially malicious content' 
      };
    }
  }
  
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    // Run a cleanup on each request (1% chance to reduce overhead)
    if (Math.random() < 0.01) {
      cleanupProcessedRequests();
    }

    // Validate request origin (simple CORS check)
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = [
      'https://your-domain.com',  // Replace with your actual domain
      'https://www.your-domain.com',
      process.env.NEXT_PUBLIC_SITE_URL || '',
      'http://localhost:3000'  // For local development
    ];
    
    const isAllowedOrigin = !origin || allowedOrigins.some(allowed => 
      origin === allowed || allowed === '*'
    );
    
    if (!isAllowedOrigin) {
      console.warn(`Blocked request from unauthorized origin: ${origin}`);
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get client IP for logging/security
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    // Get unique request ID to detect duplicates
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    
    // Parse request with proper error handling
    let requestData;
    try {
      requestData = await request.json();
    } catch (err) {
      return NextResponse.json(
        { success: false, message: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    const { prompt, cacheBuster } = requestData;
    
    // Check for duplicate requests (same request ID and prompt within time window)
    const requestHash = createRequestHash(requestId, prompt);
    
    if (processedRequests.has(requestHash)) {
      const timestamp = processedRequests.get(requestHash);
      if (timestamp && Date.now() - timestamp < DUPLICATE_REQUEST_WINDOW) {
        console.warn(`Detected duplicate request: ${requestHash} from ${clientIp}`);
        return NextResponse.json(
          { 
            success: false, 
            message: 'Duplicate request detected. Please wait before retrying.' 
          },
          { status: 429 }
        );
      }
    }
    
    // Mark this request as being processed to prevent duplicates
    processedRequests.set(requestHash, Date.now());
    
    // Validate prompt
    const validation = validateRequest(prompt);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    // Access API key securely from server environment variables (not exposed to client)
    const apiKey = process.env.RETRODIFFUSION_API_KEY;
    const apiEndpoint = process.env.RETRODIFFUSION_API_ENDPOINT || 'https://api.retrodiffusion.ai/v1/inferences';
    
    if (!apiKey) {
      console.error('Missing API key for Retro Diffusion');
      return NextResponse.json(
        { 
          success: false, 
          message: 'API key not configured on server. Please contact support.' 
        }, 
        { status: 500 }
      );
    }

    // Clean and validate the API key
    const cleanedApiKey = cleanApiKey(apiKey);
    
    // Log environment check (for debugging) - avoid logging full key details in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('Environment check:', {
        hasApiKey: !!cleanedApiKey,
        apiEndpoint,
        keyLength: cleanedApiKey?.length,
        apiKeyFormat: cleanedApiKey?.startsWith('rdpk-') ? 'valid format' : 'invalid format'
      });
    }

    // Sanitize prompt (basic sanitization)
    const sanitizedPrompt = sanitizePrompt(prompt);
    
    // Log generation attempt with client IP (avoid logging full prompts in production)
    console.log(`Generation request from ${clientIp} - prompt length: ${sanitizedPrompt.length}`);
    
    // Create API request payload according to documentation
    const payload = {
      model: "RD_FLUX",
      width: 256,
      height: 256,
      prompt: sanitizedPrompt,
      num_images: 1,
      // Optional parameters
      prompt_style: "default",
      seed: Math.floor(Math.random() * 1000000) // Random seed for variety
    };

    // Make API request to RetoDiffusion
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RD-Token': cleanedApiKey, // Using cleaned API key
        'Accept': 'application/json',
        'User-Agent': 'Promixel/1.0',
        'X-Request-ID': requestId // Pass through the request ID for tracing
      },
      body: JSON.stringify(payload)
    });
    
    // Handle API response errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', {
        status: response.status,
        message: response.statusText,
        clientIp
      });
      
      // Only log detailed error info in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        console.error('API error details:', {
          error: errorText,
          apiKeyFirstFiveChars: cleanedApiKey.substring(0, 5) // Log first 5 chars for debugging
        });
      }
      
      // Handle specific error cases
      if (response.status === 429) {
        return NextResponse.json({ 
          success: false, 
          message: 'Credit limit reached. Try again later or upgrade your plan.' 
        }, { status: 429 });
      }
      
      if (response.status === 403) {
        return NextResponse.json({ 
          success: false, 
          message: 'Authentication failed. Please verify your API key is valid and active.' 
        }, { status: 403 });
      }
      
      if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid API key. Please check your configuration.' 
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        success: false, 
        message: `API error: ${response.status}` // Don't expose detailed error info to clients
      }, { status: response.status });
    }

    // Parse the response
    let data;
    try {
      data = await response.json();
    } catch (err) {
      console.error('Failed to parse API response:', err);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid response from the API' 
      }, { status: 500 });
    }
    
    // Validate response data
    if (!data || !data.base64_images || !data.base64_images[0]) {
      console.error('Invalid API response structure');
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid response from the API' 
      }, { status: 500 });
    }

    // Return the image data with success
    const response_data = {
      success: true,
      imageUrl: `data:image/png;base64,${data.base64_images[0]}`,
      prompt: sanitizedPrompt,
      remainingCredits: data.remaining_credits
    };

    const finalResponse = NextResponse.json(response_data);
    
    // Add security headers
    finalResponse.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; script-src 'self'");
    finalResponse.headers.set('X-Content-Type-Options', 'nosniff');
    finalResponse.headers.set('X-Frame-Options', 'DENY');
    finalResponse.headers.set('X-XSS-Protection', '1; mode=block');
    finalResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    finalResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    return finalResponse;
  } catch (error) {
    console.error('Error generating pixel art:', error);
    
    // Don't expose error details to clients
    return NextResponse.json({ 
      success: false, 
      message: 'An error occurred while processing your request'
    }, { status: 500 });
  }
}

/**
 * Sanitize a user prompt to prevent injection attacks
 * @param prompt The prompt to sanitize
 * @returns A sanitized version of the prompt
 */
function sanitizePrompt(prompt: string): string {
  if (!prompt) return '';
  
  // Remove any potentially dangerous HTML/script tags
  let sanitized = prompt.replace(/<[^>]*>|javascript:|onerror=|onload=/gi, '');
  
  // Prevent SQL injection attempts
  sanitized = sanitized.replace(/['";`]/g, '');
  
  // Limit length
  return sanitized.trim().substring(0, MAX_PROMPT_LENGTH);
}

/**
 * Clean and validate the API key format
 * @param apiKey The API key to clean
 * @returns A cleaned version of the API key
 */
function cleanApiKey(apiKey: string): string {
  if (!apiKey) return '';
  
  // Remove any whitespace
  let cleaned = apiKey.trim();
  
  // Ensure it has the correct prefix
  if (!cleaned.startsWith('rdpk-') && cleaned.includes('rdpk-')) {
    cleaned = 'rdpk-' + cleaned.split('rdpk-')[1];
  }
  
  return cleaned;
} 