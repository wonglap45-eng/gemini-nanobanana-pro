import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// GPT 系统提示词（图片分析）
const GPT_SYSTEM_PROMPT = `分析产品参考图，生成2条不同的AI图片生成提示词。

要求：
- 每条提示词的中文和英文都至少80-150词
- 分段详细描述
- 纯白背景，尺寸1600×1600
- 2条提示词要有差异（角度/光线/构图不同）

返回JSON（2条用换行+三个短横线分隔）：{"cn": "第1条中文\\n\\n---\\n\\n第2条中文", "en": "First English prompt\\n\\n---\\n\\nSecond English prompt"}`

// Gemini 系统提示词（图片分析）
const GEMINI_SYSTEM_PROMPT = `Analyze the product image and generate 2 DIFFERENT AI image generation prompts.

Requirements:
- Each prompt's Chinese AND English must be 80-150+ words
- Describe in detail with separate paragraphs
- Pure white background, size 1600x1600
- The 2 prompts must differ (different angle/lighting/composition)

Return JSON only (separate 2 prompts with newline + three dashes): 
{"cn": "Prompt1 CN\\n\\n---\\n\\nPrompt2 CN", "en": "Prompt1 EN\\n\\n---\\n\\nPrompt2 EN"}`

// 纯文本需求 → 提示词 的系统提示词（GPT）— 只生成1条
const GPT_TEXT_SYSTEM_PROMPT = `你是一个专业的AI图像提示词工程师。根据用户的文字需求，生成1条高质量AI图片生成提示词。

要求：
- 只生成1条，但必须非常详细、专业（150-200+字）
- 中文和英文版本都要提供
- 包含：主体描述、风格、光线、构图、色彩、背景、氛围等维度
- 适合用于 Gemini Image API 或 DALL-E

⚠️ "en"字段必须是纯正的英文！用英语撰写英文版！

返回JSON格式：
{"cn": "中文提示词内容", "en": "English prompt content written entirely in English"}`

// 纯文本需求 → 提示词 的系统提示词（Gemini）— 只生成1条
const GEMINI_TEXT_SYSTEM_PROMPT = `You are a professional AI image prompt engineer. Based on the user's text requirement, generate 1 high-quality AI image generation prompt.

Requirements:
- Only 1 prompt, but make it very detailed and professional (150-200+ words)
- Provide BOTH Chinese AND English versions
- Include: subject, style, lighting, composition, colors, background, atmosphere
- Compatible with Gemini Image API or DALL-E

⚠️ CRITICAL: The "en" value MUST be written in REAL ENGLISH! No Chinese characters in the English version!

Return JSON only:
{"cn": "Chinese prompt text", "en": "English prompt text - must be real English"}`

async function generateWithGPT(imageDataArray: string[], apiKey: string, textRequirement?: string) {
  const isTextMode = !!textRequirement && (!imageDataArray || imageDataArray.length === 0)
  const systemPrompt = isTextMode ? GPT_TEXT_SYSTEM_PROMPT : GPT_SYSTEM_PROMPT
  const userText = isTextMode
    ? `用户需求：${textRequirement}\n\n请根据以上需求生成AI图片生成提示词。`
    : GPT_SYSTEM_PROMPT + '\n\n分析这张产品图并生成提示词：'

  const contentParts: any[] = [
    { type: 'text', text: userText }
  ]

  if (!isTextMode && imageDataArray) {
    for (const base64Data of imageDataArray) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${base64Data}` }
      })
    }
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://gemini-nanobanana-pro.vercel.app',
      'X-Title': 'Nano Banana Pro'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: contentParts }],
      max_tokens: 3000
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('GPT API error:', response.status, errText)
    throw new Error(`GPT API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const textContent = data.choices?.[0]?.message?.content || ''
  console.log('GPT raw response:', textContent.substring(0, 500))
  return parsePromptJSON(textContent)
}

async function generateWithGemini(imageDataArray: string[], apiKey: string, apiUrl?: string, textRequirement?: string) {
  const baseUrl = apiUrl || 'https://generativelanguage.googleapis.com'
  
  // 按优先级尝试不同模型（已通过 ListModels 验证可用）
  const models = [
    'gemini-2.5-flash',
    'gemini-flash-latest'
  ]

  const isTextMode = !!textRequirement && (!imageDataArray || imageDataArray.length === 0)
  const systemPrompt = isTextMode ? GEMINI_TEXT_SYSTEM_PROMPT : GEMINI_SYSTEM_PROMPT

  const parts: any[] = [{ text: systemPrompt }]

  if (isTextMode) {
    parts.push({ text: `\n\nUser requirement: ${textRequirement}\n\nGenerate 3 different image prompts based on this requirement.` })
  } else if (imageDataArray && imageDataArray.length > 0) {
    parts.push({ text: "\n\nAnalyze this product reference image:" })
    for (const base64Data of imageDataArray) {
      parts.push({
        inline_data: { mime_type: "image/jpeg", data: base64Data }
      })
    }
  } else {
    parts.push({ text: "\n\nGenerate prompts." })
  }

  let lastError: Error | null = null

  // 重试：依次尝试不同模型（503/429 时等2秒再试下一个）
  for (const model of models) {
    try {
      if (lastError) await new Promise(r => setTimeout(r, 2000)) // 等待后重试
      
      const response = await fetch(
        `${baseUrl}/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 3000
            }
          })
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        console.error(`Gemini ${model} error:`, response.status, errText)
        // 503/429 继续尝试下一个模型
        if (response.status === 503 || response.status === 429) {
          lastError = new Error(`Gemini ${model} returned ${response.status}`)
          continue
        }
        throw new Error(`Gemini API error ${response.status}: ${errText}`)
      }

      const data = await response.json()
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      console.log(`Gemini ${model} success, response:`, textContent.substring(0, 300))
      return parsePromptJSON(textContent)
    } catch (e) {
      lastError = e as Error
      if ((e as any).message?.includes('503') || (e as any).message?.includes('429')) continue
      throw e
    }
  }

  throw lastError || new Error('All Gemini models failed')
}

// 检测文本是否包含中文字符（CJK统一汉字范围）
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)
}

// 翻译中文到英文（当AI不遵守指令时作为兜底）
async function translateToEnglish(chineseText: string, mode: 'gpt' | 'gemini', apiKey: string): Promise<string> {
  const prompt = `Translate the following Chinese text into a professional English image generation prompt for AI tools like Gemini or DALL-E. Output ONLY the English translation, nothing else:\n\n${chineseText}`

  if (mode === 'gpt') {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://gemini-nanobanana-pro.vercel.app' },
      body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 2000 })
    })
    if (!resp.ok) throw new Error(`Translation GPT error ${resp.status}`)
    const data = await resp.json()
    return data.choices?.[0]?.message?.content?.trim() || chineseText
  } else {
    // Gemini
    const models = ['gemini-2.5-flash', 'gemini-flash-latest']
    let lastErr: Error | null = null
    for (const model of models) {
      try {
        if (lastErr) await new Promise(r => setTimeout(r, 1500))
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
        })
        if (!resp.ok) { if (resp.status === 503 || resp.status === 429) { lastErr = new Error(`${model} ${resp.status}`); continue } throw new Error(`Gemini trans error ${resp.status}`) }
        const data = await resp.json()
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || chineseText
      } catch (e) { lastErr = e as Error; continue }
    }
    throw lastErr || new Error('Translation failed')
  }
}

function parsePromptJSON(raw: string): { cn: string; en: string } {
  let cleaned = raw.trim()

  // 移除 markdown 代码块
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')

  // 策略1：直接尝试整体解析
  try {
    const parsed = JSON.parse(cleaned)
    if (parsed.cn && parsed.en) return { cn: String(parsed.cn), en: String(parsed.en) }
  } catch (e) { /* 继续下一策略 */ }

  // 策略2：用正则提取最外层 JSON 对象
  const jsonMatch = cleaned.match(/\{[\s\S]*?"cn"[\s\S]*?"en"[\s\S]*?\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.cn && parsed.en) return { cn: String(parsed.cn), en: String(parsed.en) }
    } catch (e: any) { 
      console.error('Strategy2 JSON parse failed:', e.message)
    }
  }

  // 策略3：分别提取 cn 和 en 的值（应对格式错乱）
  const cnMatch = cleaned.match(/"cn"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  const enMatch = cleaned.match(/"en"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (cnMatch?.[1] || enMatch?.[1]) {
    return { 
      cn: cnMatch?.[1]?.replace(/\\n/g, '\n') || raw, 
      en: enMatch?.[1]?.replace(/\\n/g, '\n') || raw 
    }
  }

  // 最终兜底
  console.warn('All parse strategies failed, returning raw')
  return { cn: raw, en: raw }
}

export async function POST(request: NextRequest) {
  try {
    const { mode, imageDataArray, apiKey: customApiKey, apiUrl: customApiUrl, textRequirement } = await request.json()

    if (!mode || !['gpt', 'gemini'].includes(mode)) {
      return NextResponse.json({ error: '请指定模式: gpt 或 gemini' }, { status: 400 })
    }

    const isTextMode = !!textRequirement && (!imageDataArray || imageDataArray.length === 0)
    
    if (!isTextMode && (!imageDataArray || imageDataArray.length === 0)) {
      return NextResponse.json({ error: '请先上传参考图片或填写需求文字' }, { status: 400 })
    }

    if (isTextMode && !textRequirement?.trim()) {
      return NextResponse.json({ error: '请填写您的需求描述' }, { status: 400 })
    }

    let result: { cn: string; en: string }

    if (mode === 'gpt') {
      const apiKey = customApiKey || process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'OpenRouter API Key 未配置' }, { status: 500 })
      }
      result = await generateWithGPT(imageDataArray || [], apiKey, textRequirement)
    } else {
      const apiKey = customApiKey || process.env.GEMINI_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'Gemini API Key 未配置' }, { status: 500 })
      }
      result = await generateWithGemini(imageDataArray || [], apiKey, customApiUrl, textRequirement)
    }

    // 翻译保险：如果英文区包含中文，自动翻译成真正的英文
    if (containsChinese(result.en)) {
      console.log('⚠️ en field contains Chinese, auto-translating to English...')
      try {
        const apiKeyForTrans = mode === 'gpt'
          ? (customApiKey || process.env.OPENROUTER_API_KEY || '')
          : (customApiKey || process.env.GEMINI_API_KEY || '')
        result.en = await translateToEnglish(result.cn || result.en, mode, apiKeyForTrans)
        console.log('✅ Translation completed')
      } catch (transErr: any) {
        console.error('Translation fallback failed:', transErr.message)
        // 翻译失败时保持原值（至少有中文内容可用）
      }
    }

    return NextResponse.json({ success: true, ...result })

  } catch (error) {
    console.error('提示词生成错误:', error)
    const errMsg = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json({
      error: '提示词生成失败',
      details: errMsg
    }, { status: 500 })
  }
}
