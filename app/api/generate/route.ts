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
      // Allow any origin in development or when deployed
      '*',
      // Keep specific origins for reference
      'https://your-domain.com',
      'https://www.your-domain.com',
      process.env.NEXT_PUBLIC_SITE_URL || '',
      'http://localhost:3000'
    ];
    
    // Always allow requests with no origin (like from the browser directly)
    // Or when the request origin matches one of our allowed origins
    const isAllowedOrigin = !origin || allowedOrigins.includes('*') || allowedOrigins.some(allowed => 
      origin === allowed || allowed === '*'
    );
    
    if (!isAllowedOrigin) {
      console.warn(`Blocked request from unauthorized origin: ${origin}`);
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID'
          }
        }
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
    
    // Create API request payload according to RetroFusion documentation
    // Simplify the payload structure to solve 422 errors
    const payload = {
      model: "RD_FLUX", // Try the original model name again
      width: 256,
      height: 256,
      prompt: sanitizedPrompt,
      num_images: 1,
      // Remove nested params object that might be causing issues
      cfg_scale: 7.5,
      steps: 30,
      sampler: "ddim"
    };

    // Define headers with fallback options before diagnostic test
    let mainRequestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cleanedApiKey}`,
      'Accept': 'application/json'
    };

    // Make a diagnostic direct call to the API with minimal payload
    // This will help identify exactly what format the API expects
    console.log('Making diagnostic API call with minimal payload');
    try {
      const diagnosticPayload = {
        model: "RD_FLUX",
        prompt: "test prompt",
        width: 256,
        height: 256,
        num_images: 1
      };

      const diagnosticResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: mainRequestHeaders,
        body: JSON.stringify(diagnosticPayload)
      });

      // Log the complete diagnostic response
      console.log('Diagnostic API call result:', {
        status: diagnosticResponse.status,
        statusText: diagnosticResponse.statusText,
        headers: Object.fromEntries(diagnosticResponse.headers.entries())
      });

      // Get and log the response text
      const diagnosticText = await diagnosticResponse.text();
      console.log('Diagnostic response text:', diagnosticText.substring(0, 500));
      
      // If we got a 401 error, try a different authorization method
      if (diagnosticResponse.status === 401) {
        console.log('Trying X-RD-Token header instead of Authorization');
        const alternativeHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-RD-Token': cleanedApiKey.startsWith('rdpk-') ? cleanedApiKey : `rdpk-${cleanedApiKey}`,
          'Accept': 'application/json'
        };
        
        // Make a second diagnostic test with alternative headers
        const altDiagnosticResponse = await fetch(apiEndpoint, {
          method: 'POST',
          headers: alternativeHeaders,
          body: JSON.stringify(diagnosticPayload)
        });
        
        console.log('Alternative authentication method result:', {
          status: altDiagnosticResponse.status,
          statusText: altDiagnosticResponse.statusText
        });
        
        if (altDiagnosticResponse.ok) {
          console.log('SUCCESS: X-RD-Token authentication worked! Using this format.');
          // Use the working headers for the main request
          mainRequestHeaders = alternativeHeaders;
        }
      }

      if (diagnosticResponse.ok) {
        console.log('SUCCESS: Diagnostic API call worked! Using this format for main request.');
        // Update the payload to match the working diagnostic payload
        Object.keys(payload).forEach(key => {
          if (!(key in diagnosticPayload)) {
            // @ts-ignore - Safely remove extra keys that aren't in the working payload
            delete payload[key];
          }
        });
      }
    } catch (diagnosticError) {
      console.error('Diagnostic API call failed:', diagnosticError);
    }

    // Make the actual API request
    console.log('Making main API request with headers:', Object.keys(mainRequestHeaders));
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: mainRequestHeaders,
        body: JSON.stringify(payload)
      });

      // Improve error handling specifically for 422 errors
      if (!response.ok) {
        let errorText = "";
        try {
          errorText = await response.text();
          console.error(`API error (HTTP ${response.status}): ${errorText.substring(0, 500)}`);
          
          // Specific handling for 422 errors to help debugging
          if (response.status === 422) {
            console.error('Validation Error (422) Details:', {
              payload: JSON.stringify(payload),
              apiKeyFormat: cleanedApiKey.startsWith('rdpk-') ? 'Correct format' : 'Missing prefix',
              requestId,
              responseFirstChars: errorText.substring(0, 300)
            });
            
            // Try to parse the error response for more details
            try {
              const errorJson = JSON.parse(errorText);
              console.error('Parsed error details:', errorJson);
              
              // Return a more helpful error message for end users
              return NextResponse.json({
                success: false,
                message: `API Validation Error: ${errorJson.message || errorJson.error || 'The API rejected our request format'}. Please try a different prompt.`,
                error: errorJson
              }, { status: 422 });
            } catch (parseError) {
              // Couldn't parse the error as JSON
              console.error('Failed to parse error response as JSON:', parseError);
            }
          }
          
          // General error response for other status codes
          return NextResponse.json({
            success: false,
            message: `Error: HTTP status ${response.status}. ${
              response.status === 401 || response.status === 403 ? 'API key may be invalid or expired.' : 
              response.status === 429 ? 'Rate limit exceeded. Please try again later.' : 
              'Please try again later.'
            }`,
            error: errorText.substring(0, 200)
          }, { status: response.status });
        } catch (e) {
          const errorObj = e as Error;
          console.error('API error details:', {
            error: errorText.substring(0, 500), // Limit log size
            apiKeyFirstFiveChars: cleanedApiKey.substring(0, 5) // Log first 5 chars for debugging
          });
        }
      }

      // Parse the response
      let data;
      let responseText = '';
      try {
        // First get the raw text to help with debugging
        responseText = await response.text();
        console.log('Received API response, length:', responseText.length);
        
        // Then parse it as JSON
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse API response as JSON:', e);
          console.error('Response text (first 500 chars):', responseText.substring(0, 500));
          return NextResponse.json({ 
            success: false, 
            message: 'Invalid JSON response from the API' 
          }, { status: 500 });
        }
      } catch (err) {
        console.error('Failed to read API response:', err);
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to read response from the API' 
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
      
      // Add security headers and CORS headers to the success response
      finalResponse.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; script-src 'self'");
      finalResponse.headers.set('X-Content-Type-Options', 'nosniff');
      finalResponse.headers.set('X-Frame-Options', 'DENY');
      finalResponse.headers.set('X-XSS-Protection', '1; mode=block');
      finalResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      finalResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      finalResponse.headers.set('Access-Control-Allow-Origin', origin || '*');
      finalResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      finalResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Request-ID');
      
      return finalResponse;
    } catch (fetchError) {
      console.error('Fetch error when calling RetoDiffusion API:', fetchError);
      return NextResponse.json({ 
        success: false, 
        message: 'Network error when connecting to the image generation API' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error generating pixel art:', error);
    
    // Don't expose error details to clients
    return NextResponse.json({ 
      success: false, 
      message: 'An error occurred while processing your request'
    }, { status: 500 });
  }
}

// Add an OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  
  // Return a response with CORS headers
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
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