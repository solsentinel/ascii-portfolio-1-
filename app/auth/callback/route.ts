import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const error = requestUrl.searchParams.get('error')
    const error_description = requestUrl.searchParams.get('error_description')

    // Log the request details for debugging
    console.log('Auth callback request:', {
      url: request.url,
      origin: requestUrl.origin,
      host: requestUrl.host,
      error,
      error_description
    })

    // If there's an error, redirect to error page with message
    if (error) {
      console.error('Auth callback error:', { error, error_description })
      const errorUrl = new URL('/auth-error', requestUrl.origin)
      errorUrl.searchParams.set('error', error)
      errorUrl.searchParams.set('message', error_description || 'Authentication error')
      return NextResponse.redirect(errorUrl)
    }

    if (code) {
      const supabase = createRouteHandlerClient({ cookies })
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        return NextResponse.redirect(new URL('/auth-error?error=session_error&message=' + encodeURIComponent(sessionError.message), requestUrl.origin))
      }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL('/', requestUrl.origin))
  } catch (error) {
    // Handle any unexpected errors
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/auth-error?error=server_error', request.url))
  }
} 