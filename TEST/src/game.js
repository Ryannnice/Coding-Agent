const GRID_SIZE = 20
const CELL_SIZE = 24
const TICK_MS = 130
const STORAGE_KEY = "snake-best-score"

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
}

function isOpposite(a, b) {
  return a.x === -b.x && a.y === -b.y
}

function randomFood(snake) {
  while (true) {
    const food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }

    if (!snake.some((segment) => segment.x === food.x && segment.y === food.y)) {
      return food
    }
  }
}

export function createSnakeGame(elements) {
  const { canvas, scoreElement, bestScoreElement, overlay, overlayTitle, overlayText, actionButton } = elements

  const context = canvas.getContext("2d")

  const state = {
    snake: [],
    food: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    running: false,
    started: false,
    gameOver: false,
    score: 0,
    bestScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
    lastTick: 0,
  }

  function syncScore() {
    scoreElement.textContent = String(state.score)
    bestScoreElement.textContent = String(state.bestScore)
  }

  function showOverlay(title, text, buttonText) {
    overlayTitle.textContent = title
    overlayText.textContent = text
    actionButton.textContent = buttonText
    overlay.hidden = false
  }

  function hideOverlay() {
    overlay.hidden = true
  }

  function resetGame() {
    state.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ]
    state.direction = { x: 1, y: 0 }
    state.nextDirection = { x: 1, y: 0 }
    state.food = randomFood(state.snake)
    state.running = true
    state.started = true
    state.gameOver = false
    state.score = 0
    state.lastTick = 0
    syncScore()
    hideOverlay()
    draw()
  }

  function finishGame() {
    state.running = false
    state.gameOver = true

    if (state.score > state.bestScore) {
      state.bestScore = state.score
      localStorage.setItem(STORAGE_KEY, String(state.bestScore))
      syncScore()
    }

    showOverlay("游戏结束", `本局得分 ${state.score}，再来一局试试更高分。`, "重新开始")
  }

  function update() {
    if (isOpposite(state.direction, state.nextDirection)) {
      state.nextDirection = state.direction
    }

    state.direction = state.nextDirection

    const head = state.snake[0]
    const nextHead = {
      x: head.x + state.direction.x,
      y: head.y + state.direction.y,
    }

    const willEat = nextHead.x === state.food.x && nextHead.y === state.food.y

    const hitWall = nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= GRID_SIZE || nextHead.y >= GRID_SIZE

    const body = willEat ? state.snake : state.snake.slice(0, -1)
    const hitSelf = body.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y)

    if (hitWall || hitSelf) {
      finishGame()
      return
    }

    state.snake.unshift(nextHead)

    if (willEat) {
      state.score += 10
      if (state.score > state.bestScore) {
        state.bestScore = state.score
        localStorage.setItem(STORAGE_KEY, String(state.bestScore))
      }
      state.food = randomFood(state.snake)
      syncScore()
      return
    }

    state.snake.pop()
  }

  function drawGrid() {
    context.strokeStyle = "rgba(255, 255, 255, 0.08)"
    context.lineWidth = 1

    for (let index = 1; index < GRID_SIZE; index += 1) {
      const offset = index * CELL_SIZE

      context.beginPath()
      context.moveTo(offset, 0)
      context.lineTo(offset, canvas.height)
      context.stroke()

      context.beginPath()
      context.moveTo(0, offset)
      context.lineTo(canvas.width, offset)
      context.stroke()
    }
  }

  function drawSnake() {
    state.snake.forEach((segment, index) => {
      context.fillStyle = index === 0 ? "#f7c873" : "#f0ede6"
      context.fillRect(segment.x * CELL_SIZE + 2, segment.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4)
    })
  }

  function drawFood() {
    const centerX = state.food.x * CELL_SIZE + CELL_SIZE / 2
    const centerY = state.food.y * CELL_SIZE + CELL_SIZE / 2

    context.fillStyle = "#d8572a"
    context.beginPath()
    context.arc(centerX, centerY, CELL_SIZE / 3, 0, Math.PI * 2)
    context.fill()
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height)

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, "#14213d")
    gradient.addColorStop(1, "#1d3557")
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)

    drawGrid()
    drawFood()
    drawSnake()
  }

  function frame(timestamp) {
    if (state.running) {
      if (!state.lastTick) {
        state.lastTick = timestamp
      }

      if (timestamp - state.lastTick >= TICK_MS) {
        state.lastTick = timestamp
        update()
        draw()
      }
    }

    requestAnimationFrame(frame)
  }

  window.addEventListener("keydown", (event) => {
    const next = DIRECTIONS[event.code]
    if (!next) {
      return
    }

    event.preventDefault()

    if (!state.started || state.gameOver) {
      return
    }

    if (isOpposite(state.direction, next)) {
      return
    }

    state.nextDirection = next
  })

  actionButton.addEventListener("click", () => {
    resetGame()
  })

  syncScore()
  draw()
  showOverlay("准备开始", "按方向键控制移动，按下开始按钮进入游戏。", "开始游戏")
  requestAnimationFrame(frame)
}
