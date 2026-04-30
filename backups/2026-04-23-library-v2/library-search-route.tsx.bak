import { NextRequest, NextResponse } from 'next/server'
import youmindData from '../../nano/library/prompts-data.json'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || ''
  const category = searchParams.get('category') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')

  let templates = youmindData.templates as any[]

  // === 编号查找（纯数字 → 按原始数组索引定位）===
  // 用户看到的 #4320 就是数组第 4320 个元素
  if (/^\d+$/.test(query) && !category) {
    const idx = parseInt(query)
    if (idx >= 1 && idx <= templates.length) {
      const t = templates[idx - 1]
      return NextResponse.json({
        total: 1,
        limit: 1,
        offset: 0,
        hasMore: false,
        results: [{
          id: t.id,
          index: idx,
          name: t.name,
          description: t.description || '',
          prompt: t.prompt,
          cnTranslation: t.cnTranslation || '',
          category: t.category,
          icon: t.icon,
          lang: t.lang,
          images: t.images || [],
        }]
      })
    }
    // 数字超出范围，返回空结果
    return NextResponse.json({ total: 0, limit: 1, offset: 0, hasMore: false, results: [] })
  }

  // 按分类过滤
  if (category && category !== 'all') {
    templates = templates.filter(t => t.category === category)
  }

  // 按关键词过滤（名称/提示词/描述/作者）
  if (query) {
    templates = templates.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.prompt.toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query) ||
      (t.author?.name || '').toLowerCase().includes(query) ||
      (t.tags || []).some((tag: string) => tag.toLowerCase().includes(query))
    )
  }

  const total = templates.length
  const results = templates.slice(offset, offset + limit)

  // 构建原始数组索引映射（用于返回固定编号）
  const originalIndexMap = new Map(youmindData.templates.map((t: any, i: number) => [t.id, i + 1]))

  return NextResponse.json({
    total,
    limit,
    offset,
    hasMore: offset + results.length < total,
    results: results.map((t: any) => ({
      id: t.id,
      index: originalIndexMap.get(t.id) || 0,   // 固定编号（在原始数组中的位置）
      name: t.name,
      description: t.description || '',
      prompt: t.prompt,
      cnTranslation: t.cnTranslation || '',
      category: t.category,
      icon: t.icon,
      lang: t.lang,
      images: t.images || [],
    }))
  })
}
