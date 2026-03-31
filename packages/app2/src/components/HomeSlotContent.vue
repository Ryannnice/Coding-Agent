<template>
  <div class="slot-content">
    <h2 class="card-title">{{ title }}</h2>
    <p class="card-desc">{{ desc }}</p>
    <span
      v-if="card === 'channel' || card === 'workshop' || card === 'remain'"
      class="card-arrow"
      role="button"
      tabindex="0"
      :aria-label="arrowAriaLabel"
      @click.stop="$emit('navigate', card)"
      @keydown.enter.prevent.stop="$emit('navigate', card)"
      @keydown.space.prevent.stop="$emit('navigate', card)"
    >→</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: { type: String, required: true }
})

defineEmits(['navigate'])

const content = {
  channel: { title: 'Channel', desc: '频道排行榜' },
  workshop: { title: 'Workshop', desc: '创意工作坊 · 探索与协作空间' },
  remain: { title: 'OpenMAIC', desc: '教育龙虾' }
}

const title = computed(() => content[props.card]?.title || '')
const desc = computed(() => content[props.card]?.desc || '')

const arrowAriaLabel = computed(() => {
  if (props.card === 'remain') return '进入 OpenMAIC'
  if (props.card === 'workshop') return '进入工作坊'
  return '进入频道'
})
</script>

<style scoped>
.slot-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  width: 100%;
  height: 100%;
}

.card-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.card-desc {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.card-arrow {
  position: absolute;
  bottom: 24px;
  right: 24px;
  font-size: 1.25rem;
  color: var(--accent);
  opacity: 0.8;
  cursor: pointer;
  padding: 8px;
}

.card-arrow:hover {
  opacity: 1;
}
</style>
