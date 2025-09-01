import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json()

        const authPassword = process.env.AUTH_PASSWORD

        if (!authPassword) {
            return NextResponse.json(
                { success: false, message: 'Authentication not configured' },
                { status: 400 }
            )
        }

        if (password !== authPassword) {
            return NextResponse.json(
                { success: false, message: 'Invalid password' },
                { status: 401 }
            )
        }

        const response = NextResponse.json(
            { success: true, message: 'Login successful' },
            { status: 200 }
        )

        response.cookies.set('cronmaster-auth', 'authenticated', {
            httpOnly: true,
            secure: request.url.startsWith('https://'),
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })

        return response
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
