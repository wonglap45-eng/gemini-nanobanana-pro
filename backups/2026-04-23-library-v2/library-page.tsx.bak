'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import '../nano.css'
import { useLanguage } from '../../i18n/LanguageContext'
import youmindData from './prompts-data.json'

// ==================== 数据类型（v2 纯社区版）====================

type Category = 'all' | 'portrait' | 'infographic' | 'artistic' | 'social-media'
  | 'youtube-thumbnail' | 'comic' | 'poster' | 'app-design' | 'scene' | 'product'

// 社区提示词模板（统一数据结构）
interface CommunityTemplate {
  id: string
  name: string
  description: string
  category: Category
  icon: string
  prompt: string
  cnTranslation?: string   // 中文翻译（独立字段）
  lang: 'cn' | 'en' | 'ja'
  author: { name: string; link: string }
  sourceUrl: string
  publishedAt: string
  images: string[]
  isFeatured: boolean
  tags: string[]
  source: 'youmind'
}

// ==================== 分类定义 ====================

const CATEGORIES: { key: Category; label: string; labelEn: string; icon: string }[] = [
  { key: 'all', label: '全部', labelEn: 'All', icon: '📚' },
  { key: 'portrait', label: '人像摄影', labelEn: 'Portrait', icon: '📸' },
  { key: 'artistic', label: '艺术创意', labelEn: 'Art & Creative', icon: '🎨' },
  { key: 'scene', label: '场景摄影', labelEn: 'Scene Photo', icon: '🏙️' },
  { key: 'poster', label: '海报/广告', labelEn: 'Poster / Ad', icon: '🖼️' },
  { key: 'comic', label: '漫画/故事板', labelEn: 'Comic / Storyboard', icon: '📖' },
  { key: 'social-media', label: '社交媒体', labelEn: 'Social Media', icon: '👤' },
  { key: 'product', label: '产品/电商', labelEn: 'Product / E-com', icon: '🛒' },
  { key: 'infographic', label: '信息图表', labelEn: 'Infographic', icon: '📊' },
  { key: 'app-design', label: 'App/UI设计', labelEn: 'App / UI Design', icon: '📱' },
  { key: 'youtube-thumbnail', label: 'YouTube封面', labelEn: 'YouTube Thumbnail', icon: '🎬' },
]

// ==================== 数据源 ====================

const TEMPLATES: CommunityTemplate[] = youmindData.templates as CommunityTemplate[]

// 固定索引映射：模板ID → 在原始数组中的位置（1-based，永远不变）
const TEMPLATE_INDEX_MAP = new Map(TEMPLATES.map((t, i) => [t.id, i + 1]))

// ==================== 语言标签映射 ====================

const LANG_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  cn: { label: '中文', emoji: '🇨🇳', color: '#ef4444' },
  en: { label: 'English', emoji: '🇬🇧', color: '#3b82f6' },
  ja: { label: '日本語', emoji: '🇯🇵', color: '#a855f7' },
}

// ==================== 图片占位色（按分类）====================

const PLACEHOLDER_COLORS: Record<string, string> = {
  portrait: 'linear-gradient(135deg, #2d1b4e, #1a1a2e)',
  artistic: 'linear-gradient(135deg, #1a3a2e, #0d1b18)',
  scene: 'linear-gradient(135deg, #2a1a1a, #1a1a2e)',
  poster: 'linear-gradient(135deg, #3d2a1a, #1e1a24)',
  comic: 'linear-gradient(135deg, #1a2a3d, #141824)',
  'social-media': 'linear-gradient(135deg, #2a2040, #18182a)',
  product: 'linear-gradient(135deg, #1a3020, #0d1810)',
  infographic: 'linear-gradient(135deg, #1a2835, #101820)',
  'app-design': 'linear-gradient(135deg, #25203a, #161622)',
  'youtube-thumbnail': 'linear-gradient(135deg, #3a1a20, #201015)',
}

// ==================== 分页配置 ====================

const PAGE_SIZE = 30  // 每页显示30条（加载更快）

// ==================== 主组件 ====================

export default function LibraryPage() {
  const { language } = useLanguage()
  const [searchText, setSearchText] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // === Lightbox + 复制 ===
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // === 图片加载状态追踪 ===
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  // 标记图片已加载
  const markImageLoaded = useCallback((id: string) => {
    setLoadedImages(prev => new Set(prev).add(id))
  }, [])

  // 标记图片加载失败
  const markImageFailed = useCallback((id: string) => {
    setFailedImages(prev => new Set(prev).add(id))
  }, [])

  // 筛选逻辑
  const filteredTemplates = useMemo(() => {
    let result = TEMPLATES

    if (activeCategory !== 'all') {
      result = result.filter(t => t.category === activeCategory)
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase().trim()
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.prompt.toLowerCase().includes(query) ||
        t.author.name.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return result
  }, [activeCategory, searchText])

  // 切换分类/搜索时重置到第1页
  useEffect(() => {
    setCurrentPage(1)
    setSelectedId(null)
  }, [activeCategory, searchText])

  // 分页计算
  const totalPages = Math.ceil(filteredTemplates.length / PAGE_SIZE)
  const paginatedTemplates = filteredTemplates.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // 套用模板
  const handleUseTemplate = (t: CommunityTemplate) => {
    const data = JSON.stringify({
      prompt: t.prompt,
      source: 'library-community',
      templateName: t.name
    })
    sessionStorage.setItem('nano-prompt-template', data)
    window.location.href = '/nano#from-library'
  }

  // 一键复制
  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  // Lightbox
  const openLightbox = (e: React.MouseEvent, imgSrc: string, images: string[], idx: number) => {
    e.stopPropagation()
    setLightboxImg(imgSrc)
    setLightboxIdx(idx)
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setLightboxImg(null)
    document.body.style.overflow = ''
  }

  const switchImage = (dir: 1 | -1, images: string[]) => {
    let newIdx = lightboxIdx + dir
    if (newIdx < 0) newIdx = images.length - 1
    if (newIdx >= images.length) newIdx = 0
    setLightboxIdx(newIdx)
    setLightboxImg(images[newIdx])
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0a 0%, #111118 100%)',
      color: '#fff',
      padding: '1.5rem',
    }}>
      {/* ===== 顶部导航 ===== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <a href="/nano" style={{
            fontSize: '0.85rem',
            color: '#888',
            textDecoration: 'none',
            padding: '0.4rem 0.8rem',
            border: '1px solid #333',
            borderRadius: '0.5rem',
            transition: 'all 0.2s'
          }} onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#10b981'
            e.currentTarget.style.color = '#10b981'
          }} onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333'
            e.currentTarget.style.color = '#888'
          }}>← 返回生成</a>
          <h1 style={{ 
            fontSize: '1.4rem', 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #10b981, #00d4ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            📚 提示词库
          </h1>
        </div>

        {/* 搜索框 */}
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder="🔍 搜索... (名称/提示词/作者)"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 1rem 0.55rem 2.2rem',
              borderRadius: '0.6rem',
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#1a1a22',
              color: '#ddd',
              fontSize: '0.82rem',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(16,185,129,0.5)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
          />
          <span style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem' }}>🔍</span>
        </div>
      </div>

      {/* ===== 分类标签栏 ===== */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        paddingBottom: '0.8rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        {CATEGORIES.map(cat => {
          const count = cat.key === 'all'
            ? TEMPLATES.length
            : TEMPLATES.filter(t => t.category === cat.key).length
          if (count === 0 && cat.key !== 'all') return null
          
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '2rem',
                border: activeCategory === cat.key ? '1.5px solid rgba(16,185,129,0.6)' : '1px solid rgba(255,255,255,0.08)',
                background: activeCategory === cat.key
                  ? 'rgba(16,185,129,0.15)'
                  : 'rgba(255,255,255,0.03)',
                color: activeCategory === cat.key ? '#10b981' : '#888',
                fontSize: '0.76rem',
                fontWeight: activeCategory === cat.key ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              {cat.icon} {language === 'zh' ? cat.label : cat.labelEn}
              {activeCategory === cat.key && (
                <span style={{
                  marginLeft: '0.15rem',
                  background: '#10b981',
                  color: '#000',
                  fontSize: '0.62rem',
                  padding: '0.04rem 0.35rem',
                  borderRadius: '1rem',
                  fontWeight: 700
                }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 结果计数 + 分页信息 */}
      <div style={{ fontSize: '0.78rem', color: '#666', marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <span>找到 <span style={{ color: '#10b981', fontWeight: 600 }}>{filteredTemplates.length}</span> 个提示词</span>
        {searchText && <span>· 搜索: "{searchText}"</span>}
        {totalPages > 1 && (
          <span style={{ color: '#3b82f6' }}>
            第 {currentPage}/{totalPages} 页 · 共 {PAGE_SIZE} 条/页
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: '#444' }}>
          🌐 共 {TEMPLATES.length} 条提示词
        </span>
      </div>

      {/* ===== 卡片网格（仅渲染当前页）===== */}
      {paginatedTemplates.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '1rem'
        }}>
          {paginatedTemplates.map((template, idx) => {
            const expanded = selectedId === template.id
            const imgLoaded = loadedImages.has(template.id)
            const imgFailed = failedImages.has(template.id)
            // 固定编号：基于模板在原始数组中的位置（不随搜索/分类/分页变化）
            const fixedIndex = TEMPLATE_INDEX_MAP.get(template.id) ?? 0
            
            return (
              <div
                key={template.id}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(16,185,129,0.12)'
                  e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                }}
                style={{
                  background: 'linear-gradient(135deg, #12121a, #18182a)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  overflow: 'hidden',
                }}
                onClick={() => setSelectedId(expanded ? null : template.id)}
              >
                {/* === 卡片头部：缩略图 === */}
                {template.images.length > 0 && (
                  <div style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '0.6rem',
                    overflow: 'hidden',
                    marginBottom: '0.7rem',
                    position: 'relative',
                    cursor: 'pointer',
                    background: PLACEHOLDER_COLORS[template.category] || '#1a1a24',
                  }}
                  onClick={(e) => openLightbox(e, template.images[0], template.images, 0)}
                  >
                    {/* 加载失败回退：显示分类图标 */}
                    {imgFailed && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: PLACEHOLDER_COLORS[template.category] || '#1a1a24',
                        zIndex: 2,
                        gap: '0.4rem',
                      }}>
                        <span style={{ fontSize: '2.5rem' }}>{template.icon}</span>
                        <span style={{ fontSize: '0.65rem', color: '#555' }}>图片加载失败</span>
                      </div>
                    )}
                    
                    {/* 实际图片 */}
                    {!imgFailed && (
                      <img
                        src={template.images[0]}
                        alt=""
                        srcSet={template.images.length > 1 ? `${template.images[1]} 2x` : undefined}
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          opacity: imgLoaded ? 1 : 0.3,
                          transition: 'opacity 0.5s ease',
                          transform: 'scale(1.02)',
                        }}
                        loading="lazy"
                        decoding="async"
                        onLoad={() => markImageLoaded(template.id)}
                        onError={() => markImageFailed(template.id)}
                      />
                    )}
                    
                    {/* 多图标记 */}
                    {template.images.length > 1 && (
                      <span style={{
                        position: 'absolute', bottom: '0.5rem', right: '0.5rem',
                        background: 'rgba(0,0,0,0.75)', color: '#ccc',
                        fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: '0.3rem',
                        zIndex: 10,
                      }}>🖼️ {template.images.length}</span>
                    )}
                  </div>
                )}

                {/* 无图片时的图标占位 */}
                {template.images.length === 0 && (
                  <div style={{
                    width: '100%', height: '60px', borderRadius: '0.6rem',
                    background: PLACEHOLDER_COLORS[template.category] || '#1a1a24',
                    marginBottom: '0.7rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}>{template.icon}</div>
                )}

                {/* 标题行 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {/* 编号徽章 */}
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
                    color: '#10b981',
                    background: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    padding: '0.06rem 0.4rem',
                    borderRadius: '0.25rem',
                    flexShrink: 0,
                    lineHeight: 1.4,
                  }}>#{fixedIndex}</span>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{template.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.9rem', fontWeight: 600, color: '#eee',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>{template.name}</div>
                  </div>
                  
                  {/* 语言标签 */}
                  <span style={{
                    fontSize: '0.62rem', padding: '0.12rem 0.45rem', borderRadius: '1rem',
                    background: `${LANG_LABELS[template.lang]?.color || '#666'}15`,
                    color: LANG_LABELS[template.lang]?.color || '#888',
                    border: `1px solid ${LANG_LABELS[template.lang]?.color || '#666'}25`,
                    whiteSpace: 'nowrap', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: '0.2rem',
                  }}>
                    {LANG_LABELS[template.lang]?.emoji || ''} {LANG_LABELS[template.lang]?.label || template.lang}
                  </span>
                </div>

                {/* 作者 + 来源 */}
                {template.author.name && (
                  <div style={{
                    fontSize: '0.72rem', color: '#777', marginBottom: '0.5rem',
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                  }}>
                    <span>✍️</span>
                    <span style={{
                      maxWidth: '180px', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>{template.author.name}</span>
                    {template.sourceUrl && (
                      <a href={template.sourceUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ color: '#3b82f6', textDecoration: 'none', marginLeft: 'auto', fontSize: '0.68rem', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                      >查看原文 ↗</a>
                    )}
                  </div>
                )}

                {/* 描述 */}
                {template.description && (
                  <div style={{
                    fontSize: '0.74rem', color: '#999', lineHeight: 1.45, marginBottom: '0.6rem',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>{template.description}</div>
                )}

                {/* 分类标签 */}
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.64rem', padding: '0.1rem 0.45rem', borderRadius: '1rem',
                    background: 'rgba(255,255,255,0.04)', color: '#888',
                    border: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap',
                  }}>
                    {CATEGORIES.find(c => c.key === template.category)?.icon}{' '}
                    {language === 'zh' ? CATEGORIES.find(c => c.key === template.category)?.label : CATEGORIES.find(c => c.key === template.category)?.labelEn}
                  </span>
                  {(template.tags || []).slice(0, 4).map((tag: string) => (
                    <span key={tag} style={{
                      fontSize: '0.64rem', color: '#666',
                      background: 'rgba(255,255,255,0.03)', padding: '0.08rem 0.35rem', borderRadius: '0.25rem'
                    }}>#{tag}</span>
                  ))}
                </div>

                {/* === 提示词预览区域 === */}
                <div style={{
                  background: 'rgba(0,0,0,0.25)', borderRadius: '0.55rem', overflow: 'hidden', marginBottom: '0.7rem',
                }}>
                  {/* --- 原始提示词区 --- */}
                  <div style={{ padding: '0.5rem 0.65rem', borderBottom: template.cnTranslation ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{
                      fontSize: '0.65rem',
                      color: template.lang === 'cn' ? '#10b981' : (template.lang === 'ja' ? '#a855f6' : '#3b82f6'),
                      fontWeight: 600, marginBottom: '0.15rem',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}>
                      💬 {template.lang === 'cn' ? '原文 (中文)' : (template.lang === 'ja' ? '原文 (日本語)' : '原文 (English)')}
                      <span style={{ fontSize: '0.55rem', color: '#555', fontWeight: 400, marginLeft: 'auto' }}>
                        {template.prompt.length} 字符
                      </span>
                      <button onClick={(e) => handleCopy(e, template.prompt, template.id + '-orig')} style={{
                        fontSize: '0.6rem', padding: '0.08rem 0.4rem', borderRadius: '0.25rem',
                        border: `1px solid ${copiedId === template.id + '-orig' ? '#10b981' : 'rgba(255,255,255,0.12)'}`,
                        background: copiedId === template.id + '-orig' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                        color: copiedId === template.id + '-orig' ? '#10b981' : '#888', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>{copiedId === template.id + '-orig' ? '✅ 已复制' : '📋 复制'}</button>
                    </div>
                    <div style={{
                      fontSize: '0.7rem', color: '#bbb', lineHeight: '1.5',
                      maxHeight: expanded ? '350px' : '3.2em', overflow: 'hidden',
                      wordBreak: 'break-word', whiteSpace: 'pre-line', transition: 'max-height 0.3s ease'
                    }}>{template.prompt}</div>
                  </div>

                  {/* --- 中文翻译区 --- */}
                  {template.cnTranslation && (
                    <div style={{ padding: '0.5rem 0.65rem', background: 'rgba(16,185,129,0.03)' }}>
                      <div style={{
                        fontSize: '0.65rem', color: '#10b981', fontWeight: 600, marginBottom: '0.15rem',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                      }}>
                        📝 中文翻译
                        <span style={{ fontSize: '0.55rem', color: '#666', fontWeight: 400, marginLeft: 'auto' }}>AI 翻译 · 仅供参考</span>
                        <button onClick={(e) => handleCopy(e, template.cnTranslation || '', template.id + '-cn')} style={{
                          fontSize: '0.6rem', padding: '0.08rem 0.4rem', borderRadius: '0.25rem',
                          border: `1px solid ${copiedId === template.id + '-cn' ? '#10b981' : 'rgba(16,185,129,0.15)'}`,
                          background: copiedId === template.id + '-cn' ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.05)',
                          color: copiedId === template.id + '-cn' ? '#10b981' : '#6ee7b7', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>{copiedId === template.id + '-cn' ? '✅' : '📋'}</button>
                      </div>
                      <div style={{
                        fontSize: '0.7rem', color: '#c4efd8', lineHeight: '1.5',
                        maxHeight: expanded ? '350px' : '3.2em', overflow: 'hidden',
                        wordBreak: 'break-word', whiteSpace: 'pre-line', transition: 'max-height 0.3s ease'
                      }}>{template.cnTranslation}</div>
                    </div>
                  )}
                </div>

                {/* === 操作按钮 === */}
                <div style={{ display: 'flex', gap: '0.55rem' }}>
                  <button onClick={(e) => { e.stopPropagation(); handleUseTemplate(template) }} style={{
                    flex: 1, padding: '0.48rem',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white', border: 'none', borderRadius: '0.5rem',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 3px 12px rgba(99,102,241,0.25)', transition: 'transform 0.15s'
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >💡 使用此提示词</button>
                  
                  <button onClick={(e) => { e.stopPropagation(); setSelectedId(expanded ? null : template.id) }} style={{
                    padding: '0.48rem 0.65rem',
                    background: expanded ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.05)',
                    color: expanded ? '#3b82f6' : '#888',
                    border: `1px solid ${expanded ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '0.5rem', fontSize: '0.76rem', cursor: 'pointer', transition: 'all 0.2s'
                  }}>{expanded ? '▲ 收起' : '▼ 展开'}</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#555' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>没有找到匹配的提示词</div>
          <div style={{ fontSize: '0.82rem' }}>试试其他关键词 or 选择其他分类</div>
        </div>
      )}

      {/* ===== 分页导航 ===== */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.35rem', marginTop: '1.5rem', flexWrap: 'wrap',
        }}>
          {/* 上一页 */}
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '0.5rem',
              border: `1px solid ${currentPage === 1 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
              background: currentPage === 1 ? 'transparent' : 'rgba(255,255,255,0.05)',
              color: currentPage === 1 ? '#333' : '#ccc',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.78rem', fontWeight: 500,
            }}
          >◀ 上一页</button>

          {/* 页码 */}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 7) {
              pageNum = i + 1
            } else if (currentPage <= 3) {
              pageNum = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 6 + i
            } else {
              pageNum = currentPage - 3 + i
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  minWidth: '34px', height: '34px',
                  borderRadius: '0.45rem',
                  border: `1.5px solid ${pageNum === currentPage ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  background: pageNum === currentPage ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                  color: pageNum === currentPage ? '#10b981' : '#999',
                  fontWeight: pageNum === currentPage ? 700 : 400,
                  fontSize: '0.78rem', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >{pageNum}</button>
            )
          })}

          {/* 省略号 */}
          {totalPages > 7 && currentPage < totalPages - 3 && (
            <span style={{ color: '#444', fontSize: '0.8rem' }}>···</span>
          )}
          {totalPages > 7 && currentPage > 4 && (
            <span style={{ color: '#444', fontSize: '0.8rem', display: totalPages > 10 && currentPage < totalPages - 3 ? 'none' : 'inline' }}>···</span>
          )}

          {/* 下一页 */}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '0.5rem',
              border: `1px solid ${currentPage === totalPages ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
              background: currentPage === totalPages ? 'transparent' : 'rgba(255,255,255,0.05)',
              color: currentPage === totalPages ? '#333' : '#ccc',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.78rem', fontWeight: 500,
            }}
          >下一页 ▶</button>

          {/* 快速跳转 */}
          <span style={{ color: '#555', fontSize: '0.72rem', marginLeft: '0.5rem' }}>
            跳至
            <select
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              style={{
                background: '#1a1a22', border: '1px solid rgba(255,255,255,0.12)',
                color: '#ddd', borderRadius: '0.35rem', padding: '0.2rem 0.3rem',
                margin: '0 0.25rem', fontSize: '0.75rem', cursor: 'pointer',
              }}
            >
              {Array.from({ length: totalPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
            / {totalPages} 页
          </span>
        </div>
      )}

      {/* ===== 底部说明 ===== */}
      <div style={{
        textAlign: 'center', marginTop: '2.5rem', paddingTop: '1.5rem',
        borderTop: '1px solid rgba(255,255,255,0.06)', color: '#555', fontSize: '0.73rem', lineHeight: 1.8
      }}>
        <p>🌐 共 {TEMPLATES.length} 条提示词，来自 <a href="https://youmind.com/zh-CN/nano-banana-pro-prompts" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' } as React.CSSProperties}>YouMind</a></p>
        <p>📌 点击「使用此提示词」后跳转到生成页面，提示词会自动填入</p>
      </div>

      {/* ===== Lightbox 弹窗 ===== */}
      {lightboxImg && (() => {
        const currentTemplate = filteredTemplates.find(t => t.images.includes(lightboxImg)) as CommunityTemplate | undefined
        const images = currentTemplate?.images || [lightboxImg]
        
        return (
          <div onClick={closeLightbox} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.92)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            animation: 'fadeIn 0.15s ease',
          }}>
            {/* 关闭按钮 */}
            <button onClick={closeLightbox} style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: '#fff', fontSize: '1.5rem', width: '2.5rem', height: '2.5rem',
              borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >✕</button>

            {/* 左箭头 */}
            {images.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); switchImage(-1, images) }} style={{
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                color: '#fff', fontSize: '1.3rem', width: '2.5rem', height: '2.5rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >◀</button>
            )}

            {/* 大图 */}
            <img src={lightboxImg} alt="" style={{
              maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain',
              borderRadius: '0.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              animation: 'zoomIn 0.2s ease',
            }} onClick={e => e.stopPropagation()} />

            {/* 右箭头 */}
            {images.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); switchImage(1, images) }} style={{
                position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                color: '#fff', fontSize: '1.3rem', width: '2.5rem', height: '2.5rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >▶</button>
            )}

            {/* 缩略图条 */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem', alignItems: 'center' }}>
                {images.map((img, idx) => (
                  <div key={idx} onClick={(e) => { e.stopPropagation(); setLightboxIdx(idx); setLightboxImg(img) }} style={{
                    width: idx === lightboxIdx ? '48px' : '36px',
                    height: idx === lightboxIdx ? '48px' : '36px',
                    borderRadius: '0.35rem', overflow: 'hidden',
                    border: idx === lightboxIdx ? '2px solid #10b981' : '2px solid transparent',
                    opacity: idx === lightboxIdx ? 1 : 0.5, cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
                <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{lightboxIdx + 1} / {images.length}</span>
              </div>
            )}

            <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
              @keyframes spin { to { transform: rotate(360deg); } }
              div:hover > .lb-hint { opacity: 1 !important; }
            `}</style>
          </div>
        )
      })()}
    </div>
  )
}
