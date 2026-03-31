<template>
  <div class="wsp" :class="`wsp--phase${phase}`" role="status" aria-live="polite">
    <div class="wsp__steps" aria-hidden="true">
      <div class="wsp__step" :data-active="phase >= 1">
        <span class="wsp__step-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="8" y1="13" x2="16" y2="13"/>
            <line x1="8" y1="17" x2="12" y2="17"/>
          </svg>
        </span>
        <span class="wsp__step-label">说明</span>
      </div>
      <div class="wsp__step-line" :data-done="phase >= 2" />
      <div class="wsp__step" :data-active="phase >= 2">
        <span class="wsp__step-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
        </span>
        <span class="wsp__step-label">HTML</span>
      </div>
    </div>

    <div class="wsp__panel">
      <div class="wsp__panel-head">
        <span class="wsp__badge">{{ phase }} / 2</span>
        <h4 class="wsp__title">{{ phase === 1 ? '正在生成说明' : '正在生成页面源码' }}</h4>
      </div>

      <!-- 阶段 2：根据当前 HTML 片段推断进度 — 图标 + 主文案在上，详细说明在下 -->
      <div v-if="phase === 2 && htmlLive" class="wsp__live">
        <div class="wsp__live-icon" :class="'wsp__live-icon--' + htmlLive.key" aria-hidden="true">
          <component :is="htmlLive.icon" />
        </div>
        <div class="wsp__live-text">
          <p class="wsp__live-title">{{ htmlLive.title }}</p>
          <p class="wsp__live-detail">{{ htmlLive.detail }}</p>
        </div>
      </div>

      <ul class="wsp__list" :class="{ 'wsp__list--after-live': phase === 2 }">
        <template v-if="phase === 1">
          <li class="wsp__item">
            <span class="wsp__bullet" aria-hidden="true">◆</span>
            <span>流式输出<strong>页面说明</strong>（Markdown），介绍结构与亮点</span>
          </li>
          <li class="wsp__item">
            <span class="wsp__bullet" aria-hidden="true">◆</span>
            <span>本阶段结束后将输出分隔符，进入<strong>HTML</strong>写入</span>
          </li>
          <li class="wsp__item">
            <span class="wsp__bullet" aria-hidden="true">◆</span>
            <span>右侧「成果展示」在<strong>全部完成并上传后</strong>一次性显示</span>
          </li>
        </template>
        <template v-else>
          <li class="wsp__item">
            <span class="wsp__bullet" aria-hidden="true">◆</span>
            <span>正在拼接<strong>完整 HTML</strong> 文档（下方为源码预览）</span>
          </li>
          <li class="wsp__item">
            <span class="wsp__bullet" aria-hidden="true">◆</span>
            <span>已输出约 <strong>{{ formattedChars }}</strong> 字符</span>
          </li>
          <li class="wsp__item">
            <span class="wsp__bullet" aria-hidden="true">◆</span>
            <span>右侧预览仍等待上传完成，请稍候</span>
          </li>
        </template>
      </ul>

      <div class="wsp__track" :aria-valuenow="phase === 2 ? barPercent : undefined" aria-valuemin="0" aria-valuemax="100" role="progressbar">
        <div class="wsp__fill" :style="phase === 2 ? { width: barPercent + '%' } : {}" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, h } from 'vue'

const props = defineProps({
  phase: { type: Number, required: true },
  charCount: { type: Number, default: 0 },
  /** 阶段 2：当前已接收的 HTML 片段，用于推断「正在写 / 正在渲染」等 */
  htmlBuffer: { type: String, default: '' },
})

const formattedChars = computed(() => props.charCount.toLocaleString('zh-CN'))

/** 小图标：用函数式组件避免每个状态一个大块 template */
function iconSvg(children) {
  return () =>
    h(
      'svg',
      { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 },
      children,
    )
}

const IconPen = iconSvg([
  h('path', { d: 'M12 20h9' }),
  h('path', { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' }),
])
const IconPalette = iconSvg([
  h('circle', { cx: 13.5, cy: 6.5, r: 0.5, fill: 'currentColor', stroke: 'none' }),
  h('circle', { cx: 17.5, cy: 10.5, r: 0.5, fill: 'currentColor', stroke: 'none' }),
  h('circle', { cx: 8.5, cy: 7.5, r: 0.5, fill: 'currentColor', stroke: 'none' }),
  h('circle', { cx: 6.5, cy: 12.5, r: 0.5, fill: 'currentColor', stroke: 'none' }),
  h('path', { d: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z' }),
])
const IconLayout = iconSvg([
  h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2, ry: 2 }),
  h('line', { x1: 3, y1: 9, x2: 21, y2: 9 }),
  h('line', { x1: 9, y1: 21, x2: 9, y2: 9 }),
])
const IconBrackets = iconSvg([
  h('polyline', { points: '16 18 22 12 16 6' }),
  h('polyline', { points: '8 6 2 12 8 18' }),
])
const IconBox = iconSvg([
  h('path', { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' }),
  h('polyline', { points: '3.27 6.96 12 12.01 20.73 6.96' }),
  h('line', { x1: 12, y1: 22.08, x2: 12, y2: 12 }),
])
const IconCheck = iconSvg([
  h('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
  h('polyline', { points: '22 4 12 14.01 9 11.01' }),
])

/** 避免在单文件组件的脚本块中写出 script 闭合标签的完整字面量，否则 SFC 会截断 */
const TAG_SCRIPT_OPEN = '<scr' + 'ipt'
const TAG_SCRIPT_CLOSE = '</scr' + 'ipt>'

function inferHtmlProgress(s) {
  const len = s.length
  const lower = s.toLowerCase()

  if (len === 0) {
    return {
      key: 'boot',
      title: '准备写入 HTML…',
      detail: '等待首个字符',
      icon: IconPen,
      base: 2,
    }
  }

  const lastScriptOpen = lower.lastIndexOf(TAG_SCRIPT_OPEN)
  const lastScriptClose = lower.lastIndexOf(TAG_SCRIPT_CLOSE)
  if (lastScriptOpen > lastScriptClose && lastScriptOpen !== -1) {
    return {
      key: 'script',
      title: '正在编写脚本…',
      detail: '处理 script 标签与页面交互逻辑',
      icon: IconBrackets,
      base: 78,
    }
  }

  const lastStyleOpen = lower.lastIndexOf('<style')
  const lastStyleClose = lower.lastIndexOf('</style>')
  if (lastStyleOpen > lastStyleClose && lastStyleOpen !== -1) {
    return {
      key: 'style',
      title: '正在渲染样式…',
      detail: '编写 CSS，定义颜色、布局与动效',
      icon: IconPalette,
      base: 48,
    }
  }

  if (/<\/html>/i.test(s)) {
    return {
      key: 'close',
      title: '正在收尾…',
      detail: '已出现 </html>，即将完成整段输出',
      icon: IconCheck,
      base: 94,
    }
  }

  if (/<body[\s>]/i.test(s) && !/<\/body>/i.test(s)) {
    return {
      key: 'body',
      title: '正在写正文结构…',
      detail: '搭建 <body> 内标签与页面主体',
      icon: IconLayout,
      base: 62,
    }
  }

  if (/<head[\s>]/i.test(s) && !/<\/head>/i.test(s)) {
    return {
      key: 'head',
      title: '正在写头部信息…',
      detail: '补全 <head> 中的 title、meta 等',
      icon: IconBox,
      base: 28,
    }
  }

  if (/<!doctype/i.test(s) || /<html/i.test(s)) {
    return {
      key: 'skeleton',
      title: '正在写入页面骨架…',
      detail: '生成 DOCTYPE、<html> 与基础结构',
      icon: IconLayout,
      base: 16,
    }
  }

  if (len < 400) {
    return {
      key: 'stream',
      title: '正在写入 HTML…',
      detail: '流式接收源码，构建文档开头',
      icon: IconPen,
      base: 10,
    }
  }

  if (len < 4000) {
    return {
      key: 'stream',
      title: '正在持续写入…',
      detail: '内容较长，请稍候',
      icon: IconPen,
      base: 38,
    }
  }

  return {
    key: 'stream',
    title: '正在写入大量内容…',
    detail: '样式与结构接近完成',
    icon: IconPen,
    base: 55,
  }
}

const htmlLive = computed(() => {
  if (props.phase !== 2) return null
  const st = inferHtmlProgress(props.htmlBuffer)
  return {
    ...st,
    icon: st.icon,
  }
})

/** 进度条：阶段基准 + 随字符数微动，封顶 97%（流式未完成） */
const barPercent = computed(() => {
  if (props.phase !== 2 || !htmlLive.value) return 40
  const st = htmlLive.value
  const bump = Math.min(12, Math.floor(props.charCount / 1200))
  let p = st.base + bump
  if (/<\/html>/i.test(props.htmlBuffer)) p = Math.min(97, p + 2)
  return Math.min(97, p)
})
</script>

<style scoped>
.wsp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.wsp__steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 0 4px;
}

.wsp__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 56px;
  color: var(--text-secondary, #6b7280);
  transition: color 0.2s;
}
.wsp__step[data-active='true'] {
  color: var(--accent, #818cf8);
}
.wsp__step-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.22);
}
.wsp__step[data-active='true'] .wsp__step-icon {
  background: rgba(99, 102, 241, 0.22);
  border-color: rgba(129, 140, 248, 0.45);
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.15);
}
.wsp__step-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.wsp__step-line {
  flex: 1;
  max-width: 48px;
  height: 3px;
  margin: 0 4px 20px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
}
.wsp__step-line[data-done='true'] {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.5), rgba(129, 140, 248, 0.85));
}

.wsp__panel {
  border-radius: 12px;
  padding: 12px 14px 14px;
  background: linear-gradient(145deg, rgba(99, 102, 241, 0.09) 0%, rgba(15, 15, 19, 0.92) 55%);
  border: 1px solid rgba(99, 102, 241, 0.22);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.wsp__panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.wsp__badge {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.25);
  color: #c7d2fe;
  border: 1px solid rgba(165, 180, 252, 0.35);
}

.wsp__title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary, #e8e8f0);
}

/* 动态进度：图标 + 主副标题 */
.wsp__live {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 11px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(129, 140, 248, 0.22);
}

.wsp__live-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #c7d2fe;
  background: rgba(79, 70, 229, 0.35);
  border: 1px solid rgba(165, 180, 252, 0.35);
}

.wsp__live-icon--style {
  color: #fde68a;
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(251, 191, 36, 0.35);
}

.wsp__live-icon--script {
  color: #86efac;
  background: rgba(34, 197, 94, 0.18);
  border-color: rgba(74, 222, 128, 0.35);
}

.wsp__live-icon--close {
  color: #a7f3d0;
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(52, 211, 153, 0.35);
}

.wsp__live-text {
  min-width: 0;
  flex: 1;
}

.wsp__live-title {
  margin: 0 0 4px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #f1f5ff;
  letter-spacing: 0.02em;
}

.wsp__live-detail {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.45;
  color: var(--text-secondary, #a8a8b8);
}

.wsp__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.wsp__list--after-live {
  padding-top: 2px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.wsp__item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 0.8rem;
  line-height: 1.55;
  color: var(--text-secondary, #a8a8b8);
  margin-bottom: 8px;
}
.wsp__item:last-child {
  margin-bottom: 0;
}
.wsp__item strong {
  color: #e0e7ff;
  font-weight: 600;
}

.wsp__bullet {
  flex-shrink: 0;
  font-size: 0.55rem;
  line-height: 2;
  color: rgba(129, 140, 248, 0.85);
  opacity: 0.9;
}

.wsp__track {
  position: relative;
  margin-top: 12px;
  height: 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.wsp__fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 40%;
  border-radius: 4px;
  background: linear-gradient(90deg, #4f46e5, #818cf8);
  transition: width 0.35s ease;
}

.wsp--phase1 .wsp__fill {
  animation: wsp-slide 1.45s ease-in-out infinite;
}

@keyframes wsp-slide {
  0%,
  100% {
    left: 0;
    opacity: 0.72;
  }
  50% {
    left: 60%;
    opacity: 1;
  }
}

.wsp--phase1 .wsp__fill {
  width: 40%;
}

.wsp--phase2 .wsp__fill {
  animation: none;
  opacity: 1;
}
</style>
