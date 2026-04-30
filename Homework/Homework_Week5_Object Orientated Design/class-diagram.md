```plantUML
@startuml
left to right direction
skinparam classAttributeIconSize 0
hide empty members

title Super Cat and Steve - Simplified Class Diagram

class Game {
  - state
  - level
  - player
  - uiManager
  + start()
  + update()
  + draw()
}

class Level {
  - platforms
  - enemies
  - items
  - animals
  + load()
  + update()
  + draw()
}

class ForestLevel
class WaterLevel
class FactoryLevel

class Player {
  - health
  - score
  - inventory
  + move()
  + jump()
  + attack()
  + collect()
  + useItem()
}

class Enemy {
  - health
  + update()
  + attack()
}

class Item {
  - type
  + update()
  + draw()
}

class Tool
class Weapon {
  - damage
}
class Pollutant {
  - value
}
class Animal {
  - rescued
  + rescue()
}

class UIManager {
  + drawHUD()
  + showMenu()
}

Level <|-- ForestLevel
Level <|-- WaterLevel
Level <|-- FactoryLevel

Item <|-- Tool
Item <|-- Weapon
Item <|-- Pollutant

Game *-- Player
Game *-- Level
Game *-- UIManager

Level o-- Enemy
Level o-- Item
Level o-- Animal

Player o-- Item : inventory
Player ..> Enemy : attacks
Player ..> Item : collects / uses
Player ..> Animal : rescues

UIManager ..> Game : displays

@enduml

```