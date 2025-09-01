import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.')) {
        return NextResponse.next()
    }

    const authPassword = process.env.AUTH_PASSWORD

    if (!authPassword) {
        return NextResponse.next()
    }

    const isAuthenticated = request.cookies.has('cronmaster-auth')

    if (pathname === '/login') {
        if (isAuthenticated || !authPassword) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return NextResponse.next()
    }

    if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|site.webmanifest|sw.js|app-icons).*)",
    ],
}
