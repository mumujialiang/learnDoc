import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 打包为 GitHub Pages 项目站点：
//   https://mumujialiang.github.io/learnDoc/
// 资源需要 /learnDoc/ 前缀；本地开发保持根路径，
// 两者靠 command（dev / build）区分，互不干扰。
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/learnDoc/' : '/',
  plugins: [vue()],
  server: {
    port: 5173,
    // true = 监听 0.0.0.0，局域网内其他设备（手机、同事电脑）用 IP 就能访问。
    // 注意是纯 IPv4 监听，本机访问建议用 127.0.0.1 而不是 localhost，
    // 因为 localhost 在 Windows 上可能先解析到 ::1（和后端课程里那个坑同源）。
    host: true,
    // 自动打开时直接用 IPv4 地址，避免 localhost 解析问题
    open: 'http://127.0.0.1:5173',
    // 关闭 HMR：改代码后浏览器不再自动刷新，需要手动刷新查看变化。
    // 想恢复热更新，把 false 改成 true 或删掉这一行。
    hmr: false,
  },
  preview: {
    port: 4173,
    host: true,
  },
}))
