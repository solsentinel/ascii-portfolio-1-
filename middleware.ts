import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, NextRequest } from 'next/server'

// Simple in-memory rate limiting (will reset on server restart)
// In a production app, use Redis or similar for persistent rate limiting
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res })
  
  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession()
  
  // Add security headers
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('X-Frame-Options', 'DENY');
  
  // Only rate limit the generate API
  if (req.nextUrl.pathname === '/api/generate') {
    // Get client IP (fallback to forwarded-for or unknown)
    const clientIp = req.headers.get('x-real-ip') || 
                   req.headers.get('x-forwarded-for') || 
                   'unknown';
    const now = Date.now();
    
    // Clean up expired entries (optional, prevents memory leaks)
    if (Math.random() < 0.01) { // 1% chance to clean up on each request
      for (const [key, data] of rateLimitMap.entries()) {
        if (now - data.timestamp > RATE_LIMIT_WINDOW) {
          rateLimitMap.delete(key);
        }
      }
    }
    
    // Get or create rate limit data for this IP
    const rateData = rateLimitMap.get(clientIp) || { count: 0, timestamp: now };
    
    // Reset count if outside the window
    if (now - rateData.timestamp > RATE_LIMIT_WINDOW) {
      rateData.count = 1;
      rateData.timestamp = now;
    } else {
      rateData.count += 1;
    }
    
    // Update the map
    rateLimitMap.set(clientIp, rateData);
    
    // Set rate limit headers
    res.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
    res.headers.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - rateData.count).toString());
    res.headers.set('X-RateLimit-Reset', new Date(rateData.timestamp + RATE_LIMIT_WINDOW).toISOString());
    
    // Check if rate limit is exceeded
    if (rateData.count > MAX_REQUESTS_PER_WINDOW) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: 'Rate limit exceeded. Please try again later.'
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateData.timestamp + RATE_LIMIT_WINDOW).toISOString()
          }
        }
      );
    }
  }
  
  return res
}

// Ensure the middleware is called for all pages
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 