const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d")

let snake = [{ x: 200, y: 200 }]
let food = { x: 100, y: 100 }
let dx = 0
let dy = 0
let score = 0

function draw() {
  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw snake
  snake.forEach((segment) => {
    ctx.fillStyle = "green"
    ctx.fillRect(segment.x, segment.y, 10, 10)
  })

  // Draw food
  ctx.fillStyle = "red"
  ctx.fillRect(food.x, food.y, 10, 10)

  // Draw score
  ctx.fillStyle = "white"
  ctx.font = "16px Arial"
  ctx.fillText(`Score: ${score}`, 10, 20)
}

function move() {
  const head = { x: snake[0].x + dx * 10, y: snake[0].y + dy * 10 }
  snake.unshift(head)

  if (head.x === food.x && head.y === food.y) {
    score++
    food = {
      x: Math.floor(Math.random() * 39) * 10,
      y: Math.floor(Math.random() * 39) * 10,
    }
  } else {
    snake.pop()
  }

  // Check collision
  if (head.x < 0 || head.y < 0 || head.x >= 400 || head.y >= 400) {
    resetGame()
  }
}

function resetGame() {
  snake = [{ x: 200, y: 200 }]
  dx = 0
  dy = 0
  score = 0
}

function gameLoop() {
  move()
  draw()
  setTimeout(gameLoop, 100)
}

document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      if (dy !== 1) {
        dx = 0
        dy = -1
      }
      break
    case "ArrowDown":
      if (dy !== -1) {
        dx = 0
        dy = 1
      }
      break
    case "ArrowLeft":
      if (dx !== 1) {
        dx = -1
        dy = 0
      }
      break
    case "ArrowRight":
      if (dx !== -1) {
        dx = 1
        dy = 0
      }
      break
  }
})

resetGame()
gameLoop()
