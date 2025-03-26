import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Please provide a prompt to generate an image' 
        }, 
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
    
    // Log environment check (for debugging)
    console.log('Environment check:', {
      hasApiKey: !!cleanedApiKey,
      apiEndpoint,
      keyLength: cleanedApiKey?.length,
      apiKeyFormat: cleanedApiKey?.startsWith('rdpk-') ? 'valid format' : 'invalid format'
    });

    // Sanitize prompt (basic sanitization)
    const sanitizedPrompt = sanitizePrompt(prompt);
    
    console.log('Generating with prompt:', sanitizedPrompt);
    
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

    // Log the request details (excluding sensitive data)
    console.log('Making API request to:', apiEndpoint);
    console.log('Request payload:', { ...payload, apiKeyPresent: !!cleanedApiKey });
    
    // Make API request to RetoDiffusion
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RD-Token': cleanedApiKey, // Using cleaned API key
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Handle API response errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText,
        apiKeyFirstFiveChars: cleanedApiKey.substring(0, 5) // Log first 5 chars for debugging
      });
      
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
        message: `API error: ${response.status} - ${errorText || response.statusText}` 
      }, { status: response.status });
    }

    // Parse the response
    const data = await response.json();
    
    // Log successful response structure (excluding sensitive data)
    console.log('API response structure:', {
      hasBase64Images: !!data?.base64_images,
      imageCount: data?.base64_images?.length,
      remainingCredits: data?.remaining_credits
    });
    
    // Validate response data
    if (!data || !data.base64_images || !data.base64_images[0]) {
      console.error('Invalid API response structure:', data);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid response from the API' 
      }, { status: 500 });
    }

    // Return the image data with success
    return NextResponse.json({
      success: true,
      imageUrl: `data:image/png;base64,${data.base64_images[0]}`,
      prompt: sanitizedPrompt,
      remainingCredits: data.remaining_credits
    });
  } catch (error) {
    console.error('Error generating pixel art:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'An unknown error occurred'
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
  
  // Remove any HTML tags
  let sanitized = prompt.replace(/<[^>]*>/g, '');
  
  // Limit length
  return sanitized.trim().substring(0, 1000);
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