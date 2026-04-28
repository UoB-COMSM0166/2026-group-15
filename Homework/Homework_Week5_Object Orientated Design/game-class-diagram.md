```mermaid
classDiagram

class Game {
  +currentLevel: Level
  +state: GameState
  +player: Player
  +uiManager: UIManager
  +startGame()
  +selectLevel(levelType)
  +update()
  +checkCollisions()
  +checkWinCondition()
}

class Level {
  +platforms
  +enemies
  +items
  +animals
  +tileMap
  +loadAssets()
  +generateTerrain()
  +drawLevel()
}

class ForestLevel {
  +generateTerrain()
}

class FactoryLevel {
  +generateTerrain()
}

class WaterLevel {
  +generateTerrain()
}

class Platform {
  +isTerrain
}

class Player {
  +health
  +inventory
  +equippedWeapon
  +score
  +move()
  +jump()
  +attack()
  +collectItem(item)
  +useTool(tool)
  +mineBlock()
  +takeDamage(amount)
}

class Enemy {
  +health
  +attackRange
  +update(player)
  +attackPlayer(player)
  +takeDamage(amount)
}

class Zombie

class Item {
  +itemType
  +applyEffect(target)
}

class Pollutant {
  +pollutionType
  +applyEffect(target)
}

class Tool {
  +toolType
  +use(target)
}

class Weapon {
  +weaponType
  +damage
  +use(target)
}

class Animal {
  +rescueState
  +onRescued()
}

class UIManager {
  +drawHUD(player)
  +showGuide()
  +updateProgress()
}

Level <|-- ForestLevel
Level <|-- FactoryLevel
Level <|-- WaterLevel

Enemy <|-- Zombie

Item <|-- Pollutant
Item <|-- Tool
Item <|-- Weapon

Item <|-- Animal

Game *-- Player : has
Game *-- Level : has
Game *-- UIManager : has

Level *-- Platform : contains
Level o-- Enemy : enemies
Level o-- Item : items
Level o-- Animal : animals

Player o-- Item : inventory
Player ..> Tool : uses
Player ..> Weapon : uses

UIManager ..> Player : render HUD
UIManager ..> Game : read state
```

The class diagram shows the high-level structure of *Super Cat and Steve*. The `Game` class acts as the main controller, connecting the current `Level`, the `Player`, and the `UIManager`. The base `Level` class is specialised by `ForestLevel`, `WaterLevel`, and `FactoryLevel`, which allows each world to define its own terrain, enemies, items, animals, and environmental behaviour while keeping the main game loop shared.

The diagram also shows the main gameplay objects around the player. `Player` handles actions such as movement, combat, mining, item collection, and tool use. `Item` is extended by more specific types such as `Tool`, `Pollutant`, and `Weapon`, while `Enemy` and `Animal` represent threats and rescue targets. Overall, the diagram presents the intended object-oriented design without including low-level implementation details.
