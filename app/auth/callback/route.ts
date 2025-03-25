import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    
    // Origin validation to prevent CSRF attacks
    const referer = request.headers.get('referer')
    const host = requestUrl.host
    
    // Validate the referer if present
    if (referer) {
      const refererUrl = new URL(referer)
      if (refererUrl.host !== host) {
        console.error('Invalid referer in auth callback', { referer, host })
        return NextResponse.redirect(`${requestUrl.origin}/auth-error?error=invalid_request`)
      }
    }

    if (!code) {
      console.error('No code provided in auth callback')
      return NextResponse.redirect(`${requestUrl.origin}/auth-error?error=no_code`)
    }

    // Limit code length to prevent abuse
    if (code.length > 500) {
      console.error('Auth code too long', { codeLength: code.length })
      return NextResponse.redirect(`${requestUrl.origin}/auth-error?error=invalid_code`)
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session', { error })
      return NextResponse.redirect(`${requestUrl.origin}/auth-error?error=${encodeURIComponent(error.message)}`)
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(requestUrl.origin)
  } catch (error) {
    console.error('Unexpected error in auth callback', { error })
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(`${requestUrl.origin}/auth-error?error=server_error`)
  }
} 