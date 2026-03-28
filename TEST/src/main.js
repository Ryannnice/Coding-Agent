import "./style.css"
import { createSnakeGame } from "./game.js"

document.querySelector("#app").innerHTML = `
  <main class="shell">
    <section class="panel">
      <div class="hero">
        <p class="eyebrow">Browser Arcade</p>
        <h1>贪吃蛇</h1>
        <p class="subtitle">吃掉食物、不断变长，别撞墙也别咬到自己。</p>
      </div>

      <div class="hud">
        <div class="stat">
          <span>当前分数</span>
          <strong id="score">0</strong>
        </div>
        <div class="stat">
          <span>最高分</span>
          <strong id="best-score">0</strong>
        </div>
      </div>

      <div class="stage-wrap">
        <canvas id="game" width="480" height="480" aria-label="贪吃蛇游戏画布"></canvas>
        <div class="overlay" id="overlay">
          <h2 id="overlay-title">准备开始</h2>
          <p id="overlay-text">按方向键控制移动，按下开始按钮进入游戏。</p>
          <button id="action-btn" type="button">开始游戏</button>
        </div>
      </div>

      <div class="controls">
        <p>操作：方向键 / WASD</p>
        <p>规则：不能立即反向，撞墙或撞到自己则结束。</p>
      </div>
    </section>
  </main>
`

createSnakeGame({
  canvas: document.querySelector("#game"),
  scoreElement: document.querySelector("#score"),
  bestScoreElement: document.querySelector("#best-score"),
  overlay: document.querySelector("#overlay"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayText: document.querySelector("#overlay-text"),
  actionButton: document.querySelector("#action-btn"),
})
