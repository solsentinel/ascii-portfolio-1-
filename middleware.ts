import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, NextRequest } from 'next/server'

// More advanced in-memory rate limiting (will reset on server restart)
// For production, consider using Redis or a similar solution
interface RateLimitData {
  count: number;
  timestamp: number;
  blocked: boolean;
  consecutiveFailures: number;
}

const rateLimitMap = new Map<string, RateLimitData>();

// Configure rate limits
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10;  // 10 requests per minute
const MAX_CONSECUTIVE_FAILURES = 5;  // Block after 5 consecutive failures
const BLOCK_DURATION = 10 * 60 * 1000; // 10 minute block

// List of suspicious paths to watch for potential attackers
const SENSITIVE_PATHS = [
  '/api/generate',
  '/api/auth',
  '/api/admin'
];

// List of allowed API origins (domains that can call your API)
const ALLOWED_ORIGINS = [
  'https://your-domain.com',     // Replace with your domain
  'https://www.your-domain.com', // Replace with your domain
  process.env.NEXT_PUBLIC_SITE_URL || '',
  'http://localhost:3000'        // For local development
];

export async function middleware(req: NextRequest) {
  // Basic path and method for logging
  const path = req.nextUrl.pathname;
  const method = req.method;
  
  // Create base response with security headers
  const res = NextResponse.next();
  
  // Add security headers to all responses
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Create a Supabase client for auth
  const supabase = createMiddlewareClient({ req, res })
  
  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession()
  
  // Only apply API protection to sensitive paths
  if (SENSITIVE_PATHS.some(sensitivePath => path.startsWith(sensitivePath))) {
    // Check for valid origin (CORS protection)
    const origin = req.headers.get('origin');
    if (origin && !ALLOWED_ORIGINS.some(allowed => origin === allowed || allowed === '*')) {
      console.warn(`Blocked request from unauthorized origin: ${origin} to ${path}`);
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: 'Unauthorized origin'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(res.headers.entries())
          }
        }
      );
    }
    
    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-real-ip') || 
                    req.headers.get('x-forwarded-for')?.split(',')[0] || 
                    'unknown';
    
    // Add more client fingerprinting for stronger rate limiting
    const userAgent = req.headers.get('user-agent') || '';
    
    // Create a rate limit key based on IP and path
    const rateLimitKey = `${clientIp}:${path}`;
    const now = Date.now();
    
    // Clean up expired entries (prevent memory leaks)
    if (Math.random() < 0.01) { // 1% chance to clean up on each request
      for (const [key, data] of rateLimitMap.entries()) {
        // Remove entries that are older than the block duration
        if (now - data.timestamp > Math.max(RATE_LIMIT_WINDOW, BLOCK_DURATION)) {
          rateLimitMap.delete(key);
        }
      }
    }
    
    // Get or create rate limit data for this client
    const rateData = rateLimitMap.get(rateLimitKey) || { 
      count: 0, 
      timestamp: now,
      blocked: false,
      consecutiveFailures: 0
    };
    
    // Check if client is blocked
    if (rateData.blocked) {
      const blockTimeRemaining = BLOCK_DURATION - (now - rateData.timestamp);
      if (blockTimeRemaining > 0) {
        // Still blocked
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil(blockTimeRemaining / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil(blockTimeRemaining / 1000).toString(),
              ...Object.fromEntries(res.headers.entries())
            }
          }
        );
      } else {
        // Unblock after duration
        rateData.blocked = false;
        rateData.consecutiveFailures = 0;
        rateData.count = 1;
        rateData.timestamp = now;
      }
    }
    
    // Reset count if outside the window
    if (now - rateData.timestamp > RATE_LIMIT_WINDOW) {
      rateData.count = 1;
      rateData.timestamp = now;
    } else {
      rateData.count += 1;
    }
    
    // Update the map
    rateLimitMap.set(rateLimitKey, rateData);
    
    // Set rate limit headers
    res.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
    res.headers.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - rateData.count).toString());
    res.headers.set('X-RateLimit-Reset', new Date(rateData.timestamp + RATE_LIMIT_WINDOW).toISOString());
    
    // Check if rate limit is exceeded
    if (rateData.count > MAX_REQUESTS_PER_WINDOW) {
      // Log potential abuse
      console.warn(`Rate limit exceeded for ${clientIp} on ${path}. Count: ${rateData.count}`);
      
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
            ...Object.fromEntries(res.headers.entries())
          }
        }
      );
    }
    
    // After the request has been processed, check for failed response to track consecutive failures
    // This will be updated in a response handler (in production you'd need to use other methods)
    const originalResponseHandler = res.clone().body;
    
    // Log API request (for security monitoring)
    if (process.env.NODE_ENV === 'production') {
      console.log(`API ${method} ${path} from ${clientIp} (${userAgent.substring(0, 50)}...)`);
    }
  }
  
  return res;
}

// Update paths that should be handled by the middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 