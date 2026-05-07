import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * 统一使用 Google Gemini 官方 API
 * 模型: gemini-2.5-flash-image
 * 接口: Gemini 原生 generateContent 格式
 * 新增: count 参数支持批量生成多张图片
 */

const DEFAULT_MODEL = 'gemini-2.5-flash-image'
const MAX_COUNT = 5

async function callGeminiOnceWithImage(
  prompt: string,
  apiKey: string,
  baseUrl: string,
  imageDataArray?: string[] | null,
  imageData?: string | null
): Promise<{ imageData?: string; mimeType?: string; text?: string; error?: string; usageMetadata?: any }> {
  
  // 构建 parts
  const parts: any[] = []

  if (imageDataArray && Array.isArray(imageDataArray) && imageDataArray.length > 0) {
    parts.push({ text: prompt })
    for (const base64Data of imageDataArray) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data
        }
      })
    }
  } else if (imageData) {
    parts.push({ text: prompt })
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: imageData,
      }
    })
  } else {
    parts.push({ text: prompt })
  }

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
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            temperature: 0.7 + Math.random() * 0.25,
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
          text: textPart?.text || '',
          usageMetadata: data.usageMetadata
        }
      } else if (textPart) {
        return { text: textPart.text, error: '__TEXT_ONLY__', usageMetadata: data.usageMetadata }
      }
    }

    return { error: '响应中无图片' }

  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') return { error: '请求超时(35s)' }
    return { error: e.message || String(e) }
  }
}

async function geminiHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const prompt = body.prompt as string
    const imageData = body.imageData as string | undefined
    const imageDataArray = body.imageDataArray as string[] | undefined
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

    // 计算图片数据大小（用于排查 "input length too long"）
    let totalImageSize = 0
    if (imageDataArray) {
      imageDataArray.forEach((b64, idx) => {
        const bytes = Math.ceil(b64.length * 0.75) // base64 → 原始字节估算
        totalImageSize += bytes
        console.log(`[Gemini] Image[${idx}] base64_len=${b64.length}, est_bytes=${bytes}`)
      })
    } else if (imageData) {
      totalImageSize = Math.ceil(imageData.length * 0.75)
      console.log(`[Gemini] Image base64_len=${imageData.length}, est_bytes=${totalImageSize}`)
    }
    console.log(`[Gemini] Model=${DEFAULT_MODEL}, Count=${count}, PromptLength=${prompt.length}, HasImage=${!!(imageData || imageDataArray)}, TotalImageBytes=${totalImageSize}, EstRequestKB=${Math.ceil((JSON.stringify({prompt, imageData: imageData || imageDataArray?.[0]?.substring(0,50) || ''}).length + totalImageSize) / 1024)}`)

    const images: Array<{ imageData: string; mimeType: string }> = []
    const errors: string[] = []
    let aggregateUsage: any = null

    for (let i = 0; i < count; i++) {
      console.log(`[Gemini] Processing ${i + 1}/${count}...`)
      
      const result = await callGeminiOnceWithImage(prompt, apiKey, baseUrl, imageDataArray, imageData)

      if (result.usageMetadata) {
        // 聚合 usageMetadata（累加 token count）
        if (!aggregateUsage) {
          aggregateUsage = { ...result.usageMetadata }
        } else {
          aggregateUsage.promptTokenCount += result.usageMetadata.promptTokenCount || 0
          aggregateUsage.candidatesTokenCount += result.usageMetadata.candidatesTokenCount || 0
          aggregateUsage.totalTokenCount += result.usageMetadata.totalTokenCount || 0
        }
      }

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

      if (i < count - 1) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    return NextResponse.json({
      images,
      success: images.length > 0,
      model: DEFAULT_MODEL,
      count: images.length,
      requestedCount: count,
      usageMetadata: aggregateUsage,
      ...(errors.length > 0 ? { errors } : {}),
      message: images.length === 0 
        ? `全部失败: ${errors.join('; ')}` 
        : images.length < count 
          ? `成功 ${images.length}/${count} 张` 
          : undefined
    })

  } catch (error) {
    console.error('生成错误:', error)
    return NextResponse.json({
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return geminiHandler(request)
}
