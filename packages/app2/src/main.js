import { createApp } from 'vue'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'
import router from './router'
import './styles/global.css'
import 'vue3-markdown/dist/vue3-markdown.css'

const app = createApp(App)
app.use(MotionPlugin)
app.use(router)
app.mount('#app')
