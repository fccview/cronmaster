"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowClockwiseIcon, PlayIcon, PauseIcon } from "@phosphor-icons/react";

interface Position {
  x: number;
  y: number;
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const GRID_SIZE = 20;
const INITIAL_SNAKE: Position[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];
const INITIAL_DIRECTION: Direction = "RIGHT";
const GAME_SPEED = 150;

export const SnakeGame = () => {
  const t = useTranslations("notFound");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [colors, setColors] = useState({ snake: "#00ff00", food: "#ff0000", grid: "#333333" });
  const [cellSize, setCellSize] = useState(20);

  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedHighScore = localStorage.getItem("snakeHighScore");
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }

    const updateColors = () => {
      const theme = document.documentElement.getAttribute("data-webtui-theme");
      if (theme === "catppuccin-mocha") {
        setColors({
          snake: "#9ca0b0",
          food: "#f38ba8",
          grid: "#313244",
        });
      } else {
        setColors({
          snake: "#313244",
          food: "#d20f39",
          grid: "#9ca0b0",
        });
      }
    };

    updateColors();

    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-webtui-theme"],
    });

    const updateCellSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const maxCanvasSize = Math.min(containerWidth - 32, 400);
        const newCellSize = Math.floor(maxCanvasSize / GRID_SIZE);
        setCellSize(newCellSize);
      }
    };

    updateCellSize();
    window.addEventListener("resize", updateCellSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateCellSize);
    };
  }, []);

  const generateFood = useCallback((): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some((segment) => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, [snake]);

  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setFood(generateFood());
    setGameOver(false);
    setGameStarted(true);
    setScore(0);
    setIsPaused(false);
  }, [generateFood]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const theme = document.documentElement.getAttribute("data-webtui-theme");
    const bgColor = theme === "catppuccin-mocha" ? "#1e1e2e" : "#eff1f5";

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, GRID_SIZE * cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(GRID_SIZE * cellSize, i * cellSize);
      ctx.stroke();
    }

    snake.forEach((segment) => {
      ctx.fillStyle = colors.snake;
      ctx.fillRect(
        segment.x * cellSize + 1,
        segment.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    });

    ctx.fillStyle = colors.food;
    ctx.fillRect(
      food.x * cellSize + 1,
      food.y * cellSize + 1,
      cellSize - 2,
      cellSize - 2
    );
  }, [snake, food, colors, cellSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  const moveSnake = useCallback(() => {
    if (gameOver || !gameStarted || isPaused) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead: Position = { ...head };

      switch (directionRef.current) {
        case "UP":
          newHead.y -= 1;
          break;
        case "DOWN":
          newHead.y += 1;
          break;
        case "LEFT":
          newHead.x -= 1;
          break;
        case "RIGHT":
          newHead.x += 1;
          break;
      }

      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE ||
        prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)
      ) {
        setGameOver(true);
        setGameStarted(false);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((prev) => {
          const newScore = prev + 10;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem("snakeHighScore", newScore.toString());
          }
          return newScore;
        });
        setFood(generateFood());
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [gameOver, gameStarted, isPaused, food, highScore, generateFood]);

  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      gameLoopRef.current = setInterval(moveSnake, GAME_SPEED);
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, isPaused, moveSnake]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (gameOver) {
          resetGame();
        } else if (!gameStarted) {
          setGameStarted(true);
        }
        return;
      }

      if (e.code === "KeyP") {
        e.preventDefault();
        if (gameStarted && !gameOver) {
          setIsPaused((prev) => !prev);
        }
        return;
      }

      if (!gameStarted || gameOver || isPaused) return;

      let newDirection: Direction | null = null;

      switch (e.key) {
        case "ArrowUp":
          if (directionRef.current !== "DOWN") {
            newDirection = "UP";
          }
          break;
        case "ArrowDown":
          if (directionRef.current !== "UP") {
            newDirection = "DOWN";
          }
          break;
        case "ArrowLeft":
          if (directionRef.current !== "RIGHT") {
            newDirection = "LEFT";
          }
          break;
        case "ArrowRight":
          if (directionRef.current !== "LEFT") {
            newDirection = "RIGHT";
          }
          break;
      }

      if (newDirection) {
        e.preventDefault();
        directionRef.current = newDirection;
        setDirection(newDirection);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameOver, gameStarted, isPaused, resetGame]);

  const handleTouchMove = (dir: Direction) => {
    if (!gameStarted) {
      setGameStarted(true);
      directionRef.current = dir;
      setDirection(dir);
      return;
    }
    if (gameOver || isPaused) return;

    let canMove = false;

    switch (dir) {
      case "UP":
        canMove = directionRef.current !== "DOWN";
        break;
      case "DOWN":
        canMove = directionRef.current !== "UP";
        break;
      case "LEFT":
        canMove = directionRef.current !== "RIGHT";
        break;
      case "RIGHT":
        canMove = directionRef.current !== "LEFT";
        break;
    }

    if (canMove) {
      directionRef.current = dir;
      setDirection(dir);
    }
  };

  const handleCanvasClick = () => {
    if (gameOver) {
      resetGame();
    } else if (!gameStarted) {
      setGameStarted(true);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 w-full">
      <div className="tui-card p-4 w-full max-w-md">
        <div className="flex justify-between items-center mb-4 terminal-font">
          <div className="text-sm">
            <span className="text-status-success">{t("score")}:</span> {score}
          </div>
          <div className="text-sm">
            <span className="text-status-info">{t("highScore")}:</span> {highScore}
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={GRID_SIZE * cellSize}
            height={GRID_SIZE * cellSize}
            className="ascii-border mx-auto cursor-pointer bg-background0"
            onClick={handleCanvasClick}
          />

          {!gameStarted && !gameOver && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-background0 bg-opacity-90 ascii-border cursor-pointer"
              onClick={handleCanvasClick}
            >
              <div className="text-center terminal-font">
                <p className="text-lg font-bold uppercase mb-2">{t("pressToStart")}</p>
                <p className="text-xs text-foreground0 opacity-70">{t("pauseGame")}</p>
              </div>
            </div>
          )}

          {gameOver && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-background0 bg-opacity-90 ascii-border cursor-pointer"
              onClick={handleCanvasClick}
            >
              <div className="text-center terminal-font">
                <p className="text-2xl font-bold uppercase text-status-error mb-2">
                  {t("gameOver")}
                </p>
                <p className="text-lg mb-1">
                  {t("score")}: {score}
                </p>
                <p className="text-sm text-foreground0 opacity-70">{t("pressToRestart")}</p>
              </div>
            </div>
          )}

          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-background0 bg-opacity-90 ascii-border">
              <div className="text-center terminal-font">
                <p className="text-2xl font-bold uppercase text-status-warning">
                  {t("paused")}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 md:hidden">
          <div></div>
          <button
            onClick={() => handleTouchMove("UP")}
            className="ascii-border bg-background1 p-3 active:bg-background2 terminal-font flex items-center justify-center"
          >
            <ArrowUpIcon size={20} weight="bold" />
          </button>
          <div></div>
          <button
            onClick={() => handleTouchMove("LEFT")}
            className="ascii-border bg-background1 p-3 active:bg-background2 terminal-font flex items-center justify-center"
          >
            <ArrowLeftIcon size={20} weight="bold" />
          </button>
          <button
            onClick={() => (gameStarted && !gameOver ? setIsPaused(!isPaused) : resetGame())}
            className="ascii-border bg-background1 p-3 active:bg-background2 terminal-font flex items-center justify-center"
          >
            {gameOver ? <ArrowClockwiseIcon size={20} weight="bold" /> : isPaused ? <PlayIcon size={20} weight="fill" /> : <PauseIcon size={20} weight="fill" />}
          </button>
          <button
            onClick={() => handleTouchMove("RIGHT")}
            className="ascii-border bg-background1 p-3 active:bg-background2 terminal-font flex items-center justify-center"
          >
            <ArrowRightIcon size={20} weight="bold" />
          </button>
          <div></div>
          <button
            onClick={() => handleTouchMove("DOWN")}
            className="ascii-border bg-background1 p-3 active:bg-background2 terminal-font flex items-center justify-center"
          >
            <ArrowDownIcon size={20} weight="bold" />
          </button>
          <div></div>
        </div>

        <div className="mt-4 terminal-font text-xs text-center text-foreground0 opacity-70">
          <p className="hidden md:block">{t("useArrowKeys")}</p>
          <p className="md:hidden">{t("tapToMove")}</p>
        </div>
      </div>
    </div>
  );
};
