```plantUML
@startuml
left to right direction
skinparam packageStyle rectangle

actor Player

rectangle "Super Cat and Steve" {
  usecase "Start Game" as UC1
  usecase "Select Level" as UC2
  usecase "Explore Level" as UC3
  usecase "Use Tools" as UC4
  usecase "Fight Enemies" as UC5
  usecase "Mine Resources" as UC6
  usecase "Collect Pollutants" as UC7
  usecase "Rescue Animals" as UC8
  usecase "Complete Level" as UC9
}

Player --> UC1
Player --> UC2
Player --> UC3
Player --> UC9

UC4 ..> UC3 : <<extend>>
UC5 ..> UC3 : <<extend>>
UC6 ..> UC3 : <<extend>>

UC9 ..> UC7 : <<include>>
UC9 ..> UC8 : <<include>>
@enduml

```