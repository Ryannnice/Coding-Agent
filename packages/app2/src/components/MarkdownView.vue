<script setup>
/**
 * 基于 vue3-markdown 的 VMarkdownView，统一暗色对话区样式。
 * @see https://www.npmjs.com/package/vue3-markdown
 */
import { VMarkdownView } from 'vue3-markdown'

defineProps({
  /** Markdown 源码 */
  content: {
    type: String,
    default: '',
  },
  /** vue3-markdown：light | dark */
  mode: {
    type: String,
    default: 'dark',
  },
})
</script>

<template>
  <div class="md-view" :class="`md-view--${mode}`">
    <VMarkdownView :content="content" :mode="mode" />
  </div>
</template>

<style scoped>
.md-view {
  min-width: 0;
}

.md-view :deep(.markdown-body) {
  font-size: inherit;
  line-height: 1.65;
  background: transparent !important;
}

.md-view--dark :deep(.markdown-body) {
  color: var(--text-primary, #e8e8f0);
}

.md-view--dark :deep(.markdown-body a) {
  color: #a5b4fc;
}

.md-view--dark :deep(.markdown-body code) {
  background: rgba(99, 102, 241, 0.2);
  color: #e0e7ff;
}

.md-view--dark :deep(.markdown-body pre) {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
