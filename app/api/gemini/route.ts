import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * 统一使用 Google Gemini 官方 API
 * 模型: gemini-2.5-flash-image
 * 接口: Gemini 原生 generateContent 格式
 * 新增: count 参数支持批量生成多张图片
 * 新增: engine 参数支持 gemini / gpt 双引擎
 */

const DEFAULT_MODEL = 'gemini-2.5-flash-image'
const MAX_COUNT = 5

/**
 * GPT 图片生成 (digifossil gpt-image-2)
 * 返回格式: ![image](url) → 下载图片转 base64
 */
async function callGPTImageGeneration(
  prompt: string,
  apiKey: string,
  apiUrl: string,
  imageDataArray?: string[] | null
): Promise<{ imageData?: string; imageUrl?: string; mimeType?: string; error?: string }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 55000) // Vercel Hobby 60s 限制内

  try {
    // 构建消息
    const messages: any[] = [{ role: 'user', content: prompt }]
    
    if (imageDataArray && imageDataArray.length > 0) {
      // 图生图模式：发送参考图 + prompt
      const contentParts: any[] = [{ type: 'text', text: prompt }]
      for (const b64 of imageDataArray) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${b64}` }
        })
      }
      messages[0] = { role: 'user', content: contentParts }
    }

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-4-image',
        messages
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return { error: `GPT图片API错误 ${response.status}: ${errText.substring(0, 200)}` }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // 解析 markdown 图片链接: ![image](url)
    const urlMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)
    if (!urlMatch) {
      return { error: `未识别的图片格式: ${content.substring(0, 100)}` }
    }

    const imageUrl = urlMatch[1]
    console.log(`[GPT] Image URL: ${imageUrl}`)

    // GPT 图片直接返回 URL（下载+转码耗时长，超 Vercel 60s 限制）
    return {
      imageUrl,
      mimeType: 'image/png'
    }

  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') return { error: 'GPT图片请求超时(60s)' }
    return { error: e.message || String(e) }
  }
}

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
            temperature: 0.4,
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
    const engine = (body.engine as string) || 'gemini'

    if (!prompt) {
      return NextResponse.json({ error: '请提供描述' }, { status: 400 })
    }

    // 根据 engine 选择 API 配置
    let apiKey: string | undefined
    let baseUrl: string
    let modelLabel: string

    if (engine === 'gpt') {
      apiKey = customApiKey || process.env.DIGIFOSSIL_API_KEY
      baseUrl = customApiUrl || process.env.DIGIFOSSIL_API_URL || 'https://www.digifossil.com/v1'
      modelLabel = 'grok-4-image'
    } else {
      apiKey = customApiKey || process.env.GEMINI_API_KEY
      baseUrl = customApiUrl || process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com'
      modelLabel = DEFAULT_MODEL
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API配置缺失' }, { status: 500 })
    }

    console.log(`[${engine.toUpperCase()}] Model=${modelLabel}, Count=${count}, PromptLength=${prompt.length}, HasImage=${!!(imageData || imageDataArray)}`)

    const images: Array<{ imageData?: string; imageUrl?: string; mimeType: string }> = []
    const errors: string[] = []
    let aggregateUsage: any = null

    for (let i = 0; i < count; i++) {
      console.log(`[${engine}] Processing ${i + 1}/${count}...`)
      
      let result: { imageData?: string; imageUrl?: string; mimeType?: string; error?: string; usageMetadata?: any; text?: string }

      if (engine === 'gpt') {
        const gptResult = await callGPTImageGeneration(prompt, apiKey, baseUrl, imageDataArray)
        result = gptResult
      } else {
        const geminiResult = await callGeminiOnceWithImage(prompt, apiKey, baseUrl, imageDataArray, imageData)
        result = geminiResult
        
        if (geminiResult.usageMetadata) {
          if (!aggregateUsage) {
            aggregateUsage = { ...geminiResult.usageMetadata }
          } else {
            aggregateUsage.promptTokenCount += geminiResult.usageMetadata.promptTokenCount || 0
            aggregateUsage.candidatesTokenCount += geminiResult.usageMetadata.candidatesTokenCount || 0
            aggregateUsage.totalTokenCount += geminiResult.usageMetadata.totalTokenCount || 0
          }
        }
      }

      if (result.error && result.error !== '__TEXT_ONLY__') {
        errors.push(`第${i + 1}张失败: ${result.error}`)
        continue
      }

      if (result.imageData || result.imageUrl) {
        images.push({
          imageData: result.imageData,
          imageUrl: result.imageUrl,
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
      model: modelLabel,
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
