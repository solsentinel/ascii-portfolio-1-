import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

// Rate limiting setup
const rateLimit = {
  windowMs: 60 * 1000, // 1 minute
  max: 100 // limit each IP to 100 requests per windowMs
}

// Clean up expired rate limit entries
const cleanupRateLimits = () => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.timestamp < now) {
      rateLimitMap.delete(key)
    }
  }
}

// Run cleanup every minute
setInterval(cleanupRateLimits, 60 * 1000)

export async function middleware(req: NextRequest) {
  // Basic path and method for logging
  const path = req.nextUrl.pathname;
  const method = req.method;
  
  // Create base response with security headers
  const res = NextResponse.next();
  
  // Create a Supabase client for auth
  const supabase = createMiddlewareClient({ req, res })
  
  // Get client IP
  const clientIp = req.headers.get('x-forwarded-for') || 
                  req.headers.get('x-real-ip') || 
                  'unknown'

  // Rate limiting
  const now = Date.now()
  const rateData = rateLimitMap.get(clientIp) || { 
    count: 0, 
    timestamp: now,
    blocked: false,
    consecutiveFailures: 0
  };

  if (rateData.timestamp < now) {
    rateData.count = 0
    rateData.timestamp = now + 60 * 1000
  }

  rateData.count++
  rateLimitMap.set(clientIp, rateData);

  if (rateData.count > 100) {
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  // Add rate limit headers
  res.headers.set('X-RateLimit-Limit', '100')
  res.headers.set('X-RateLimit-Remaining', `${Math.max(0, 100 - rateData.count)}`)
  res.headers.set('X-RateLimit-Reset', `${rateData.timestamp}`)

  // Security Headers
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Content Security Policy
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://*.supabase.co https://api.retrodiffusion.ai`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`
  ].join('; ')

  // Set security headers
  const securityHeaders = {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-DNS-Prefetch-Control': 'off'
  }

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.headers.set(key, value)
  })

  // Refresh session if expired
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
    
    // Add more client fingerprinting for stronger rate limiting
    const userAgent = req.headers.get('user-agent') || '';
    
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