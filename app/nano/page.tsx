'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import './nano.css'
import BrowserWarning from '../components/BrowserWarning'
import { useLanguage } from '../i18n/LanguageContext'
import ShareModal from '../components/ShareModal'
import FreeQuotaModal from '../components/FreeQuotaModal'
import { loadApiConfig, saveApiConfig, type ApiConfig } from '../lib/api-config'

type Mode = 'upload' | 'text'
type Style = 'none' | 'enhance' | 'artistic' | 'anime' | 'photo'

export default function NanoPage() {
  const { language, setLanguage, t } = useLanguage()
  const [mode, setMode] = useState<Mode>('text')
  const [prompt, setPrompt] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [style, setStyle] = useState<Style>('none')
  const [selectedStyleItem, setSelectedStyleItem] = useState<typeof editingQuickPrompts[0] | null>(null)
  // 灵感启发选中项（展示面板用，不填入textarea）
  const [selectedQuickPrompt, setSelectedQuickPrompt] = useState<typeof quickPrompts[0] | null>(null)
  // 模板预览选中项（新文本框展示用，不填入textarea）
  const [selectedTemplatePreview, setSelectedTemplatePreview] = useState<{id: string; index: number; name: string; prompt: string; category: string; icon: string; lang: string; images: string[]; cnTranslation?: string} | null>(null)
  const [aiPromptResult, setAiPromptResult] = useState<{ cn: string; en: string } | null>(null)
  // AI智能提示词模块专用状态（纯文字需求生成，与参考图AI分析隔离）
  const [textAiPromptResult, setTextAiPromptResult] = useState<{ cn: string; en: string } | null>(null)

  // AI 智能写提示词（纯文本需求模式）
  const [showAIPromptPanel, setShowAIPromptPanel] = useState(false)
  const [aiRequirementText, setAiRequirementText] = useState('')
  const [isGeneratingTextPrompt, setIsGeneratingTextPrompt] = useState(false)
  // 图片 Lightbox 状态
  const [lightboxImage, setLightboxImage] = useState<{ src: string; index: number } | null>(null)

  // 模板库快速调用
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateResults, setTemplateResults] = useState<Array<{id: string; index: number; name: string; prompt: string; category: string; icon: string; lang: string; images: string[]; cnTranslation?: string}>>([])
  const [templateSearching, setTemplateSearching] = useState(false)
  // 编号快速查找
  const [templatePickerMode, setTemplatePickerMode] = useState<'search' | 'id'>('search')
  const [templateIdInput, setTemplateIdInput] = useState('')
  const [templateByIdResult, setTemplateByIdResult] = useState<{id: string; index: number; name: string; prompt: string; category: string; icon: string; lang: string; images: string[]; cnTranslation?: string} | null>(null)
  const [templateIdLoading, setTemplateIdLoading] = useState(false)
  // 解析多条提示词：按 --- 分隔
  const promptCards: Array<{ cn: string; en: string }> = useMemo(() => {
    if (!aiPromptResult) return []
    const cnParts = aiPromptResult.cn.split(/\n*---\n*/).map(s => s.trim()).filter(Boolean)
    const enParts = aiPromptResult.en.split(/\n*---\n*/).map(s => s.trim()).filter(Boolean)
    const count = Math.max(cnParts.length, enParts.length, 1)
    return Array.from({ length: count }, (_, i) => ({
      cn: cnParts[i] || cnParts[0] || '',
      en: enParts[i] || enParts[0] || ''
    }))
  }, [aiPromptResult])
  // AI智能提示词模块专用的卡片列表（基于 textAiPromptResult 派生）
  const textPromptCards: Array<{ cn: string; en: string }> = useMemo(() => {
    if (!textAiPromptResult) return []
    const cnParts = textAiPromptResult.cn.split(/\n*---\n*/).map(s => s.trim()).filter(Boolean)
    const enParts = textAiPromptResult.en.split(/\n*---\n*/).map(s => s.trim()).filter(Boolean)
    const count = Math.max(cnParts.length, enParts.length, 1)
    return Array.from({ length: count }, (_, i) => ({
      cn: cnParts[i] || cnParts[0] || '',
      en: enParts[i] || enParts[0] || ''
    }))
  }, [textAiPromptResult])
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [promptSource, setPromptSource] = useState<'preset' | 'gpt' | 'gemini'>('preset')
  const [imageSize, setImageSize] = useState<string>('1k')
  const [generateCount, setGenerateCount] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [generateProgress, setGenerateProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorModalTitle, setErrorModalTitle] = useState('')
  const [errorModalMessage, setErrorModalMessage] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => loadApiConfig())

  // 下载按钮统一样式
  const downloadBtnStyle = {
    padding: '0.6rem 1.2rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
  }

  const quickPrompts = [
    { icon: '🏔️', text: '风景', value: '美丽的自然风景', en: 'Beautiful natural landscape' },
    { icon: '👥', text: '人像', value: '专业人像摄影', en: 'Professional portrait photography' },
    { icon: '🏛️', text: '建筑', value: '现代建筑设计', en: 'Modern architectural design' },
    { icon: '🎨', text: '艺术', value: '抽象艺术作品', en: 'Abstract art masterpiece' },
    { icon: '🚀', text: '科幻', value: '科幻场景', en: 'Sci-fi futuristic scene' },
    { icon: '🌿', text: '自然', value: '自然生态', en: 'Natural ecosystem & wildlife' },
    { icon: '🐾', text: '动物', value: '可爱的动物', en: 'Cute and adorable animals' },
    { icon: '💡', text: '创意', value: '创意设计', en: 'Creative design concept' }
  ]

  // 图像编辑专用快速操作
  const editingQuickPrompts = [
    { icon: '📦', text: '主图要求', value: `请根据我上传的参考图生成独立的产品图片。
生成的图片需要与参考图在产品类型、商业展示感觉、整体质感上相似，
但 结构、排版、标签布局、信息层级、图标位置、装饰元素位置绝对不能和参考图一模一样。
只能参考参考图的产品类型、展示方式和商业风格，
不要直接复制参考图的版式、构图或设计骨架。

图片基础要求：
图片尺寸必须为 1600×1600。
背景必须为 纯白色。
产品必须 单个居中展示。
产品需要 清晰、高质量、专业 地展示。
产品需要完整展示，不能被裁切。
标签必须清晰可见，并且文字易于阅读。
整体设计需要专业、简洁、干净，适合用于 亚马逊主图。
产品周围不能有分散注意力的元素。
不要复杂背景，不要场景化摆拍，不要杂乱道具。

相似但不能照搬：

请生成与参考图相似感觉的图片，
但生成出来的图片必须是 全新原创设计，
不能只是换字、换颜色、轻微改动后的相似版本。
请不要复制参考图中的以下内容：

标签整体结构
标题和副标题的位置
功效文案的排列方式
图标的位置和组合方式
色块的分布方式
装饰元素的位置
整体版面骨架

最终效果要像“参考图启发下重新设计的一张新图”，
而不是“参考图改字版”。`, en: `Please generate product images based on the reference image I uploaded.
The generated images should be similar to the reference image in product category, commercial presentation style, and overall product quality,
but the structure, layout, label design, information hierarchy, icon placement, and decorative element positions must not be identical to the reference image.
Only use the reference image as inspiration for the product type, display style, and commercial tone,
Do not directly copy the layout, composition, or design framework of the reference image.

Basic Image Requirements:
Image size must be 1600 × 1600.
The background must be pure white.
The product must be shown alone and centered.
The product should be displayed in a clear, high-quality, and professional manner.
The product should be fully visible and not cropped.
The label must be clearly visible and easy to read.
The overall design must be professional, clean, and minimal, suitable for an Amazon main image.
There should be no distracting elements around the product.
No complex backgrounds, no lifestyle scenes, and no cluttered props.

Similar but Not Duplicated:

Please create images that have a similar feel to the reference image,
but the generated images must be new and original designs,
not just slightly edited versions with changed text, colors, or minor adjustments.
Do not copy the following elements from the reference image:

Overall label structure
Title and subtitle placement
Arrangement of benefit text
Icon positions and combinations
Color block distribution
Decorative element placement
Overall page/layout framework

The final result should look like "a newly redesigned image inspired by the reference,"
not "a near-duplicate remake of the reference image."` },
    { icon: '✨', text: '智能美化', value: '智能美化图片，增强细节，提高画质，保持原有风格和色调' },
    { icon: '🎭', text: '风格转换', value: '将图片转换为艺术风格，如油画、水彩或素描效果，保持主要内容不变' },
    { icon: '🐛', text: '添加元素', value: '请为这张图片添加一个可爱的小动物在合适的位置，保持原图的风格和色调' },
    { icon: '🌈', text: '色彩优化', value: '优化图片色彩饱和度和对比度，使画面更加生动明亮' },
    { icon: '🌅', text: '光影增强', value: '优化图片的光影效果，增强层次感和立体感，使画面更有深度' },
    { icon: '🔧', text: '智能修复', value: '修复图片中的瑕疵和噪点，优化整体视觉效果' },
    { icon: '👗', text: '穿搭分析', value: '分析图片中的服装搭配，在原图基础上添加标注和建议' },
    { icon: '🔍', text: '详细分析', value: '在原图基础上添加详细的标注说明，分析图片内容和关键元素' }
  ]

  // 页面加载时检查是否需要显示额度耗尽弹窗（首次访问）
  useEffect(() => {
    const hasSeenQuotaModal = localStorage.getItem('hasSeenQuotaModal')
    if (!hasSeenQuotaModal) {
      // 延迟1秒后显示，让页面先加载
      const timer = setTimeout(() => {
        setShowQuotaModal(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  // 从副图模板库读取传递过来的提示词
  useEffect(() => {
    if (window.location.hash === '#from-library') {
      const templateData = sessionStorage.getItem('nano-prompt-template')
      if (templateData) {
        try {
          const data = JSON.parse(templateData)
          setPrompt(data.cn || data.en || '')
          setPromptSource('preset')
          // 清除 hash 和 storage
          window.history.replaceState('', '', '/nano')
          sessionStorage.removeItem('nano-prompt-template')
        } catch (e) {
          console.error('解析模板数据失败:', e)
        }
      }
    }
  }, [])

  // 关闭额度弹窗并记录到 localStorage
  const handleCloseQuotaModal = () => {
    setShowQuotaModal(false)
    localStorage.setItem('hasSeenQuotaModal', 'true')
  }

  // 模板库搜索（防抖）
  const searchTemplateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTemplates = async (query: string) => {
    setTemplateSearch(query)
    if (!query.trim()) {
      setTemplateResults([])
      return
    }
    setTemplateSearching(true)
    try {
      const res = await fetch(`/api/library-search?q=${encodeURIComponent(query)}&limit=20`)
      const data = await res.json()
      setTemplateResults(data.results || [])
    } catch (e) {
      console.error('模板搜索失败:', e)
      setTemplateResults([])
    } finally {
      setTemplateSearching(false)
    }
  }
  const debouncedSearch = (query: string) => {
    if (searchTemplateTimer.current) clearTimeout(searchTemplateTimer.current)
    searchTemplateTimer.current = setTimeout(() => searchTemplates(query), 150)
  }

  // 编号/ID 查找模板
  const fetchTemplateById = async (id: string) => {
    setTemplateIdInput(id)
    if (!id.trim()) { setTemplateByIdResult(null); return }
    setTemplateIdLoading(true)
    try {
      const res = await fetch(`/api/library-search?q=${encodeURIComponent(id)}&limit=1`)
      const data = await res.json()
      // 优先按固定索引匹配，其次按原始 ID 匹配
      const exactMatch = (data.results || []).find((r: any) =>
        r.index === parseInt(id) || r.id === id.trim()
      )
      if (exactMatch) {
        setTemplateByIdResult(exactMatch)
      } else {
        setTemplateByIdResult(null)
      }
    } catch (e) {
      console.error('模板ID查询失败:', e)
      setTemplateByIdResult(null)
    } finally {
      setTemplateIdLoading(false)
    }
  }

  // 选择模板 - 只展示在预览框中（不填入textarea，用户需主动点击"使用"）
  const handleSelectTemplate = (template: { id?: string; index?: number; name?: string; prompt: string; category?: string; icon?: string; lang?: string; images?: string[]; cnTranslation?: string }) => {
    setSelectedTemplatePreview(template as any)
    setShowTemplatePicker(false)
    setTemplateSearch('')
    setTemplateResults([])
    setTemplateByIdResult(null)
    setTemplateIdInput('')
    setTemplatePickerMode('search')

    // 自动切换到文生图模式（如果当前在图片编辑模式）
    if (mode === 'upload') {
      setMode('text')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      // 检查是否超过最大限制（最多10张图片）
      const totalFiles = [...imageFiles, ...files]
      if (totalFiles.length > 10) {
        alert('最多只能上传10张图片')
        // 重置input值以允许重新选择相同的文件
        e.target.value = ''
        return
      }

      setIsUploading(true)

      try {
        // 同步更新文件列表
        const newImageFiles = [...imageFiles, ...files]
        
        // 批量处理所有文件的预览
        const previewPromises = files.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              resolve(reader.result as string)
            }
            reader.readAsDataURL(file)
          })
        })

        // 等待所有预览完成后一次性更新状态
        const newPreviews = await Promise.all(previewPromises)
        
        // 确保状态同步更新
        setImageFiles(newImageFiles)
        setImagePreviews(prev => [...prev, ...newPreviews])
        
        console.log('图片上传完成:', { 
          newFilesCount: files.length, 
          totalFiles: newImageFiles.length,
          totalPreviews: imagePreviews.length + newPreviews.length
        })
      } catch (error) {
        console.error('图片上传失败:', error)
        showError('上传失败', '图片上传失败，请重试')
      } finally {
        setIsUploading(false)
      }
    }

    // 重置input值以允许重新选择相同的文件
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
    if (files.length > 0) {
      // 检查是否超过最大限制（最多10张图片）
      const totalFiles = [...imageFiles, ...files]
      if (totalFiles.length > 10) {
        alert('最多只能上传10张图片')
        return
      }

      setIsUploading(true)

      try {
        // 同步更新文件列表
        const newImageFiles = [...imageFiles, ...files]
        
        // 批量处理所有文件的预览
        const previewPromises = files.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              resolve(reader.result as string)
            }
            reader.readAsDataURL(file)
          })
        })

        // 等待所有预览完成后一次性更新状态
        const newPreviews = await Promise.all(previewPromises)
        
        // 确保状态同步更新
        setImageFiles(newImageFiles)
        setImagePreviews(prev => [...prev, ...newPreviews])
        
        console.log('拖拽上传完成:', { 
          newFilesCount: files.length, 
          totalFiles: newImageFiles.length,
          totalPreviews: imagePreviews.length + newPreviews.length
        })
      } catch (error) {
        console.error('拖拽上传失败:', error)
        showError('上传失败', '图片上传失败，请重试')
      } finally {
        setIsUploading(false)
      }
    } else {
      showError('文件类型错误', '请上传图片文件')
    }
  }

  const compressImage = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        const { width, height } = img
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        
        canvas.width = width * ratio
        canvas.height = height * ratio
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        }, 'image/jpeg', quality)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const convertToBase64 = async (file: File): Promise<string> => {
    // Compress large images first
    const maxSizeMB = 2
    let processedFile = file

    if (file.size > maxSizeMB * 1024 * 1024) {
      processedFile = await compressImage(file)
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(processedFile)
      reader.onload = () => {
        const base64 = reader.result as string
        const base64Data = base64.split(',')[1]
        resolve(base64Data)
      }
      reader.onerror = error => reject(error)
    })
  }

  const convertMultipleToBase64 = async (files: File[]): Promise<string[]> => {
    const promises = files.map(file => convertToBase64(file))
    return Promise.all(promises)
  }

  // 显示错误弹窗的函数
  const showError = (title: string, message: string) => {
    setErrorModalTitle(title)
    setErrorModalMessage(message)
    setShowErrorModal(true)
  }

  // AI 生成提示词 (GPT / Gemini) - 基于图片分析
  const handleAIGeneratePrompt = async (mode: 'gpt' | 'gemini') => {
    if (imageFiles.length === 0) {
      showError('上传提示', '请先上传参考图片')
      return
    }
    if (isGeneratingPrompt) return

    setIsGeneratingPrompt(true)
    setPromptSource(mode)
    try {
      const imageDataArray = await convertMultipleToBase64(imageFiles)
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          imageDataArray,
          apiKey: mode === 'gpt' ? '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' : 'AIzaSyALG1iFkY8iz456waBR0Q2CL9ujWiJytNA'
        })
      })
      const data = await response.json()
      if (!response.ok || data.error) throw new Error(data.error || data.details || '生成失败')
      
      setAiPromptResult({ cn: data.cn, en: data.en })
      // 不清空 selectedStyleItem，编辑风格保持显示
    } catch (err: any) {
      showError('AI生成失败', err.message)
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  // AI 智能写提示词（纯文字需求 → 提示词）
  const handleTextToAIPrompt = async (aiMode: 'gpt' | 'gemini') => {
    if (!aiRequirementText.trim()) {
      showError('输入提示', '请先描述您的需求')
      return
    }
    if (isGeneratingTextPrompt) return

    setIsGeneratingTextPrompt(true)
    setPromptSource(aiMode)
    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: aiMode,
          textRequirement: aiRequirementText,
          apiKey: aiMode === 'gpt' ? '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' : 'AIzaSyALG1iFkY8iz456waBR0Q2CL9ujWiJytNA'
        })
      })
      const data = await response.json()
      if (!response.ok || data.error) throw new Error(data.error || data.details || '生成失败')
      
      // write to independent state (don't pollute red-box aiPromptResult/promptCards)
      setTextAiPromptResult({ cn: data.cn, en: data.en })
    } catch (err: any) {
      showError('AI生成失败', err.message)
    } finally {
      setIsGeneratingTextPrompt(false)
    }
  }

  // 使用AI生成的某一条提示词卡片（填入主编辑框，不关闭AI面板）
  const usePromptCard = (cn: string, en: string) => {
    const textToUse = language === 'zh' ? cn : en
    setPrompt(textToUse)
    setPromptSource('preset')
  }

  const handleGenerate = async () => {
    // 调试：显示当前配置
    console.log('🔍 当前 API 配置:', apiConfig)

    if (mode === 'text' && prompt.length < 3) {
      showError('输入提示', '请输入至少3个字符的描述')
      return
    }
    if (mode === 'upload' && imageFiles.length === 0) {
      showError('上传提示', '请先上传图片')
      return
    }

    if (isUploading) {
      showError('上传提示', '图片正在上传中，请稍候...')
      return
    }

    setLoading(true)
    setResult(null)
    setError('')
    
    // 初始化结果容器（边生成边追加）
    const allImages: Array<{ imageData: string; mimeType: string }> = []
    const errors: string[] = []
    
    // 立即设置初始结果（让结果区域出现）
    setResult({ images: [], success: false, count: 0, requestedCount: generateCount })
    setGenerateProgress({ current: 0, total: generateCount })

    try {
      let imageDataArray = null
      let finalPrompt = prompt

      if (mode === 'upload' && imageFiles.length > 0) {
        imageDataArray = await convertMultipleToBase64(imageFiles)
        const stylePrompt = getStylePrompt(style)
        const imageCountText = imageFiles.length > 1 ? `基于${imageFiles.length}张图片` : '基于上传的图片'
        finalPrompt = stylePrompt ? `${stylePrompt} ${imageCountText} ${prompt || '优化这些图片'}` : (prompt || '优化这些图片')
      } else {
        imageDataArray = null
        const stylePrompt = getStylePrompt(style)
        finalPrompt = stylePrompt ? `${stylePrompt} ${prompt}` : prompt
      }

      // 构建基础请求体（每次都发 count=1）
      const buildRequestBody = () => {
        const base: any = { prompt: finalPrompt, count: 1, timestamp: Date.now() }
        if (imageDataArray) base.imageDataArray = imageDataArray
        if (apiConfig.geminiApiKey) base.apiKey = apiConfig.geminiApiKey
        if (apiConfig.geminiApiUrl) base.apiUrl = apiConfig.geminiApiUrl
        return base
      }

      console.log(`[逐张生成] 开始，共 ${generateCount} 张...`)

      // 逐张生成，每张独立请求
      for (let i = 0; i < generateCount; i++) {
        setGenerateProgress({ current: i + 1, total: generateCount })

        try {
          const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildRequestBody())
          })

          const data = await response.json()

          if (!response.ok) {
            const errMsg = data.error || `HTTP ${response.status}`
            console.error(`[逐张生成] 第${i+1}张失败:`, errMsg)
            
            // 额度不足则中断
            if (response.status === 429 || (errMsg.includes('额度') || errMsg.includes('quota') || errMsg.includes('limit'))) {
              setShowQuotaModal(true)
              break
            }
            
            errors.push(`第${i + 1}张: ${errMsg}`)
            continue
          }

          // 有图片 → 追加到结果
          if (data.images?.length > 0) {
            allImages.push(...data.images)
            // 立即更新状态触发重新渲染（边出边显！）
            setResult({
              images: [...allImages],
              success: true,
              model: data.model,
              count: allImages.length,
              requestedCount: generateCount,
              ...(errors.length > 0 ? { errors } : {})
            })
            console.log(`[逐张生成] 第${i+1}张成功 ✓ (${allImages.length}/${generateCount})`)
          } else {
            errors.push(`第${i + 1}张: 无图片返回`)
          }
        } catch (singleErr: any) {
          console.error(`[逐张生成] 第${i+1}张异常:`, singleErr)
          errors.push(`第${i + 1}张: ${singleErr.message || '网络错误'}`)
          
          // 连续失败不继续
          if (singleErr.message?.includes('fetch') || singleErr.name === 'AbortError') {
            // 单张超时可以跳过继续下一张
            continue
          }
        }

        // 非最后一张等一小会儿再请求下一张
        if (i < generateCount - 1) {
          await new Promise(r => setTimeout(r, 800))
        }
      }

      // 全部结束：更新最终状态（不使用 ...prev 避免旧值覆盖新值）
      const finalSuccess = allImages.length > 0
      setResult({
        images: allImages.length > 0 ? allImages : [],
        success: finalSuccess,
        model: 'gemini-2.5-flash-image',
        count: allImages.length,
        requestedCount: generateCount,
        message: !finalSuccess 
          ? `全部失败: ${errors.join('; ')}` 
          : allImages.length < generateCount 
            ? `成功 ${allImages.length}/${generateCount} 张`
            : undefined,
        ...(errors.length > 0 ? { errors } : {}),
      })

      if (!finalSuccess && errors.length > 0) {
        console.error('[逐张生成] 最终结果:', errors)
      }

    } catch (err) {
      console.error('生成流程错误:', err)
      if (err instanceof Error) {
        showError('发生错误', `发生错误：${err.message}`)
      }
    } finally {
      setGenerateProgress(null)
      setLoading(false)
    }
  }

  const getStylePrompt = (style: Style): string => {
    const styles = {
      none: '',
      enhance: '增强细节，提高画质',
      artistic: '艺术风格，油画效果',
      anime: '动漫风格，二次元',
      photo: '写实照片，真实感'
    }
    return styles[style]
  }

  // 下载图片
  const downloadImage = (imageData: string, mimeType: string = 'image/png') => {
    const link = document.createElement('a')
    link.href = `data:${mimeType};base64,${imageData}`
    link.download = `generated-${Date.now()}.${mimeType.split('/')[1]}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 分享图片
  const shareImage = async (imageData: string, mimeType: string = 'image/png') => {
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(`data:${mimeType};base64,${imageData}`)).blob()
        const file = new File([blob], `generated-${Date.now()}.${mimeType.split('/')[1]}`, { type: mimeType })
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'AI生成的图片',
            text: '查看这张AI生成的图片'
          })
        }
      } catch (error) {
        console.error('分享失败:', error)
        // 降级到复制链接
        copyToClipboard(`data:${mimeType};base64,${imageData}`)
      }
    } else {
      // 降级到复制链接
      copyToClipboard(`data:${mimeType};base64,${imageData}`)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showError('提示', '图片链接已复制到剪贴板')
    }).catch(() => {
      showError('提示', '复制失败，请手动复制')
    })
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 浏览器兼容性警告 */}
      <BrowserWarning />
      {/* Header */}
      <header style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid #1a1a1a'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '0.5rem',
          width: '100%',
          justifyContent: 'center'
        }}>
            <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #10b981, #00a3ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            图图来了
          </h1>
          {/* 副图模板库入口 */}
          <a
            href="/nano/library"
            style={{
              padding: '0.4rem 1rem',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
              border: '1px solid rgba(59,130,246,0.35)',
              borderRadius: '2rem',
              color: '#60a5fa',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'all 0.25s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              boxShadow: '0 2px 12px rgba(59,130,246,0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25))'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(59,130,246,0.15)'
            }}
          >
            📚 副图模板库
          </a>
        </div>

      </header>

      {/* Mode Selector */}
      <div className="mode-selector" style={{ display: 'flex', gap: '1rem', padding: '2rem', justifyContent: 'center' }}>
        <button
          className="mode-button"
          onClick={() => setMode('upload')}
          style={{
            flex: 1,
            maxWidth: '400px',
            padding: '1rem 2rem',
            background: mode === 'upload'
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'transparent',
            border: mode === 'upload' ? 'none' : '1px solid #10b981',
            color: mode === 'upload' ? 'white' : '#10b981',
            borderRadius: '0.75rem',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.3s ease',
            boxShadow: mode === 'upload'
              ? '0 8px 25px rgba(16, 185, 129, 0.3)'
              : 'none',
            transform: mode === 'upload' ? 'translateY(-2px)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (mode !== 'upload') {
              e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.2)'
            }
          }}
          onMouseLeave={(e) => {
            if (mode !== 'upload') {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }
          }}
        >
          {t.mode.upload}
        </button>
        <button
          className="mode-button"
          onClick={() => setMode('text')}
          style={{
            flex: 1,
            maxWidth: '400px',
            padding: '1rem 2rem',
            background: mode === 'text'
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'transparent',
            border: mode === 'text' ? 'none' : '1px solid #10b981',
            color: mode === 'text' ? 'white' : '#10b981',
            borderRadius: '0.75rem',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.3s ease',
            boxShadow: mode === 'text'
              ? '0 8px 25px rgba(16, 185, 129, 0.3)'
              : 'none',
            transform: mode === 'text' ? 'translateY(-2px)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (mode !== 'text') {
              e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.2)'
            }
          }}
          onMouseLeave={(e) => {
            if (mode !== 'text') {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }
          }}
        >
          {t.mode.text}
        </button>
      </div>



      {/* Main Content */}
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0 1.5rem 2rem', maxWidth: '1680px', margin: '0 auto' }}>
        {/* 输入区域 - 三栏布局：上传参考图 | AI智能提示词 | 编辑风格 */}
        <div style={{ display: mode === 'upload' ? 'grid' : 'flex', flexDirection: mode === 'upload' ? undefined : 'column', gridTemplateColumns: mode === 'upload' ? '340px 1fr 430px' : undefined, gap: '1.2rem' }}>
        {/* Column 1: 上传参考图 — text模式横跨全宽 */}
        <div className="col-upload" style={{ gridColumn: mode === 'upload' ? undefined : '1 / -1' }}>
          {mode === 'upload' ? (
            <>
            <div
              className="upload-area"
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                background: 'linear-gradient(135deg, #111111, #1a1a1a)',
                border: '2px dashed rgba(16, 185, 129, 0.3)',
                borderRadius: '1.5rem',
                padding: '1.5rem',
                textAlign: 'center',
                minHeight: '400px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (imagePreviews.length === 0) {
                  document.getElementById('file-upload')?.click()
                }
              }}
            >
              {isUploading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📤</div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#10b981' }}>
                    正在上传图片...
                  </h3>
                  <p style={{ color: '#888' }}>请稍候，正在处理您的图片</p>
                </div>
              ) : imagePreviews.length > 0 ? (
                <div>
                  <div className="image-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: imagePreviews.length === 1 ? '1fr' : imagePreviews.length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem',
                    maxHeight: '220px',
                    overflowY: 'auto'
                  }}>
                    {imagePreviews.map((preview, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <img
                          className="image-preview"
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '0.5rem',
                            border: '2px solid #10b981'
                          }}
                        />
                        <button
                          className="close-button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const newFiles = imageFiles.filter((_, i) => i !== index)
                            const newPreviews = imagePreviews.filter((_, i) => i !== index)
                            setImageFiles(newFiles)
                            setImagePreviews(newPreviews)
                          }}
                          style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            width: '24px',
                            height: '24px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                        <div className="image-number" style={{
                          position: 'absolute',
                          bottom: '5px',
                          left: '5px',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '0.25rem',
                          fontSize: '12px'
                        }}>
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="action-buttons" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                      id="file-upload"
                    />
                    <label
                      className="action-button"
                      htmlFor="file-upload"
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        display: 'inline-block',
                        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.3s ease',
                        fontSize: '0.9rem'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      ➕ 添加更多图片
                    </label>
                    <button
                      className="action-button"
                      onClick={() => {
                        setImageFiles([])
                        setImagePreviews([])
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      🗑️ 清空全部
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '3rem', color: '#10b981', marginBottom: '1rem' }}>📸</div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#10b981' }}>拖拽图片到此处或点击上传</h3>
                  <p style={{ color: '#888', marginBottom: '1rem', lineHeight: '1.5' }}>
                    💡 支持多图上传，最多10张<br />
                    📏 单个文件最大 10MB<br />
                    🎨 支持 PNG, JPG, JPEG, WebP, GIF 格式<br />
                    🔄 上传后可通过对话描述编辑需求
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    style={{
                      padding: '0.75rem 2rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      borderRadius: '0.75rem',
                      cursor: 'pointer',
                      display: 'inline-block',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.3s ease',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    📁 选择图片文件
                  </label>
                </>
              )}
            </div>

            {/* AI 生成提示词按钮 + 结果展示（红框区域） */}
            {mode === 'upload' && (
              <div style={{ marginTop: '0.8rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <button
                    onClick={() => handleAIGeneratePrompt('gpt')}
                    disabled={isGeneratingPrompt || imageFiles.length === 0}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: isGeneratingPrompt && promptSource === 'gpt'
                        ? 'linear-gradient(135deg, #4b5563, #374151)'
                        : 'linear-gradient(135deg, #10a37f, #0d8c6f)',
                      border: 'none',
                      borderRadius: '0.6rem',
                      color: 'white',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: isGeneratingPrompt || imageFiles.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: isGeneratingPrompt || imageFiles.length === 0 ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isGeneratingPrompt && promptSource === 'gpt' ? '⏳ GPT 生成中...' : '🤖 GPT 生成提示词'}
                  </button>
                  <button
                    onClick={() => handleAIGeneratePrompt('gemini')}
                    disabled={isGeneratingPrompt || imageFiles.length === 0}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: isGeneratingPrompt && promptSource === 'gemini'
                        ? 'linear-gradient(135deg, #4b5563, #374151)'
                        : 'linear-gradient(135deg, #4285f4, #3367d6)',
                      border: 'none',
                      borderRadius: '0.6rem',
                      color: 'white',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: isGeneratingPrompt || imageFiles.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: isGeneratingPrompt || imageFiles.length === 0 ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isGeneratingPrompt && promptSource === 'gemini' ? '⏳ Gemini 生成中...' : '✨ Gemini 生成提示词'}
                  </button>
                </div>

                {/* AI 生成结果 — 紧凑左右并排：中文左 | 英文右 */}
                {promptCards.length > 0 && (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '0.5rem',
                    maxHeight: '420px', 
                    overflowY: 'auto'
                  }}>
                    {promptCards.map((card, idx) => (
                      <div key={`cn-${idx}`} style={{
                        background: 'linear-gradient(135deg, #0d0d0d, #161616)',
                        borderRadius: '0.5rem',
                        padding: '0.45rem 0.55rem',
                        border: `1px solid ${promptSource === 'gpt' ? 'rgba(16, 163, 127, 0.35)' : 'rgba(16, 185, 129, 0.2)'}`,
                      }}>
                        <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600, marginBottom: '0.2rem' }}>
                          📝 提示词{idx + 1} · 中文 ({promptSource.toUpperCase()})
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#ddd', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                          {card.cn}
                        </div>
                      </div>
                    ))}
                    {/* 英文列 */}
                    {promptCards.map((card, idx) => (
                      <div key={`en-${idx}`} style={{
                        background: 'linear-gradient(135deg, #0d0d0d, #161616)',
                        borderRadius: '0.5rem',
                        padding: '0.45rem 0.55rem',
                        border: `1px solid ${promptSource === 'gemini' ? 'rgba(66, 133, 244, 0.35)' : 'rgba(59, 130, 246, 0.2)'}`,
                      }}>
                        <div style={{ fontSize: '0.68rem', color: '#3b82f6', fontWeight: 600, marginBottom: '0.2rem' }}>
                          🌐 Prompt{idx + 1} · English ({promptSource.toUpperCase()})
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#bbb', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                          {card.en}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </>
          ) : (
            <div style={{ display: 'flex', gap: '2rem' }}>
              {/* Quick Prompts */}
              <div style={{
                background: 'linear-gradient(135deg, #111111, #1a1a1a)',
                borderRadius: '1.5rem',
                padding: '1.5rem',
                minWidth: '200px',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(16, 185, 129, 0.1)'
              }}>
                <h3 style={{ 
                  fontSize: '1.1rem', 
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  ⚡ 灵感启发
                </h3>
                <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  点击下方标签快速开始创作
                </p>
                <div className="quick-prompts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {quickPrompts.map((item, index) => (
                    <button
                      className="quick-prompt-button"
                      key={index}
                      onClick={() => setSelectedQuickPrompt(item)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: 'transparent',
                        border: '1px solid #333',
                        borderRadius: '0.75rem',
                        color: '#888',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#10b981'
                        e.currentTarget.style.color = '#10b981'
                        e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.05)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#333'
                        e.currentTarget.style.color = '#888'
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>

                {/* 灵感启发 - 选中展示面板（中英双语） */}
                {selectedQuickPrompt && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                    <div style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #0d0d0d, #161616)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '0.75rem',
                      padding: '0.6rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>📝 中文</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(selectedQuickPrompt.value) }}
                          style={{ padding: '0.15rem 0.4rem', border: 'none', borderRadius: '0.3rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', cursor: 'pointer', fontSize: '0.62rem' }}
                        >📋 复制</button>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#ddd', lineHeight: 1.4, whiteSpace: 'pre-line', maxHeight: '140px', overflowY: 'auto' }}>{selectedQuickPrompt.value}</div>
                    </div>
                    {selectedQuickPrompt.en && (
                      <div style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #0d0d0d, #161616)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '0.75rem',
                        padding: '0.6rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.68rem', color: '#3b82f6', fontWeight: 600 }}>🌐 English</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(selectedQuickPrompt.en || '') }}
                            style={{ padding: '0.15rem 0.4rem', border: 'none', borderRadius: '0.3rem', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', cursor: 'pointer', fontSize: '0.62rem' }}
                          >📋 复制</button>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#bbb', lineHeight: 1.4, whiteSpace: 'pre-line', maxHeight: '140px', overflowY: 'auto' }}>{selectedQuickPrompt.en}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Text Input Area */}
              <div style={{ flex: 1 }}>
                <div className="text-input-area" style={{
                  background: 'linear-gradient(135deg, #111111, #1a1a1a)',
                  borderRadius: '1.5rem',
                  padding: '1.5rem',
                  minHeight: '500px',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(16, 185, 129, 0.1)'
                }}>
                  {/* 模板库快捷入口 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                    <h3 style={{ 
                      fontSize: '1.1rem', 
                      marginBottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      AI 图像生成
                    </h3>
                    <button
                      onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(16,185,129,0.25)',
                        background: showTemplatePicker ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                        color: showTemplatePicker ? '#10b981' : '#888',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      📚 从模板库选择
                    </button>
                  </div>

                  {/* 模板库搜索面板 */}
                  {showTemplatePicker && (
                    <div style={{
                      background: 'linear-gradient(135deg, #0d0d0d, #161616)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: '0.8rem',
                      padding: '0.8rem',
                      marginBottom: '1rem',
                    }}>
                      {/* 模式切换 + 输入 */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                        <button
                          onClick={() => setTemplatePickerMode('search')}
                          style={{
                            flex: 1,
                            padding: '0.35rem 0.4rem',
                            border: 'none',
                            borderRadius: '0.4rem 0 0 0.4rem',
                            background: templatePickerMode === 'search' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                            color: templatePickerMode === 'search' ? '#10b981' : '#666',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                          }}
                        >🔍 关键词</button>
                        <button
                          onClick={() => setTemplatePickerMode('id')}
                          style={{
                            flex: 1,
                            padding: '0.35rem 0.4rem',
                            border: 'none',
                            borderRadius: '0 0.4rem 0.4rem 0',
                            background: templatePickerMode === 'id' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                            color: templatePickerMode === 'id' ? '#10b981' : '#666',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                          }}
                        >🔢 编号查找</button>
                      </div>

                      {/* 搜索模式 */}
                      {templatePickerMode === 'search' ? (
                        <>
                          <input
                            type="text"
                            value={templateSearch}
                            onChange={(e) => debouncedSearch(e.target.value)}
                            placeholder='🔍 搜索模板（如：人像、风景、portrait...）'
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.8rem',
                              background: '#1a1a22',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.5rem',
                              color: '#ddd',
                              fontSize: '0.82rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                          {templateSearching && (
                            <div style={{ textAlign: 'center', color: '#666', padding: '1rem', fontSize: '0.82rem' }}>搜索中...</div>
                          )}
                          {!templateSearching && templateResults.length > 0 && (
                            <div style={{ maxHeight: '260px', overflowY: 'auto', marginTop: '0.5rem' }}>
                              {templateResults.map((t, idx) => (
                                <div
                                  key={t.id}
                                  onClick={() => handleSelectTemplate(t)}
                                  style={{
                                    display: 'flex',
                                    gap: '0.6rem',
                                    padding: '0.5rem 0.5rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.08)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                >
                                  <img
                                    src={t.images?.[0] || ''}
                                    alt={t.name}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    loading="lazy"
                                    style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '0.35rem', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, background: '#222' }}
                                  />
                                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.15rem' }}>
                                      <span style={{ fontSize: '0.62rem', color: '#10b981', fontFamily: 'monospace', background: 'rgba(16,185,129,0.12)', padding: '0 0.25rem', borderRadius: '0.2rem' }}>#{t.index || idx+1}</span>
                                      <span>{t.icon}</span>
                                      <span style={{ fontSize: '0.73rem', color: '#ddd', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                                      <span style={{ fontSize: '0.58rem', color: '#555', marginLeft: 'auto', fontFamily: 'monospace' }}>({t.id})</span>
                                    </div>
                                    <div style={{ fontSize: '0.64rem', color: '#666', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {t.prompt.slice(0, 80)}{t.prompt.length > 80 ? '...' : ''}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {!templateSearching && templateSearch && templateResults.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#555', padding: '1rem', fontSize: '0.82rem' }}>未找到匹配的模板</div>
                          )}
                          {!templateSearching && !templateSearch && (
                            <div style={{ textAlign: 'center', color: '#555', padding: '1rem', fontSize: '0.82rem' }}>输入关键词搜索 {language === 'zh' ? '12,588' : '12,588'} 个模板</div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* 编号查找模式 */}
                          <input
                            type="text"
                            value={templateIdInput}
                            onChange={(e) => fetchTemplateById(e.target.value)}
                            placeholder='📋 输入模板编号（如：14300）'
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.8rem',
                              background: '#1a1a22',
                              border: `1px solid ${templateByIdResult ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                              borderRadius: '0.5rem',
                              color: '#ddd',
                              fontSize: '0.82rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                          {templateIdLoading && (
                            <div style={{ textAlign: 'center', color: '#666', padding: '1rem', fontSize: '0.82rem' }}>查找中...</div>
                          )}
                          {!templateIdLoading && templateByIdResult && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <div
                                onClick={() => handleSelectTemplate(templateByIdResult!)}
                                style={{
                                  display: 'flex',
                                  gap: '0.7rem',
                                  padding: '0.65rem',
                                  border: '1px solid rgba(16,185,129,0.3)',
                                  borderRadius: '0.6rem',
                                  background: 'rgba(16,185,129,0.05)',
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.1)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.05)'}
                              >
                                <img
                                  src={templateByIdResult.images?.[0] || ''}
                                  alt={templateByIdResult.name}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, background: '#222' }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#10b981', fontFamily: 'monospace', background: 'rgba(16,185,129,0.2)', padding: '0.1em 0.35em', borderRadius: '0.25rem', fontWeight: 700 }}>#{templateByIdResult.index}</span>
                                    <span>{templateByIdResult.icon}</span>
                                    <span style={{ fontSize: '0.78rem', color: '#eee', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{templateByIdResult.name}</span>
                                  </div>
                                  <div style={{ fontSize: '0.68rem', color: '#999', lineHeight: 1.45, maxHeight: '60px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {templateByIdResult.prompt.slice(0, 120)}{templateByIdResult.prompt.length > 120 ? '...' : ''}
                                  </div>
                                  <div style={{ marginTop: '0.35rem', fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>
                                    ✅ 点击确认使用此提示词 →
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {!templateIdLoading && templateIdInput && !templateByIdResult && (
                            <div style={{ textAlign: 'center', color: '#ef4444', padding: '1rem', fontSize: '0.82rem' }}>未找到编号为 "{templateIdInput}" 的模板</div>
                          )}
                          {!templateIdLoading && !templateIdInput && (
                            <div style={{ textAlign: 'center', color: '#555', padding: '1rem', fontSize: '0.82rem' }}>在搜索结果中查看每条模板的编号，或直接输入已知编号</div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* 模板预览框 - 选中模板后显示（独立预览，不自动填入） */}
                  {selectedTemplatePreview && (
                    <div style={{
                      background: 'linear-gradient(135deg, #0d0d0d, #161616)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '0.8rem',
                      padding: '0.8rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        {selectedTemplatePreview.images?.[0] && (
                          <img src={selectedTemplatePreview.images[0]} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>{selectedTemplatePreview.icon} {selectedTemplatePreview.name}</span>
                            <span style={{ fontSize: '0.62rem', color: '#555', fontFamily: 'monospace', background: 'rgba(16,185,129,0.1)', padding: '0.05em 0.35em', borderRadius: '0.25rem' }}>#{selectedTemplatePreview.index}</span>
                          </div>
                        </div>
                        {/* 操作按钮组 */}
                        <button
                          onClick={() => {
                            const textToUse = selectedTemplatePreview.cnTranslation && language === 'zh' ? selectedTemplatePreview.cnTranslation : selectedTemplatePreview.prompt
                            setPrompt(textToUse)
                          }}
                          style={{ padding: '0.3rem 0.7rem', border: 'none', borderRadius: '0.45rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, flexShrink: 0, boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}
                        >✅ 使用此提示词</button>
                        <button
                          onClick={() => {
                            const textToUse = selectedTemplatePreview.cnTranslation && language === 'zh' ? selectedTemplatePreview.cnTranslation : selectedTemplatePreview.prompt
                            navigator.clipboard.writeText(textToUse)
                          }}
                          style={{ padding: '0.28rem 0.55rem', border: 'none', borderRadius: '0.4rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', cursor: 'pointer', fontSize: '0.7rem', flexShrink: 0 }}
                        >📋 复制</button>
                        <button
                          onClick={() => setSelectedTemplatePreview(null)}
                          style={{ padding: '0.22rem 0.4rem', border: 'none', borderRadius: '0.4rem', background: 'rgba(255,255,255,0.06)', color: '#666', cursor: 'pointer', fontSize: '0.7rem', flexShrink: 0 }}
                        >✕</button>
                      </div>
                      <div style={{
                        fontSize: '0.76rem', color: '#ccc', lineHeight: 1.55,
                        maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-line',
                        wordBreak: 'break-word', background: 'rgba(0,0,0,0.2)',
                        borderRadius: '0.45rem', padding: '0.5rem 0.55rem',
                      }}>
                        {selectedTemplatePreview.cnTranslation && language === 'zh' ? selectedTemplatePreview.cnTranslation : selectedTemplatePreview.prompt}
                      </div>
                      <div style={{ textAlign: 'center', marginTop: '0.45rem', fontSize: '0.68rem', color: '#666' }}>
                        👆 点击「使用此提示词」填入下方编辑框，或「复制」手动粘贴
                      </div>
                    </div>
                  )}

                  <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#888' }}>
                    描述你想要生成的图像
                  </h4>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="例如: 一只可爱的卡通猫咪，坐在彩虹上，梦幻风格，柔和的色彩..."
                    style={{
                      width: '100%',
                      minHeight: '350px',
                      background: 'linear-gradient(135deg, #1a1a1a, #222222)',
                      border: '1px solid #333',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      color: 'white',
                      fontSize: '1rem',
                      resize: 'vertical',
                      whiteSpace: 'pre-line',
                      transition: 'all 0.3s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#10b981'
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.2)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#333'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <div style={{ 
                    marginTop: '0.5rem', 
                    textAlign: 'right',
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>
                    {prompt.length}/5000
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* 生成结果 - 直接在左侧上传框下方 */}
        {result && (
        <div style={{
          marginTop: '1rem',
          background: 'linear-gradient(135deg, #111111, #1a1a1a)',
          borderRadius: '1.5rem',
          padding: '1.5rem',
          border: '1px solid rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '0.8rem' }}>
            <h3 style={{
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #10b981, #00d4ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
            ✨ 生成结果
          </h3>
          </div>

          {/* 多图展示（新格式） */}
          {result.images && result.images.length > 0 ? (
            <div>
              {/* 逐张生成中提示 */}
              {loading && generateProgress && generateProgress.current <= generateProgress.total && (
                <div style={{
                  textAlign: 'center',
                  padding: '0.5rem',
                  marginBottom: '0.8rem',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(0,212,255,0.1))',
                  borderRadius: '0.6rem',
                  border: '1px solid rgba(16,185,129,0.3)'
                }}>
                  <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 600 }}>
                    ⏳ 正在生成第 {generateProgress.current}/{generateProgress.total} 张...
                  </span>
                </div>
              )}
              
              {/* 图片计数 */}
              {result.images.length > 1 && (
                <div style={{ fontSize: '0.72rem', color: '#666', textAlign: 'center', marginBottom: '0.5rem' }}>
                  共 {result.images.length} 张{result.requestedCount && result.requestedCount > result.images.length ? `（请求${result.requestedCount}张）` : ''}
                </div>
              )}
              <div style={{
                display: 'grid',
                gridTemplateColumns: result.images.length === 1 ? '1fr' : result.images.length === 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                gap: '0.8rem',
                marginBottom: '0.8rem'
              }}>
                {result.images.map((img: any, idx: number) => (
                  <div key={idx} style={{ 
                    position: 'relative',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #12121a, #18182a)',
                    borderRadius: '0.75rem',
                    padding: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {/* 图片 - 点击放大 */}
                    <img
                      id={`generated-image-${idx}`}
                      className="result-image"
                      src={`data:${img.mimeType || 'image/png'};base64,${img.imageData}`}
                      alt={`Generated ${idx + 1}`}
                      style={{
                        width: '100%',
                        maxHeight: '380px',
                        borderRadius: '0.55rem',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        objectFit: 'contain',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                      }}
                      onClick={() => setLightboxImage({ src: `data:${img.mimeType || 'image/png'};base64,${img.imageData}`, index: idx })}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                    />
                    {/* 🔍 放大标记 */}
                    <span style={{
                      position: 'absolute', top: '0.7rem', right: '0.7rem',
                      background: 'rgba(0,0,0,0.6)', color: '#ccc', fontSize: '0.65rem',
                      padding: '0.15rem 0.45rem', borderRadius: '0.3rem', pointerEvents: 'none',
                    }}>🔍 点击放大</span>
                    {/* 底部操作栏 */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: '0.4rem', gap: '0.4rem',
                    }}>
                      <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: 600 }}>#{idx + 1}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadImage(img.imageData, img.mimeType || 'image/png') }}
                        style={{
                          padding: '0.25rem 0.6rem', border: 'none', borderRadius: '0.35rem',
                          background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                          cursor: 'pointer', fontSize: '0.7rem', fontWeight: 500,
                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                        }}
                      >📥 下载</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Lightbox 放大弹窗 */}
              {lightboxImage && (
                <div
                  onClick={() => setLightboxImage(null)}
                  style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.92)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                    animation: 'lightboxFadeIn 0.15s ease',
                  }}
                >
                  {/* 关闭按钮 */}
                  <button
                    onClick={() => setLightboxImage(null)}
                    style={{
                      position: 'absolute', top: '1.2rem', right: '1.2rem',
                      background: 'rgba(255,255,255,0.12)', border: 'none',
                      color: '#fff', fontSize: '1.4rem', width: '2.8rem', height: '2.8rem',
                      borderRadius: '50%', cursor: 'pointer', zIndex: 10001,
                    }}
                  >✕</button>
                  {/* 左右切换 */}
                  {result.images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const newIdx = lightboxImage.index === 0 ? result.images.length - 1 : lightboxImage.index - 1
                          const prevImg = result.images[newIdx]
                          setLightboxImage({ src: `data:${prevImg.mimeType || 'image/png'};base64,${prevImg.imageData}`, index: newIdx })
                        }}
                        style={{
                          position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)',
                          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                          color: '#fff', fontSize: '1.4rem', width: '2.8rem', height: '2.8rem',
                          cursor: 'pointer', zIndex: 10001,
                        }}
                      >◀</button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const newIdx = lightboxImage.index === result.images.length - 1 ? 0 : lightboxImage.index + 1
                          const nextImg = result.images[newIdx]
                          setLightboxImage({ src: `data:${nextImg.mimeType || 'image/png'};base64,${nextImg.imageData}`, index: newIdx })
                        }}
                        style={{
                          position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)',
                          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                          color: '#fff', fontSize: '1.4rem', width: '2.8rem', height: '2.8rem',
                          cursor: 'pointer', zIndex: 10001,
                        }}
                      >▶</button>
                    </>
                  )}
                  {/* 大图 */}
                  <img
                    src={lightboxImage.src}
                    alt="Preview"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain',
                      borderRadius: '0.6rem', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    }}
                  />
                  {/* 底部信息 */}
                  <div style={{ color: '#888', fontSize: '0.82rem', marginTop: '1rem' }}>
                    {lightboxImage.index + 1} / {result.images.length}
                  </div>
                  {/* 下载当前大图 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentImg = result.images[lightboxImage.index]
                      downloadImage(currentImg.imageData, currentImg.mimeType || 'image/png')
                    }}
                    style={{
                      marginTop: '0.8rem', padding: '0.55rem 1.5rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                      borderRadius: '0.5rem', color: 'white', cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: 600,
                    }}
                  >📥 下载此图</button>
                  <style>{`
                    @keyframes lightboxFadeIn { from { opacity: 0; } to { opacity: 1; } }
                  `}</style>
                </div>
              )}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                {/* 下载全部按钮 */}
                <button
                  onClick={() => {
                    result.images.forEach((img: any, idx: number) => {
                      const imgEl = document.getElementById(`generated-image-${idx}`) as HTMLImageElement
                      if (imgEl) {
                        const canvas = document.createElement('canvas')
                        const ctx = canvas.getContext('2d')
                        canvas.width = imgEl.naturalWidth
                        canvas.height = imgEl.naturalHeight
                        ctx?.drawImage(imgEl, 0, 0)
                        canvas.toBlob((blob) => {
                          if (blob) {
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `nano-banana-${idx + 1}-${Date.now()}.png`
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            URL.revokeObjectURL(url)
                          }
                        }, 'image/png')
                      }
                    })
                  }}
                  style={downloadBtnStyle}
                >
                  📥 下载全部 ({result.images?.length || 0}张)
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                  }}
                >
                  🔗 {t.result.share}
                </button>
              </div>
            </div>
          ) : result.imageData || result.imageUrl ? (
            /* 单图展示（旧格式兼容） */
            <div style={{ textAlign: 'center' }}>
              <img
                id="generated-image"
                className="result-image"
                src={result.imageUrl || `data:${result.mimeType};base64,${result.imageData}`}
                alt="Generated"
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  borderRadius: '1rem',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
                }}
              />
              <div style={{
                marginTop: '0.8rem',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => {
                    const img = document.getElementById('generated-image') as HTMLImageElement
                    if (img) {
                      const canvas = document.createElement('canvas')
                      const ctx = canvas.getContext('2d')
                      canvas.width = img.naturalWidth
                      canvas.height = img.naturalHeight
                      ctx?.drawImage(img, 0, 0)

                      canvas.toBlob((blob) => {
                        if (blob) {
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `nano-banana-${Date.now()}.png`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                        }
                      }, 'image/png')
                    }
                  }}
                  style={downloadBtnStyle}
                >
                  📥 {t.result.download}
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                  }}
                >
                  🔗 {t.result.share}
                </button>
              </div>
            </div>
          ) : result.text || result.content || result.message ? (
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '0.75rem',
              padding: '1.2rem',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '0.95rem', color: '#ccc', lineHeight: '1.6' }}>
                {result.text || result.content || result.message}
              </p>
            </div>
          ) : null}
        </div>
        )}

        </div>

        {/* Column 2: 🤖 AI智能提示词 — 仅图生图模式显示 */}
        <div className="col-ai-prompt" style={{ display: mode === 'upload' ? 'block' : 'none' }}>

          {/* ===== 🤖 AI智能提示词生成 — 独立模块 ===== */}
          <div style={{
            background: 'linear-gradient(135deg, #0f0f1a, #16162a)',
            borderRadius: '1.3rem',
            padding: '1.15rem',
            marginBottom: '1rem',
            boxShadow: '0 6px 24px rgba(99,102,241,0.10)',
            border: showAIPromptPanel ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(99,102,241,0.13)',
            transition: 'all 0.3s ease'
          }}>
            {/* 标题栏 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showAIPromptPanel ? '0.75rem' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.05rem' }}>🤖</span>
                <span style={{ fontSize: '0.95rem', background: 'linear-gradient(135deg, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>AI 智能提示词</span>
              </div>
              <button
                onClick={() => { setShowAIPromptPanel(!showAIPromptPanel); if (!showAIPromptPanel) setAiPromptResult(null) }}
                style={{
                  padding: '0.28rem 0.65rem', borderRadius: '0.4rem', border: 'none',
                  background: showAIPromptPanel ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                  color: showAIPromptPanel ? '#f87171' : '#888', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                {showAIPromptPanel ? '✕ 收起' : '▶ 打开'}
              </button>
            </div>

            {!showAIPromptPanel ? (
              /* 收起状态 */
              <div style={{
                textAlign: 'center', padding: '1rem 0.4rem',
                background: 'rgba(99,102,241,0.04)', borderRadius: '0.7rem',
                border: '1px dashed rgba(99,102,241,0.18)'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '0.25rem' }}>描述你的需求，AI 自动生成专业绘图提示词</div>
                <div style={{ fontSize: '0.65rem', color: '#555' }}>支持 Gemini / GPT 双引擎 · 中英双语输出</div>
              </div>
            ) : (
              /* 展开状态 */
              <div>
                {/* 需求输入 */}
                <div style={{ fontSize: '0.76rem', color: '#a5b4fc', fontWeight: 600, marginBottom: '0.35rem' }}>✍️ 描述你的出图需求</div>
                <textarea
                  value={aiRequirementText}
                  onChange={(e) => setAiRequirementText(e.target.value)}
                  placeholder={"例如：\n我需要一张电商产品主图，展示一个白色的智能保温杯，纯白色背景，专业商业摄影风格..."}
                  style={{
                    width: '100%', minHeight: '90px', maxHeight: '140px',
                    background: '#12121e', border: '1px solid rgba(99,102,241,0.22)', borderRadius: '0.55rem',
                    padding: '0.55rem', color: '#ddd', fontSize: '0.8rem', resize: 'vertical',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '0.55rem',
                    lineHeight: 1.5
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.22)'}
                />

                {/* 双引擎按钮 */}
                <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.6rem' }}>
                  <button
                    onClick={() => handleTextToAIPrompt('gemini')}
                    disabled={isGeneratingTextPrompt || !aiRequirementText.trim()}
                    style={{
                      flex: 1, padding: '0.45rem 0.5rem', border: 'none', borderRadius: '0.55rem',
                      background: isGeneratingTextPrompt && promptSource === 'gemini' ? '#374151' : 'linear-gradient(135deg, #4285f4, #3367d6)',
                      color: 'white', fontSize: '0.8rem', fontWeight: 600,
                      cursor: (isGeneratingTextPrompt || !aiRequirementText.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (isGeneratingTextPrompt || !aiRequirementText.trim()) ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    {isGeneratingTextPrompt && promptSource === 'gemini' ? '⏳ Gemini 生成中...' : '✨ Gemini 生成'}
                  </button>
                  <button
                    onClick={() => handleTextToAIPrompt('gpt')}
                    disabled={isGeneratingTextPrompt || !aiRequirementText.trim()}
                    style={{
                      flex: 1, padding: '0.45rem 0.5rem', border: 'none', borderRadius: '0.55rem',
                      background: isGeneratingTextPrompt && promptSource === 'gpt' ? '#374151' : 'linear-gradient(135deg, #10a37f, #0d8c6f)',
                      color: 'white', fontSize: '0.8rem', fontWeight: 600,
                      cursor: (isGeneratingTextPrompt || !aiRequirementText.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (isGeneratingTextPrompt || !aiRequirementText.trim()) ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    {isGeneratingTextPrompt && promptSource === 'gpt' ? '⏳ GPT 生成中...' : '🤖 GPT 生成'}
                  </button>
                </div>

                {/* 加载状态 */}
                {isGeneratingTextPrompt && (
                  <div style={{
                    textAlign: 'center', padding: '1rem', color: '#a5b4fc', fontSize: '0.82rem',
                    background: 'rgba(99,102,241,0.06)', borderRadius: '0.55rem', marginBottom: '0.4rem'
                  }}>
                    ⏳ AI 正在分析您的需求，正在撰写专业提示词...
                  </div>
                )}

                {/* 单条提示词结果 - 完整展开 */}
                {textPromptCards.length > 0 && !isGeneratingTextPrompt && (
                  <div>
                    <div style={{ fontSize: '0.73rem', color: '#10b981', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>✅ 提示词已生成</span>
                      <button
                        onClick={() => usePromptCard(textPromptCards[0].cn, textPromptCards[0].en)}
                        style={{ padding: '0.25rem 0.6rem', border: 'none', borderRadius: '0.4rem', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}
                      >📋 使用此提示词</button>
                    </div>
                    {/* 中文 */}
                    <div style={{
                      background: 'linear-gradient(135deg, #0c0c14, #14142a)',
                      border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.55rem',
                      padding: '0.55rem 0.65rem', marginBottom: '0.4rem'
                    }}>
                      <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, marginBottom: '0.25rem' }}>📝 中文版</div>
                      <div style={{ fontSize: '0.78rem', color: '#ddd', lineHeight: 1.6, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                        {textPromptCards[0].cn}
                      </div>
                    </div>
                    {/* 英文 */}
                    <div style={{
                      background: 'linear-gradient(135deg, #0c0c14, #14142a)',
                      border: '1px solid rgba(59,130,246,0.2)', borderRadius: '0.55rem',
                      padding: '0.55rem 0.65rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700 }}>🌐 English Version</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(textPromptCards[0].en)}
                          style={{ padding: '0.15rem 0.4rem', border: 'none', borderRadius: '0.3rem', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', cursor: 'pointer', fontSize: '0.62rem' }}
                        >复制英文</button>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#ccc', lineHeight: 1.58, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                        {textPromptCards[0].en}
                      </div>
                    </div>
                  </div>
                )}

                {/* 空状态提示 */}
                {!isGeneratingTextPrompt && textPromptCards.length === 0 && aiRequirementText.trim() === '' && (
                  <div style={{ textAlign: 'center', padding: '0.7rem 0.4rem', fontSize: '0.7rem', color: '#444', fontStyle: 'italic' }}>
                    ↑ 在上方输入框描述你的需求，然后选择 AI 引擎生成
                  </div>
                )}
              </div>
            )}
          </div>

        </div>{/* end col-ai-prompt */}

        {/* Column 3: 🎨 编辑风格 + 其他 — 仅图生图模式显示 */}
        <div className="col-edit" style={{ display: mode === 'upload' ? 'block' : 'none' }}>

          <div style={{
            background: 'linear-gradient(135deg, #111111, #1a1a1a)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(16, 185, 129, 0.1)'
          }}>

            {/* 编辑风格 - 左右布局：按钮 + 详情面板 */}
            <div style={{
              background: 'linear-gradient(135deg, #111111, #1a1a1a)',
              borderRadius: '1rem',
              padding: '1rem',
              marginBottom: '1rem',
              border: '1px solid rgba(16, 185, 129, 0.15)'
            }}>
              <h4 style={{ fontSize: '0.95rem', color: '#10b981', marginBottom: '0.75rem' }}>🎨 编辑风格</h4>
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                {/* 左侧按钮网格 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.45rem', flexShrink: 0 }}>
                  {editingQuickPrompts.slice(0, 7).map((item: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedStyleItem(item)}
                      style={{
                        padding: '0.45rem 0.2rem',
                        backgroundColor: selectedStyleItem?.text === item.text ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        border: selectedStyleItem?.text === item.text ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid #333',
                        borderRadius: '0.5rem',
                        color: selectedStyleItem?.text === item.text ? '#10b981' : '#888',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.1rem',
                        fontSize: '0.72rem'
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>

                {/* 右侧：预设详情面板 */}
                {selectedStyleItem ? (
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
                    <div style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #0d0d0d, #161616)',
                      borderRadius: '0.5rem',
                      padding: '0.45rem 0.55rem',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>📝 中文</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(selectedStyleItem.value) }}
                          style={{ padding: '0.15rem 0.4rem', border: 'none', borderRadius: '0.3rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', cursor: 'pointer', fontSize: '0.62rem' }}
                        >📋 复制</button>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#ddd', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>{selectedStyleItem.value}</div>
                    </div>
                    {selectedStyleItem.en && (
                      <div style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #0d0d0d, #161616)',
                        borderRadius: '0.5rem',
                        padding: '0.45rem 0.55rem',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.68rem', color: '#3b82f6', fontWeight: 600 }}>🌐 English</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(selectedStyleItem.en || '') }}
                            style={{ padding: '0.15rem 0.4rem', border: 'none', borderRadius: '0.3rem', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', cursor: 'pointer', fontSize: '0.62rem' }}
                          >📋 复制</button>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#bbb', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>{selectedStyleItem.en}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #0d0d0d, #161616)',
                    borderRadius: '0.6rem',
                    border: '1px dashed #333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '70px'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#555' }}>👈 点击预设 或 左侧用 AI 生成</span>
                  </div>
                )}
              </div>
            </div>
{mode === 'upload' && (
              <div style={{ marginBottom: '1.5rem' }}>
                {/* 模板库快捷入口（编辑模式） */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '0.9rem', color: '#666', margin: 0, flex: 1 }}>
                    例如: 将图片转换为油画风格，增加暖色调，让画面更加生动...
                  </p>
                  <button
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(16,185,129,0.25)',
                      background: showTemplatePicker ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                      color: showTemplatePicker ? '#10b981' : '#888',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    📚 从模板库选
                  </button>
                </div>

                {/* 模板库搜索面板（编辑模式复用） */}
                {showTemplatePicker && (
                  <div style={{
                    background: 'linear-gradient(135deg, #0d0d0d, #161616)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '0.8rem',
                    padding: '0.8rem',
                    marginBottom: '1rem',
                  }}>
                    {/* 模式切换 */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <button onClick={() => setTemplatePickerMode('search')} style={{ flex: 1, padding: '0.3rem', border: 'none', borderRadius: '0.4rem 0 0 0.4rem', background: templatePickerMode === 'search' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)', color: templatePickerMode === 'search' ? '#10b981' : '#666', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>🔍 关键词</button>
                      <button onClick={() => setTemplatePickerMode('id')} style={{ flex: 1, padding: '0.3rem', border: 'none', borderRadius: '0 0.4rem 0.4rem 0', background: templatePickerMode === 'id' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)', color: templatePickerMode === 'id' ? '#10b981' : '#666', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>🔢 编号查找</button>
                    </div>

                    {templatePickerMode === 'search' ? (
                      <>
                        <input type="text" value={templateSearch} onChange={(e) => debouncedSearch(e.target.value)} placeholder='🔍 搜索模板...' autoFocus style={{ width: '100%', padding: '0.5rem 0.75rem', background: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#ddd', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                        {templateSearching && <div style={{ textAlign: 'center', color: '#666', padding: '0.8rem', fontSize: '0.8rem' }}>搜索中...</div>}
                        {!templateSearching && templateResults.length > 0 && (
                          <div style={{ maxHeight: '240px', overflowY: 'auto', marginTop: '0.4rem' }}>
                            {templateResults.map((t, idx) => (
                              <div key={t.id} onClick={() => { handleSelectTemplate(t); setMode('upload') }} style={{ display: 'flex', gap: '0.55rem', padding: '0.45rem 0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.08)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                <img src={t.images?.[0] || ''} alt={t.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} loading="lazy" style={{ width: '46px', height: '46px', objectFit: 'cover', borderRadius: '0.35rem', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, background: '#222' }} />
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.12rem' }}>
                                    <span style={{ fontSize: '0.58rem', color: '#10b981', fontFamily: 'monospace', background: 'rgba(16,185,129,0.12)', padding: '0 0.22rem', borderRadius: '0.2rem' }}>#{t.index || idx+1}</span>
                                    <span>{t.icon}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#ddd', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                                    <span style={{ fontSize: '0.55rem', color: '#555', marginLeft: 'auto', fontFamily: 'monospace' }}>({t.id})</span>
                                  </div>
                                  <div style={{ fontSize: '0.61rem', color: '#666', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.prompt.slice(0, 70)}{t.prompt.length > 70 ? '...' : ''}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {!templateSearching && templateSearch && templateResults.length === 0 && (
                          <div style={{ textAlign: 'center', color: '#555', padding: '0.8rem', fontSize: '0.82rem' }}>未找到匹配的模板</div>
                        )}
                        {!templateSearching && !templateSearch && (
                          <div style={{ textAlign: 'center', color: '#555', padding: '0.8rem', fontSize: '0.82rem' }}>输入关键词搜索 {language === 'zh' ? '12,588' : '12,588'} 个模板</div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* 编号查找模式 - 编辑版 */}
                        <input type="text" value={templateIdInput} onChange={(e) => fetchTemplateById(e.target.value)} placeholder='📋 输入模板编号（如：14300）' autoFocus style={{ width: '100%', padding: '0.5rem 0.75rem', background: '#1a1a22', border: `1px solid ${templateByIdResult ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '0.5rem', color: '#ddd', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                        {templateIdLoading && <div style={{ textAlign: 'center', color: '#666', padding: '0.8rem', fontSize: '0.82rem' }}>查找中...</div>}
                        {!templateIdLoading && templateByIdResult && (
                          <div onClick={() => { handleSelectTemplate(templateByIdResult!); setMode('upload') }} style={{ display: 'flex', gap: '0.65rem', padding: '0.6rem', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '0.55rem', background: 'rgba(16,185,129,0.05)', cursor: 'pointer', marginTop: '0.4rem' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.1)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.05)'}>
                            <img src={templateByIdResult.images?.[0] || ''} alt={templateByIdResult.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '0.35rem', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, background: '#222' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.18rem' }}>
                                <span style={{ fontSize: '0.62rem', color: '#10b981', fontFamily: 'monospace', background: 'rgba(16,185,129,0.2)', padding: '0.08em 0.32em', borderRadius: '0.25rem', fontWeight: 700 }}>#{templateByIdResult.index}</span>
                                <span>{templateByIdResult.icon}</span>
                                <span style={{ fontSize: '0.74rem', color: '#eee', fontWeight: 600 }}>{templateByIdResult.name}</span>
                              </div>
                              <div style={{ fontSize: '0.64rem', color: '#999', lineHeight: 1.4, maxHeight: '48px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{templateByIdResult.prompt.slice(0, 100)}{templateByIdResult.prompt.length > 100 ? '...' : ''}</div>
                              <div style={{ marginTop: '0.3rem', fontSize: '0.62rem', color: '#10b981', fontWeight: 600 }}>✅ 点击确认使用 →</div>
                            </div>
                          </div>
                        )}
                        {!templateIdLoading && templateIdInput && !templateByIdResult && (
                          <div style={{ textAlign: 'center', color: '#ef4444', padding: '0.8rem', fontSize: '0.82rem' }}>未找到编号 "{templateIdInput}"</div>
                        )}
                        {!templateIdLoading && !templateIdInput && (
                          <div style={{ textAlign: 'center', color: '#555', padding: '0.8rem', fontSize: '0.82rem' }}>输入已知模板编号快速调用</div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* 模板预览框 - 选中模板后显示（独立预览，不自动填入） */}
                {selectedTemplatePreview && (
                  <div style={{
                    background: 'linear-gradient(135deg, #0d0d0d, #161616)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '0.8rem',
                    padding: '0.8rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      {selectedTemplatePreview.images?.[0] && (
                        <img src={selectedTemplatePreview.images[0]} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>{selectedTemplatePreview.icon} {selectedTemplatePreview.name}</span>
                          <span style={{ fontSize: '0.62rem', color: '#555', fontFamily: 'monospace', background: 'rgba(16,185,129,0.1)', padding: '0.05em 0.35em', borderRadius: '0.25rem' }}>#{selectedTemplatePreview.index}</span>
                        </div>
                      </div>
                      {/* 操作按钮组 */}
                      <button
                        onClick={() => {
                          const textToUse = selectedTemplatePreview.cnTranslation && language === 'zh' ? selectedTemplatePreview.cnTranslation : selectedTemplatePreview.prompt
                          setPrompt(textToUse)
                        }}
                        style={{ padding: '0.3rem 0.7rem', border: 'none', borderRadius: '0.45rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, flexShrink: 0, boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}
                      >✅ 使用此提示词</button>
                      <button
                        onClick={() => {
                          const textToUse = selectedTemplatePreview.cnTranslation && language === 'zh' ? selectedTemplatePreview.cnTranslation : selectedTemplatePreview.prompt
                          navigator.clipboard.writeText(textToUse)
                        }}
                        style={{ padding: '0.28rem 0.55rem', border: 'none', borderRadius: '0.4rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', cursor: 'pointer', fontSize: '0.7rem', flexShrink: 0 }}
                      >📋 复制</button>
                      <button
                        onClick={() => setSelectedTemplatePreview(null)}
                        style={{ padding: '0.22rem 0.4rem', border: 'none', borderRadius: '0.4rem', background: 'rgba(255,255,255,0.06)', color: '#666', cursor: 'pointer', fontSize: '0.7rem', flexShrink: 0 }}
                      >✕</button>
                    </div>
                    <div style={{
                      fontSize: '0.76rem', color: '#ccc', lineHeight: 1.55,
                      maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-line',
                      wordBreak: 'break-word', background: 'rgba(0,0,0,0.2)',
                      borderRadius: '0.45rem', padding: '0.5rem 0.55rem',
                    }}>
                      {selectedTemplatePreview.cnTranslation && language === 'zh' ? selectedTemplatePreview.cnTranslation : selectedTemplatePreview.prompt}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '0.45rem', fontSize: '0.68rem', color: '#666' }}>
                      👆 点击「使用此提示词」填入下方编辑框，或「复制」手动粘贴
                    </div>
                  </div>
                )}
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要的编辑效果..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    background: 'linear-gradient(135deg, #1a1a1a, #222222)',
                    border: '1px solid #333',
                    borderRadius: '0.75rem',
                    padding: '0.75rem',
                    color: 'white',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#10b981'
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#333'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            )}

            {/* 提示词技巧 - 完善版 */}
            <div style={{
              background: 'linear-gradient(135deg, #111111, #1a1a1a)',
              borderRadius: '1rem',
              padding: '1rem',
              marginBottom: '1rem',
              border: '1px solid rgba(255, 165, 0, 0.15)'
            }}>
              <h4 style={{ fontSize: '0.9rem', color: '#ffa500', marginBottom: '0.6rem' }}>💡 提示词技巧</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ color: '#ccc', fontSize: '0.78rem', lineHeight: '1.5' }}>
                  <strong style={{ color: '#10b981' }}>✅ 写法建议：</strong><br/>
                  • 描述主体细节：材质、颜色、形状、大小<br/>
                  • 指定拍摄角度：俯视/平视/侧拍/特写<br/>
                  • 说明光影效果：自然光/柔光/戏剧光<br/>
                  • 添加氛围描述：背景、场景、情绪感<br/>
                  • 明确用途场景：电商主图/社媒海报/产品详情
                </div>
                <div style={{ color: '#999', fontSize: '0.78rem', lineHeight: '1.5' }}>
                  <strong style={{ color: '#ff6b6b' }}>⚠️ 避免踩坑：</strong><br/>
                  • ❌ 太简短（如只写"一个瓶子"）<br/>
                  • ❌ 矛盾描述（如"暗调但明亮"）<br/>
                  • ❌ 与参考图要求完全一致（需差异化）<br/>
                  • ❌ 敏感或违规内容
                </div>
              </div>
            </div>

            {/* 生成数量选择器 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#aaa', whiteSpace: 'nowrap' }}>生成数量:</span>
              {[1, 3, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setGenerateCount(n)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.6rem',
                    background: generateCount === n
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'linear-gradient(135deg, #1f1f1f, #2a2a2a)',
                    color: generateCount === n ? 'white' : '#999',
                    border: `1px solid ${generateCount === n ? '#10b981' : '#333'}`,
                    borderRadius: '0.4rem',
                    fontSize: '0.82rem',
                    fontWeight: generateCount === n ? 600 : 400,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {n} 张{n > 1 && ` (≈${n * 15}s)`}
                </button>
              ))}
            </div>

            <button
              className={`generate-button ${loading ? 'loading' : 'button-glow'}`}
              onClick={handleGenerate}
              disabled={loading || isUploading}
              style={{
                width: '100%',
                padding: '1rem',
                background: (loading || isUploading)
                  ? 'linear-gradient(135deg, #6b7280, #4b5563)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: (loading || isUploading) ? 'not-allowed' : 'pointer',
                opacity: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: loading
                  ? 'none'
                  : '0 8px 25px rgba(16, 185, 129, 0.3)',
                transform: loading ? 'none' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.4)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.3)'
                }
              }}
            >
              {loading ? (
                <>
                  <span className="rotating">⚙️</span> {
                    generateProgress
                      ? `生成中 ${generateProgress.current}/${generateProgress.total}...`
                      : t.generate.generating
                  }
                </>
              ) : isUploading ? (
                <>
                  <span className="rotating">📤</span> {t.generate.uploading}
                </>
              ) : (
                <>
                  开工！
                </>
              )}
            </button>

            <p style={{
              textAlign: 'center',
              marginTop: '1rem',
              fontSize: '0.9rem',
              color: '#ef4444'
            }}>
              {mode === 'text' ? t.generate.requirement : ''}
            </p>

            {/* 批量生成进度条 */}
            {loading && generateProgress && generateProgress.total > 1 && (
              <div style={{ marginTop: '0.8rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#10b981',
                  marginBottom: '0.3rem'
                }}>
                  <span>正在生成第 {generateProgress.current}/{generateProgress.total} 张图片...</span>
                  <span>{Math.round((generateProgress.current / generateProgress.total) * 100)}%</span>
                </div>
                <div style={{
                  height: '6px',
                  background: '#1f2937',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(generateProgress.current / generateProgress.total) * 100}%`,
                    background: 'linear-gradient(90deg, #10b981, #059669)',
                    borderRadius: '3px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

      </div>
      {error && (
        <div className="error-section" style={{
          padding: '2rem',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            borderRadius: '1rem',
            padding: '1.5rem',
            textAlign: 'center',
            border: '1px solid #ef4444'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'white' }}>
              生成失败
            </h3>
            <p style={{ color: '#fecaca', fontSize: '0.9rem', lineHeight: '1.5' }}>
              {error}
            </p>
            <button
              onClick={() => setError('')}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            border: '1px solid #ef4444',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem'
              }}>
                ⚠️
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                color: '#ef4444',
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                {errorModalTitle}
              </h3>
              <p style={{
                color: '#ccc',
                fontSize: '1rem',
                lineHeight: '1.5',
                margin: 0
              }}>
                {errorModalMessage}
              </p>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setShowErrorModal(false)}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444'
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {result && result.imageData && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          imageData={result.imageData}
          mimeType={result.mimeType || 'image/png'}
          t={t}
        />
      )}

      {/* Free Quota Modal */}
      <FreeQuotaModal
        isOpen={showQuotaModal}
        onClose={handleCloseQuotaModal}
      />

      {/* API Config Modal */}
      {showApiConfig && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={() => setShowApiConfig(false)}>
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            border: '1px solid #333',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#10b981',
                margin: 0
              }}>
                ⚙️ API 配置
              </h2>
              <button
                onClick={() => setShowApiConfig(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            <p style={{
              color: '#888',
              fontSize: '0.95rem',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              配置自定义的 API 密钥和 API 地址。留空则使用默认 Google Gemini 官方 API。
              <br />
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#10b981', textDecoration: 'underline' }}
              >
                点击这里获取 Google Gemini API Key →
              </a>
            </p>

            {/* Gemini API Config */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{
                color: '#10b981',
                fontSize: '1.1rem',
                marginBottom: '1rem'
              }}>
                Gemini API
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: '#ccc',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem'
                }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={apiConfig.geminiApiKey}
                  onChange={(e) => setApiConfig({ ...apiConfig, geminiApiKey: e.target.value })}
                  placeholder="输入 Google Gemini API Key"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #333',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: '#ccc',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem'
                }}>
                  API URL
                </label>
                <input
                  type="text"
                  value={apiConfig.geminiApiUrl}
                  onChange={(e) => setApiConfig({ ...apiConfig, geminiApiUrl: e.target.value })}
                  placeholder="https://generativelanguage.googleapis.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #333',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            {/* Doubao API Config */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{
                color: '#10b981',
                fontSize: '1.1rem',
                marginBottom: '1rem'
              }}>
                Doubao API
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: '#ccc',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem'
                }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={apiConfig.doubaoApiKey}
                  onChange={(e) => setApiConfig({ ...apiConfig, doubaoApiKey: e.target.value })}
                  placeholder="可选：输入 Doubao API Key"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #333',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: '#ccc',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem'
                }}>
                  API URL
                </label>
                <input
                  type="text"
                  value={apiConfig.doubaoApiUrl}
                  onChange={(e) => setApiConfig({ ...apiConfig, doubaoApiUrl: e.target.value })}
                  placeholder="可选：输入 Doubao API URL"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #333',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            {/* Info Box */}
            <div style={{
              backgroundColor: '#0a1a0a',
              border: '1px solid #10b981',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                color: '#888',
                fontSize: '0.85rem',
                margin: 0,
                lineHeight: '1.5'
              }}>
                💡 提示：配置保存在浏览器本地存储中，不会上传到服务器。自定义 API 密钥优先级高于默认服务。
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setApiConfig(loadApiConfig())
                  setShowApiConfig(false)
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#444'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#333'
                }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  saveApiConfig(apiConfig)
                  setShowApiConfig(false)
                  alert('配置已保存！')
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const tagStyle: React.CSSProperties = {
  padding: '0.25rem 0.75rem',
  backgroundColor: 'transparent',
  border: '1px solid #333',
  borderRadius: '1.5rem',
  color: '#888',
  fontSize: '0.85rem',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden'
}

const styleButtonStyle: React.CSSProperties = {
  padding: '0.75rem',
  border: '1px solid',
  borderRadius: '0.75rem',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden'
}