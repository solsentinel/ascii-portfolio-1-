import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for fetching images from external URLs.
 * This helps avoid CORS issues when downloading images from external sources.
 */
export async function GET(request: NextRequest) {
  // Get the target URL from the query parameters
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json(
      { error: 'Missing URL parameter' },
      { status: 400 }
    );
  }
  
  try {
    // Validate URL format
    const parsedUrl = new URL(url);
    
    // Only allow certain domains for security (adjust as needed)
    const allowedDomains = [
      'api.retrodiffusion.ai',
      'da8ztllw6by0f.cloudfront.net',
      'cloudfront.net'
    ];
    
    // Check if the domain is allowed
    const isDomainAllowed = allowedDomains.some(domain => 
      parsedUrl.hostname === domain || 
      parsedUrl.hostname.endsWith('.' + domain)
    );
    
    if (!isDomainAllowed) {
      return NextResponse.json(
        { error: 'Domain not allowed' },
        { status: 403 }
      );
    }
    
    // Fetch the image
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
} 