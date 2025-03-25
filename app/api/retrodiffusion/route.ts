import { NextResponse } from 'next/server';

// Define a type for our rate limit tracking
type RateLimitInfo = {
  usedCredits: number;
  resetTime: number; // Timestamp when the rate limit resets
};

// In-memory store for rate limiting (will reset on server restart)
// In a production app, you'd use a database or Redis for this
const rateLimits = new Map<string, RateLimitInfo>();

// Credit limit per hour
const CREDITS_LIMIT = 10;
const COOLDOWN_PERIOD_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export async function POST(request: Request) {
  try {
    const { prompt, width = 256, height = 256, num_images = 1 } = await request.json();

    // Get IP address from request (this is simplified)
    // In a real app, you'd use a more robust user identification method
    const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
                   
    // Check rate limit for this IP
    const now = Date.now();
    let rateLimit = rateLimits.get(ipAddress);
    
    // If no rate limit info exists or the cooldown period has passed
    if (!rateLimit || rateLimit.resetTime < now) {
      rateLimit = {
        usedCredits: 0,
        resetTime: now + COOLDOWN_PERIOD_MS
      };
    }
    
    // Check if client has exceeded their credit limit
    if (rateLimit.usedCredits >= CREDITS_LIMIT) {
      const timeRemaining = Math.ceil((rateLimit.resetTime - now) / (60 * 1000)); // minutes
      
      return NextResponse.json({
        message: `Credit limit reached. Please try again in ${timeRemaining} minute${timeRemaining !== 1 ? 's' : ''}.`,
        imageUrl: "https://via.placeholder.com/256x256/1a1a1a/ffffff?text=Credit+Limit+Reached",
        pixelArtAscii: "",
        prompt: prompt || ""
      });
    }
    
    // Check if prompt is provided
    if (!prompt) {
      console.error("Missing prompt in request");
      return NextResponse.json(
        { 
          message: "Missing prompt in request",
          imageUrl: "https://via.placeholder.com/256x256/1a1a1a/ffffff?text=Missing+Prompt",
          pixelArtAscii: "",
          prompt: ""
        }
      );
    }
    
    // Check if API key is defined
    const apiKey = process.env.RETRODIFFUSION_API_KEY;
    const apiEndpoint = process.env.RETRODIFFUSION_API_ENDPOINT;
    
    if (!apiKey || !apiEndpoint) {
      console.error("Missing API key or endpoint:", { 
        hasKey: !!apiKey, 
        hasEndpoint: !!apiEndpoint,
        keyLength: apiKey ? apiKey.length : 0
      });
      return NextResponse.json(
        { 
          message: "API configuration is missing",
          imageUrl: "https://via.placeholder.com/256x256/1a1a1a/ffffff?text=API+Error",
          pixelArtAscii: "",
          prompt: prompt || ""
        }
      );
    }
    
    console.log("Calling RetroFusion API with:", {
      endpoint: apiEndpoint,
      hasKey: !!apiKey,
      prompt: prompt,
      dimensions: `${width}x${height}`
    });
    
    // Call the actual RetroFusion API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RD-Token': apiKey
      },
      body: JSON.stringify({
        model: "RD_FLUX", // Using the main model
        width: width,
        height: height,
        prompt: prompt,
        num_images: num_images
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData = {};
      
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // If it's not JSON, use the text as is
        errorData = { raw: errorText };
      }
      
      console.error("RetroFusion API error:", { 
        status: response.status, 
        statusText: response.statusText,
        data: errorData 
      });
      
      return NextResponse.json(
        { 
          message: `RetroFusion API error: ${response.status} ${response.statusText}`, 
          details: errorData,
          imageUrl: "https://via.placeholder.com/256x256/1a1a1a/ffffff?text=API+Error",
          pixelArtAscii: "",
          prompt: prompt || ""
        }
      );
    }
    
    const data = await response.json();
    console.log("RetroFusion API response structure:", {
      hasBase64Images: !!data.base64_images,
      imagesCount: data.base64_images ? data.base64_images.length : 0,
      firstImageLength: data.base64_images && data.base64_images[0] ? data.base64_images[0].length : 0,
      keys: Object.keys(data)
    });
    
    // Check if we have base64 images
    if (!data.base64_images || !data.base64_images.length) {
      console.warn("No base64 images in the API response");
      return NextResponse.json({
        message: "No images generated",
        imageUrl: "https://via.placeholder.com/256x256/1a1a1a/ffffff?text=No+Images",
        pixelArtAscii: "",
        prompt: prompt
      });
    }
    
    // Increment user's credit usage if successful
    rateLimit.usedCredits += data.credit_cost || 1;
    rateLimits.set(ipAddress, rateLimit);
    
    // Log rate limit info
    console.log(`IP ${ipAddress.substring(0, 10)}... has used ${rateLimit.usedCredits}/${CREDITS_LIMIT} credits. Reset at ${new Date(rateLimit.resetTime).toLocaleTimeString()}`);
    
    // Make sure there are no line breaks or spaces in the base64 string
    const cleanBase64 = data.base64_images[0].replace(/[\n\r\s]/g, '');
    const imageUrl = `data:image/png;base64,${cleanBase64}`;
    console.log("Created image URL from base64 data, length:", cleanBase64.length);
    
    // Check if the base64 string is valid
    try {
      // This will throw an error if the base64 is invalid
      atob(cleanBase64);
      
      // Return response without exposing rate limit information to client
      return NextResponse.json({
        imageUrl,
        pixelArtAscii: "",
        prompt: prompt
      });
    } catch (e) {
      console.error("Invalid base64 data:", e);
      return NextResponse.json({
        message: "Invalid image data received",
        imageUrl: "https://via.placeholder.com/256x256/1a1a1a/ffffff?text=Invalid+Image+Data",
        pixelArtAscii: "",
        prompt: prompt
      });
    }
  } catch (error) {
    console.error("Error generating pixel art:", error);
    return NextResponse.json(
      { 
        message: "Failed to generate pixel art", 
        error: error instanceof Error ? error.message : String(error),
        imageUrl: "https://via.placeholder.com/256x256/1a1a1a/ffffff?text=Error",
        pixelArtAscii: "",
        prompt: ""
      }
    );
  }
}

// Function to generate placeholder ASCII art in case the API doesn't return any
function generatePlaceholderAsciiArt(prompt: string): string {
  if (!prompt) return "";
  
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
    `
  ];
  
  const index = Math.floor(prompt.length % patterns.length);
  return patterns[index];
} 