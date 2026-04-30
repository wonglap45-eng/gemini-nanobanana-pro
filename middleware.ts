import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 简单内存限流（每个IP每分钟最多请求次数）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_MAX = 60 // 每分钟最大请求数
const RATE_LIMIT_WINDOW_MS = 60000 // 1分钟窗口

// 需要保护的API路径
const PROTECTED_PATHS = ['/api/gemini', '/api/upload-image', '/api/stripe']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // === 1. 安全响应头 ===
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // === 2. API 路由 CORS + 限流 ===
  if (pathname.startsWith('/api/')) {
    // CORS - 允许前端访问自己的API
    const origin = request.headers.get('origin')
    if (origin) {
      // 生产环境应限制为实际域名，这里允许同源 + Vercel 部署
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, stripe-signature')
      response.headers.set('Access-Control-Max-Age', '86400')
    }

    // OPTIONS 预检请求直接返回
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers })
    }

    // 对敏感 API 进行限流
    const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))
    if (isProtected) {
      const ip = request.ip || 
        request.headers.get('x-forwarded-for')?.split(',')[0] || 
        request.headers.get('x-real-ip') || 
        'unknown'
      
      const now = Date.now()
      const record = rateLimitMap.get(ip)

      if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
      } else {
        record.count++
        if (record.count > RATE_LIMIT_MAX) {
          return new Response(
            JSON.stringify({ error: '请求过于频繁，请稍后再试' }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }

      // 定期清理过期记录（每100次请求清理一次）
      if (rateLimitMap.size > 1000) {
        rateLimitMap.forEach((val, key) => {
          if (now > val.resetTime) rateLimitMap.delete(key)
        })
      }
    }
  }

  return response
}

// 匹配所有 API 路由和页面路由（不匹配静态资源）
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)',
  ],
}
