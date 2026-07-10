import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const SESSION_NAME = 'qltrungcung_session'
const rawSessionSecret = process.env.SESSION_SECRET
const hasStrongSessionSecret = !!rawSessionSecret && rawSessionSecret.length >= 32
const SESSION_SECRET = new TextEncoder().encode(
  hasStrongSessionSecret ? rawSessionSecret : 'dev-secret-change-in-production-min-32-chars!!'
)

const PUBLIC_PATHS = ['/login']

function isPublicStaticAsset(pathname: string) {
  return /\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|pdf|txt|xml|json|js|css|map)$/i.test(pathname)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next()
  }

  if (isPublicStaticAsset(pathname)) {
    return NextResponse.next()
  }

  if (process.env.NODE_ENV === 'production' && !hasStrongSessionSecret) {
    return redirectToLogin(request)
  }

  const token = request.cookies.get(SESSION_NAME)?.value
  if (!token) {
    return redirectToLogin(request)
  }

  try {
    await jwtVerify(token, SESSION_SECRET)
    return NextResponse.next()
  } catch {
    return redirectToLogin(request)
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
