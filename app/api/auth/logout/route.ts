import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const response = NextResponse.json(
            { success: true, message: 'Logout successful' },
            { status: 200 }
        )

        response.cookies.set('cronmaster-auth', '', {
            httpOnly: true,
            secure: request.url.startsWith('https://'),
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        })

        return response
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
