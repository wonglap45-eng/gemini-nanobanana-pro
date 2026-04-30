import Stripe from 'stripe'
import { PRICING_PLANS, getPlan, isValidPlanId } from '../../lib/pricing-plans'
export type { PlanId } from '../../lib/pricing-plans'

// 服务器端Stripe配置 - 可选，不配置则禁用支付功能
const hasStripeKey = !!process.env.STRIPE_SECRET_KEY

export const stripe = hasStripeKey 
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : null as unknown as Stripe

export const isStripeEnabled = hasStripeKey
export const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || false

if (hasStripeKey) {
  console.log(`🔧 Stripe模式: ${isTestMode ? '测试环境' : '生产环境'}`)
} else {
  console.log('⚠️ Stripe未配置，支付功能已禁用')
}

// 导出定价计划相关功能
export { PRICING_PLANS, getPlan, isValidPlanId }

// Stripe产品ID映射 (需要在Stripe Dashboard中创建对应产品)
export const STRIPE_PRICE_IDS = {
  unlimited: 'price_unlimited_yearly', // 年付无限版
  pro: 'price_pro_monthly',           // 月付专业版
  starter: 'price_starter_onetime'    // 一次性体验版
} 