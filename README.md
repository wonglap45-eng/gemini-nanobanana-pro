# 🍌 Gemini Nano Banana Plus

基于 Google Gemini 2.5 Flash Image Preview 模型打造的精美 AI 图像生成与编辑 Web 应用，使用 Next.js 构建。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/xianyu110/gemini-nanobanana-plus)

## ✨ 功能特性

### 🎨 AI 图像生成
- **文生图**：通过文字描述生成图像
- **图像编辑**：上传图片后通过自然语言对话进行编辑
- **多种风格**：增强细节、艺术风格、动漫风格、写实风格
- **批量生成**：一次生成 1-4 张图片

### 🎯 用户体验
- **精美界面**：现代化暗色主题，渐变背景搭配流畅动画
- **响应式设计**：完美适配桌面端和移动端
- **实时预览**：即时反馈和加载动画
- **多模式切换**：上传模式和文生图模式自由切换

### 🔧 技术特性
- **Next.js 14**：服务端渲染和 API 路由
- **TypeScript**：类型安全开发
- **多模型支持**：
  - **Gemini 2.5 Flash**：Google 最新 AI 图像生成模型
  - **Doubao SeedReam 4.0**：字节跳动高级图像生成模型
- **Vercel 部署**：优化的一键部署方案

## 🚀 快速开始

### 前置要求
- Node.js 18+
- AI 模型 API 密钥：
  - **Gemini API 密钥**：从 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取
  - **Doubao API 密钥**：从 [火山引擎](https://console.volcengine.com/) 获取

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/xianyu110/gemini-nanobanana-plus.git
   cd gemini-nanobanana-plus
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env.local
   ```
   编辑 `.env.local` 并填入你的 API 密钥：
   ```
   GEMINI_API_KEY=你的_gemini_api_key
   MAYNOR_API_KEY=你的_doubao_api_key
   MAYNOR_API_URL=https://apipro.maynor1024.live
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **打开浏览器**
   访问 [http://localhost:3000](http://localhost:3000)

## 🌐 部署到 Vercel

### 一键部署
点击上方的 Vercel 按钮即可直接部署。

### 手动部署

1. **Fork 本仓库**

2. **导入 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "New Project"
   - 导入你 Fork 的仓库

3. **配置环境变量**
   在 Vercel 项目设置中添加：
   ```
   GEMINI_API_KEY=你的_api_key
   ```

4. **部署**
   Vercel 会自动构建并部署你的项目

## 🎯 使用指南

### 页面说明
- **主应用**：`/nano` - 完整功能的 Nano Banana 界面
- **演示版**：`/mvp` - 简化演示版本
- **首页**：`/` - 落地页

### AI 模型选择
支持两种强大的 AI 模型：
- **🤖 Gemini 2.5 Flash**：Google 最新多模态 AI 模型
- **🎨 Doubao SeedReam 4.0**：字节跳动高级图像生成模型

### 文生图
1. 选择「文生图模式」
2. 选择 AI 模型（Gemini 或 Doubao）
3. 输入中文或英文描述
4. 选择风格（增强、艺术、动漫、写实）
5. 选择生成图片数量（1-4 张）
6. 点击「开始生成」

### 图像编辑
1. 选择「通过对话编辑图像」模式
2. 选择 AI 模型（Gemini 或 Doubao）
3. 上传图片（支持 PNG、JPG、WebP）
4. 描述你想要的修改内容
5. 选择风格并生成

### 示例提示词
- "一只可爱的橘猫坐在彩虹桥上，梦幻风格，柔和光线"
- "A cute orange cat sitting on a rainbow bridge, dreamy style, soft lighting"
- "将这张图片转换为油画风格，增加温暖色调"

## 🛠️ 开发

### 项目结构
```
gemini-nano-banana/
├── app/
│   ├── api/
│   │   ├── gemini/          # Gemini API 端点
│   │   ├── generate/        # 备用生成端点
│   │   └── generate-demo/   # 演示端点
│   ├── nano/                # 主应用页面
│   ├── mvp/                 # MVP 演示页面
│   └── layout.tsx           # 根布局
├── public/                  # 静态资源
├── .env.example            # 环境变量模板
├── vercel.json            # Vercel 部署配置
└── README.md              # 项目文档
```

### 可用脚本
- `npm run dev` - 启动开发服务器
- `npm run build` - 生产环境构建
- `npm run start` - 启动生产服务器

### API 端点
- `/api/gemini` - Gemini 2.5 Flash 图像生成 API
- `/api/doubao` - Doubao SeedReam 4.0 图像生成 API
- `/api/generate` - 备用生成端点
- `/api/generate-demo` - 演示端点

## 🔑 环境变量

| 变量 | 说明 | 是否必需 |
|------|------|----------|
| `GEMINI_API_KEY` | Google AI Studio 的 Gemini API 密钥 | ✅ |
| `MAYNOR_API_KEY` | 火山引擎的 Doubao API 密钥 | ✅ |
| `MAYNOR_API_URL` | Doubao API 基础地址 | ✅ |

## 🌟 界面特性

### 🍌 Nano Banana 界面
- **现代暗色主题**：护眼的渐变背景设计
- **流畅动画**：悬停效果和加载动画
- **响应式布局**：桌面端和移动端完美适配
- **交互元素**：增强的按钮、输入框和卡片

### 视觉效果
- **渐变卡片**：精美的背景渐变
- **发光效果**：微妙的阴影和光晕
- **平滑过渡**：全局 0.3s 缓动过渡
- **加载状态**：旋转齿轮图标和脉冲动画

## 📝 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

## 🤝 参与贡献

欢迎贡献！请随时提交 Pull Request。

## 💡 支持

如果遇到任何问题或有疑问：
1. 查看 [Issues](https://github.com/xianyu110/gemini-nanobanana-plus/issues) 页面
2. 创建新 Issue 并附上详细信息
3. 加入我们的社区讨论

## 🌟 致谢

- [Google Gemini](https://gemini.google.com) - 强大的 AI 模型
- [Next.js](https://nextjs.org) - 优秀的框架
- [Vercel](https://vercel.com) - 无缝部署平台

---

**使用 Google Gemini 2.5 Flash Image Preview 用心制作 ❤️**
