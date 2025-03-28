import { NextRequest, NextResponse } from 'next/server';

// Global API configuration
const RETRODIFFUSION_API_KEY = process.env.RETRODIFFUSION_API_KEY || '';
const RETRODIFFUSION_API_ENDPOINT = process.env.RETRODIFFUSION_API_ENDPOINT || 'https://api.retrodiffusion.ai/v1/inferences';

// Validate API key at startup
(() => {
  if (!RETRODIFFUSION_API_KEY) {
    console.error('WARNING: RETRODIFFUSION_API_KEY is not set in environment variables');
  } else {
    const keyPrefix = RETRODIFFUSION_API_KEY.substring(0, 7);
    console.log(`RetroDiffusion API Key loaded: ${keyPrefix}... (${RETRODIFFUSION_API_KEY.length} chars)`);
    console.log(`RetroDiffusion API Endpoint: ${RETRODIFFUSION_API_ENDPOINT}`);
  }
})();

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
    const apiKey = RETRODIFFUSION_API_KEY;
    const apiEndpoint = RETRODIFFUSION_API_ENDPOINT;
    
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
    console.log('Making request with:', {
      apiKey: `${cleanedApiKey.substring(0, 7)}...`,
      apiEndpoint,
      keyLength: cleanedApiKey?.length,
      apiKeyFormat: cleanedApiKey?.startsWith('rdpk-') ? 'valid format' : 'invalid format',
      keyPrefix: cleanedApiKey?.substring(0, 5) // Log only first 5 chars for debugging
    });

    // Sanitize prompt (basic sanitization)
    const sanitizedPrompt = sanitizePrompt(prompt);
    
    // Log generation attempt with client IP (avoid logging full prompts in production)
    console.log(`Generation request from ${clientIp} - prompt length: ${sanitizedPrompt.length}`);
    
    // Create API request payload according to RetroFusion documentation
    const payload = {
      prompt: sanitizedPrompt,
      height: 256,
      width: 256,
      negative: "",
      num_inference_steps: 20,
      guidance_scale: 5,
      strength: 0.75,
      seed: Math.floor(Math.random() * 1000000),
      num_images: 1,
      tiling_x: false,
      tiling_y: false,
      loras: {},
      expand_prompt: false,
      model: "RD_CLASSIC",
      prompt_style: "default",
      substyle: {
        id: "",
        name: "",
        required_prompt_style_key: "",
        model_override: "",
        loras_override: {},
        prompt_style_override: "",
        latent_size_override: 0,
        post_pipeline_override: "",
        steps_override: 0,
        img2img_steps_override: 0
      },
      pre_processing: {
        pipeline: ""
      }
    };

    // Log the full API endpoint for debugging
    console.log(`Using API endpoint: ${apiEndpoint}`);

    // Define headers with X-RD-Token as required by the API
    const mainRequestHeaders = {
      'Content-Type': 'application/json',
      'X-RD-Token': RETRODIFFUSION_API_KEY, // Use original API key directly from env
      'Accept': 'application/json',
      'User-Agent': 'Promixel/1.0 (NextJS Server)'
    };

    // Log request details with full debugging info
    console.log('API Request Details:', {
      endpoint: apiEndpoint,
      method: 'POST',
      headers: Object.keys(mainRequestHeaders),
      keyLength: RETRODIFFUSION_API_KEY.length
    });

    // Make the API request
    try {
      // Log the payload (without the full prompt for privacy)
      console.log('Request payload:', {
        ...payload,
        prompt: payload.prompt.substring(0, 20) + '...' // Only log first 20 chars of prompt
      });
      
      // Make the request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      console.log(`Making request to: ${apiEndpoint}`);
      console.log(`With X-RD-Token as an object containing generation parameters`);
      
      // Try different endpoint variations if the main one fails
      let response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RD-Token': JSON.stringify({
            prompt: sanitizedPrompt,
            height: 256,
            width: 256,
            negative: "",
            num_inference_steps: 20,
            guidance_scale: 5,
            strength: 0.75,
            seed: Math.floor(Math.random() * 1000000),
            num_images: 1,
            tiling_x: false,
            tiling_y: false,
            loras: {},
            expand_prompt: false,
            model: "RD_CLASSIC",
            prompt_style: "default",
            substyle: {
              id: "",
              name: "",
              required_prompt_style_key: "",
              model_override: "",
              loras_override: {},
              prompt_style_override: "",
              latent_size_override: 0,
              post_pipeline_override: "",
              steps_override: 0,
              img2img_steps_override: 0
            },
            pre_processing: {
              pipeline: ""
            }
          }),
          'Accept': 'application/json',
          'User-Agent': 'Promixel/1.0 (NextJS Server)'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeoutId);
      });

      console.log(`API Response: Status ${response.status} ${response.statusText}`);
      
      // If we get a 404, try alternative API endpoints
      if (response.status === 404) {
        console.log('Trying alternative API endpoint format...');
        
        // Try alternative endpoints
        const alternativeEndpoints = [
          `https://api.retrodiffusion.ai/v1/inferences`, // Try /inferences first
          `https://api.retrodiffusion.ai/api/v1/inferences`, 
          `https://api.retrodiffusion.ai/v1/generate`,
          `https://api.retrodiffusion.ai/api/v1/generate`
        ];
        
        // Try alternative payload formats
        const alternativePayloads = [
          // Original format
          payload,
          
          // Alternative format with num_inference_steps
          {
            ...payload,
            num_inference_steps: payload.num_inference_steps,
            guidance_scale: payload.guidance_scale
          },
          
          // Alternative format with different field names
          {
            prompt: sanitizedPrompt,
            height: 256,
            width: 256,
            negative: "",
            num_inference_steps: 20,
            guidance_scale: 5,
            strength: 0.75,
            seed: Math.floor(Math.random() * 1000000),
            num_images: 1,
            tiling_x: false,
            tiling_y: false,
            loras: {},
            expand_prompt: false,
            model: "RD_CLASSIC"
          }
        ];
        
        for (const altEndpoint of alternativeEndpoints) {
          for (const altPayload of alternativePayloads) {
            console.log(`Trying alternative endpoint: ${altEndpoint} with payload format ${Object.keys(altPayload).includes('num_inference_steps') ? 'v2' : 'v1'}`);
            
            const altController = new AbortController();
            const altTimeoutId = setTimeout(() => altController.abort(), 30000);
            
            try {
              const altResponse = await fetch(altEndpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-RD-Token': JSON.stringify({
                    prompt: sanitizedPrompt,
                    height: 256,
                    width: 256,
                    negative: "",
                    num_inference_steps: 20,
                    guidance_scale: 5,
                    strength: 0.75,
                    seed: Math.floor(Math.random() * 1000000),
                    num_images: 1,
                    tiling_x: false,
                    tiling_y: false,
                    loras: {},
                    expand_prompt: false,
                    model: "RD_CLASSIC",
                    prompt_style: "default",
                    substyle: {
                      id: "",
                      name: "",
                      required_prompt_style_key: "",
                      model_override: "",
                      loras_override: {},
                      prompt_style_override: "",
                      latent_size_override: 0,
                      post_pipeline_override: "",
                      steps_override: 0,
                      img2img_steps_override: 0
                    },
                    pre_processing: {
                      pipeline: ""
                    }
                  }),
                  'Accept': 'application/json',
                  'User-Agent': 'Promixel/1.0 (NextJS Server)'
                },
                body: JSON.stringify(altPayload),
                signal: altController.signal
              }).finally(() => {
                clearTimeout(altTimeoutId);
              });
              
              console.log(`Alternative endpoint response: ${altResponse.status} ${altResponse.statusText}`);
              
              if (altResponse.ok || altResponse.status !== 404) {
                // Use this response instead
                response = altResponse;
                console.log(`Using alternative endpoint: ${altEndpoint} with alternative payload`);
                break;
              }
            } catch (altError) {
              console.error(`Error with alternative endpoint ${altEndpoint}:`, altError);
            }
          }
          
          // Break out if we found a working endpoint
          if (response.ok || response.status !== 404) {
            break;
          }
        }
      }

      // Handle response
      if (!response.ok) {
        let errorText = await response.text();
        console.error(`API error (HTTP ${response.status}): ${errorText}`);
        
        // Log detailed information about the error
        console.error('Error details:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          errorTextSample: errorText.substring(0, 200),
          apiEndpoint,
          apiKeyPrefix: RETRODIFFUSION_API_KEY.substring(0, 7),
          tokenHeaderValue: mainRequestHeaders['X-RD-Token'].substring(0, 7) + '...',
          headersSent: JSON.stringify(mainRequestHeaders).substring(0, 100) + '...'
        });
        
        try {
          const errorJson = JSON.parse(errorText);
          
          // Check if this is an authentication error
          if (response.status === 401 || 
              (errorJson.detail && errorJson.detail.some((d: any) => 
                d.msg && d.msg.includes('X-RD-Token')))) {
            
            console.error('Authentication error detected');
            
            return NextResponse.json({
              success: false,
              message: 'API Key Authentication Failed: Please check your API key',
              error: {
                ...errorJson,
                apiKeyInfo: {
                  prefix: RETRODIFFUSION_API_KEY.substring(0, 7),
                  length: RETRODIFFUSION_API_KEY.length,
                  format: RETRODIFFUSION_API_KEY.startsWith('rdpk-') ? 'Has prefix' : 'Missing prefix',
                  headerSent: mainRequestHeaders['X-RD-Token'] ? 'Yes' : 'No'
                }
              }
            }, { status: 401 });
          }
          
          return NextResponse.json({
            success: false,
            message: `API Error: ${errorJson.message || errorJson.error || 'The API request failed'}`,
            error: errorJson
          }, { status: response.status });
        } catch (parseError) {
          return NextResponse.json({
            success: false,
            message: `API Error: ${response.statusText}`,
            error: errorText
          }, { status: response.status });
        }
      }

      // Parse successful response
      const data = await response.json();
      
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
        prompt: sanitizedPrompt
      };

      const finalResponse = NextResponse.json(response_data);
      
      // Add security headers
      finalResponse.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; script-src 'self'");
      finalResponse.headers.set('X-Content-Type-Options', 'nosniff');
      finalResponse.headers.set('X-Frame-Options', 'DENY');
      finalResponse.headers.set('X-XSS-Protection', '1; mode=block');
      finalResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      finalResponse.headers.set('Access-Control-Allow-Origin', origin || '*');
      finalResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      finalResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Request-ID');
      
      return finalResponse;
    } catch (fetchError) {
      console.error('Fetch error when calling RetoDiffusion API:', fetchError);
      
      // Provide more detailed error information
      const errorDetails = {
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        type: fetchError instanceof Error ? fetchError.name : typeof fetchError,
        apiEndpoint,
        apiKeyValid: !!cleanedApiKey && cleanedApiKey.length > 10,
        timeStamp: new Date().toISOString()
      };
      
      console.error('Detailed error info:', errorDetails);
      
      // Check for specific error types
      let errorMessage = 'Network error when connecting to the image generation API';
      let statusCode = 500;
      
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          errorMessage = 'The request to the image generation API timed out. Please try again.';
          statusCode = 504; // Gateway Timeout
        } else if (fetchError.message.includes('ENOTFOUND') || fetchError.message.includes('ECONNREFUSED')) {
          errorMessage = 'Could not connect to the image generation API. Please try again later.';
          statusCode = 503; // Service Unavailable
        }
      }
      
      return NextResponse.json({ 
        success: false, 
        message: errorMessage,
        error: errorDetails
      }, { status: statusCode });
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
  if (!cleaned.startsWith('rdpk-')) {
    // If it contains the prefix somewhere in the string, extract from there
    if (cleaned.includes('rdpk-')) {
      cleaned = 'rdpk-' + cleaned.split('rdpk-')[1];
    } 
    // Otherwise, add the prefix
    else {
      cleaned = `rdpk-${cleaned}`;
    }
  }
  
  // Log the cleaned key (just the prefix) for debugging
  console.log(`Cleaned API key: ${cleaned.substring(0, 7)}...`);
  
  return cleaned;
} 