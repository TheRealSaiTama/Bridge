import pygame
import random
import sys
from enum import Enum
from typing import List, Tuple, Optional

# --- Configuration & Constants ---
WINDOW_WIDTH = 800
WINDOW_HEIGHT = 600
BLOCK_SIZE = 20
GRID_WIDTH = WINDOW_WIDTH // BLOCK_SIZE
GRID_HEIGHT = WINDOW_HEIGHT // BLOCK_SIZE
FPS = 15

# Colors (R, G, B)
COLOR_BG = (30, 30, 30)          # Dark Gray
COLOR_SNAKE = (100, 255, 100)    # Bright Green
COLOR_FOOD = (255, 100, 100)     # Bright Red
COLOR_TEXT = (240, 240, 240)     # Off-White
COLOR_GRID = (50, 50, 50)        # Faint Gray

class Direction(Enum):
    UP = (0, -1)
    DOWN = (0, 1)
    LEFT = (-1, 0)
    RIGHT = (1, 0)

class GameObject:
    """Base class for game objects."""
    def __init__(self, position: Tuple[int, int], color: Tuple[int, int, int]):
        self.position = position
        self.color = color

    def draw(self, surface: pygame.Surface):
        rect = pygame.Rect(
            self.position[0] * BLOCK_SIZE,
            self.position[1] * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
        )
        pygame.draw.rect(surface, self.color, rect)
        # Optional: Draw a subtle border for "grid" look
        pygame.draw.rect(surface, COLOR_BG, rect, 1)

class Food(GameObject):
    """Represents the food item."""
    def __init__(self):
        super().__init__((0, 0), COLOR_FOOD)
        self.randomize_position([])

    def randomize_position(self, snake_body: List[Tuple[int, int]]):
        """Place food at a random location not occupied by the snake."""
        while True:
            x = random.randint(0, GRID_WIDTH - 1)
            y = random.randint(0, GRID_HEIGHT - 1)
            if (x, y) not in snake_body:
                self.position = (x, y)
                break

class Snake:
    """Represents the player's snake."""
    def __init__(self):
        self.reset()

    def reset(self):
        """Resets the snake to the center of the screen."""
        self.length = 1
        # Start in the middle
        start_x = GRID_WIDTH // 2
        start_y = GRID_HEIGHT // 2
        self.body: List[Tuple[int, int]] = [(start_x, start_y)]
        self.direction = random.choice(list(Direction))
        self.next_direction = self.direction
        self.color = COLOR_SNAKE

    def change_direction(self, new_dir: Direction):
        """Updates direction, preventing 180-degree turns."""
        # Cannot go opposite direction
        if (new_dir == Direction.UP and self.direction != Direction.DOWN) or \
           (new_dir == Direction.DOWN and self.direction != Direction.UP) or \
           (new_dir == Direction.LEFT and self.direction != Direction.RIGHT) or \
           (new_dir == Direction.RIGHT and self.direction != Direction.LEFT):
            self.next_direction = new_dir

    def move(self) -> bool:
        """
        Moves the snake. 
        Returns False if collision occurs, True otherwise.
        """
        self.direction = self.next_direction
        cur_x, cur_y = self.body[0]
        dx, dy = self.direction.value
        new_head = (cur_x + dx, cur_y + dy)

        # Wall Collision Check
        if not (0 <= new_head[0] < GRID_WIDTH and 0 <= new_head[1] < GRID_HEIGHT):
            return False

        # Self Collision Check
        if new_head in self.body[:-1]: # Ignore tail if it's about to move
             return False

        self.body.insert(0, new_head)
        if len(self.body) > self.length:
            self.body.pop()
        
        return True

    def grow(self):
        self.length += 1

    def draw(self, surface: pygame.Surface):
        for segment in self.body:
            obj = GameObject(segment, self.color)
            obj.draw(surface)

class Game:
    """Main Game Controller."""
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("Snake - Python Edition")
        self.surface = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("arial", 24)
        self.large_font = pygame.font.SysFont("arial", 48)

        self.snake = Snake()
        self.food = Food()
        self.running = True
        self.game_over = False
        self.score = 0
        self.high_score = 0

    def handle_input(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_UP:
                    self.snake.change_direction(Direction.UP)
                elif event.key == pygame.K_DOWN:
                    self.snake.change_direction(Direction.DOWN)
                elif event.key == pygame.K_LEFT:
                    self.snake.change_direction(Direction.LEFT)
                elif event.key == pygame.K_RIGHT:
                    self.snake.change_direction(Direction.RIGHT)
                elif event.key == pygame.K_r and self.game_over:
                    self.restart()
                elif event.key == pygame.K_q:
                    self.running = False

    def update(self):
        if self.game_over:
            return

        if not self.snake.move():
            self.game_over = True
            if self.score > self.high_score:
                self.high_score = self.score
            return

        # Check Food Collision
        if self.snake.body[0] == self.food.position:
            self.snake.grow()
            self.score += 1
            self.food.randomize_position(self.snake.body)

    def draw(self):
        self.surface.fill(COLOR_BG)

        # Draw Grid (Optional, for aesthetics)
        # for x in range(0, WINDOW_WIDTH, BLOCK_SIZE):
        #     pygame.draw.line(self.surface, COLOR_GRID, (x, 0), (x, WINDOW_HEIGHT))
        # for y in range(0, WINDOW_HEIGHT, BLOCK_SIZE):
        #     pygame.draw.line(self.surface, COLOR_GRID, (0, y), (WINDOW_WIDTH, y))

        self.food.draw(self.surface)
        self.snake.draw(self.surface)
        self.draw_ui()
        pygame.display.update()

    def draw_ui(self):
        score_text = self.font.render(f"Score: {self.score}  High Score: {self.high_score}", True, COLOR_TEXT)
        self.surface.blit(score_text, (10, 10))

        if self.game_over:
            overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 150)) # Semi-transparent black
            self.surface.blit(overlay, (0, 0))
            
            go_text = self.large_font.render("GAME OVER", True, (255, 50, 50))
            restart_text = self.font.render("Press 'R' to Restart or 'Q' to Quit", True, COLOR_TEXT)
            
            go_rect = go_text.get_rect(center=(WINDOW_WIDTH/2, WINDOW_HEIGHT/2 - 30))
            re_rect = restart_text.get_rect(center=(WINDOW_WIDTH/2, WINDOW_HEIGHT/2 + 30))
            
            self.surface.blit(go_text, go_rect)
            self.surface.blit(restart_text, re_rect)

    def restart(self):
        self.snake.reset()
        self.food.randomize_position(self.snake.body)
        self.score = 0
        self.game_over = False

    def run(self):
        while self.running:
            self.handle_input()
            self.update()
            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    game = Game()
    game.run()