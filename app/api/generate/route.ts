import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300  // 批量生成最多5分钟

/**
 * 文生图接口（支持批量生成）
 * 使用 gemini-2.5-flash-image 模型
 * 新增: count 参数支持一次请求生成多张图片
 */

const DEFAULT_MODEL = 'gemini-2.5-flash-image'
const MAX_COUNT = 5

async function callGeminiOnce(prompt: string, apiKey: string, baseUrl: string): Promise<{ imageData?: string; mimeType?: string; text?: string; error?: string }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 35000)

  try {
    const response = await fetch(
      `${baseUrl}/v1beta/models/${DEFAULT_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            temperature: 0.7 + Math.random() * 0.25, // 每次随机温度，增加多样性
            maxOutputTokens: 8192
          }
        }),
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return { error: `API错误 ${response.status}: ${errText.substring(0, 200)}` }
    }

    const data = await response.json()

    if (data.candidates?.[0]?.content?.parts) {
      const contentParts = data.candidates[0].content.parts
      const imagePart = contentParts.find((part: any) => part.inlineData || part.inline_data)
      const textPart = contentParts.find((part: any) => part.text)

      if (imagePart) {
        const imgData = imagePart.inlineData || imagePart.inline_data
        return {
          imageData: imgData.data,
          mimeType: imgData.mimeType || imgData.mime_type || 'image/png',
          text: textPart?.text || ''
        }
      } else if (textPart) {
        return { text: textPart.text, error: '__TEXT_ONLY__' }
      }

      return { error: '响应中无图片' }
    }

    return { error: '无法解析响应' }

  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') return { error: '请求超时(35s)' }
    return { error: e.message || String(e) }
  }
}

async function generateHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const prompt = body.prompt as string
    const customApiKey = body.apiKey as string | undefined
    const customApiUrl = body.apiUrl as string | undefined
    const count = Math.min(MAX_COUNT, Math.max(1, Number(body.count) || 1))

    if (!prompt) {
      return NextResponse.json({ error: '请提供描述' }, { status: 400 })
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY
    const baseUrl = customApiUrl || process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com'

    if (!apiKey) {
      return NextResponse.json({ error: 'API配置缺失' }, { status: 500 })
    }

    console.log(`[Generate] Model=${DEFAULT_MODEL}, Count=${count}, PromptLength=${prompt.length}`)

    const images: Array<{ imageData: string; mimeType: string }> = []
    const errors: string[] = []

    // 循环调 N 次 Gemini，每次生成一张
    for (let i = 0; i < count; i++) {
      console.log(`[Generate] Processing ${i + 1}/${count}...`)
      
      const result = await callGeminiOnce(prompt, apiKey, baseUrl)

      if (result.error && result.error !== '__TEXT_ONLY__') {
        errors.push(`第${i + 1}张失败: ${result.error}`)
        continue
      }

      if (result.imageData) {
        images.push({
          imageData: result.imageData,
          mimeType: result.mimeType || 'image/png'
        })
      }

      // 非最后一次，等1秒再继续（避免频率限制）
      if (i < count - 1) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    // 返回结果（即使部分成功也返回已有图片）
    return NextResponse.json({
      images,
      success: images.length > 0,
      model: DEFAULT_MODEL,
      count: images.length,
      requestedCount: count,
      ...(errors.length > 0 ? { errors } : {}),
      message: images.length === 0 
        ? `全部失败: ${errors.join('; ')}` 
        : images.length < count 
          ? `成功 ${images.length}/${count} 张` 
          : undefined
    })

  } catch (error) {
    console.error('生成错误:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    
    return NextResponse.json({
      error: '服务器内部错误',
      details: errMsg
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return generateHandler(request)
}
