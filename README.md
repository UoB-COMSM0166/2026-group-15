# 2026-group-15
2026 COMSM0166 group 15

# COMSM0166 Project Template
A project template for the Software Engineering Discipline and Practice module (COMSM0166).

## Info

This is the template for your group project repo/report. We'll be setting up your repo and assigning you to it after the group forming activity. You can delete this info section, but please keep the rest of the repo structure intact.

You will be developing your game using [P5.js](https://p5js.org) a javascript library that provides you will all the tools you need to make your game. However, we won't be teaching you javascript, this is a chance for you and your team to learn a (friendly) new language and framework quickly, something you will almost certainly have to do with your summer project and in future. There is a lot of documentation online, you can start with:

- [P5.js tutorials](https://p5js.org/tutorials/) 
- [Coding Train P5.js](https://thecodingtrain.com/tracks/code-programming-with-p5-js) course - go here for enthusiastic video tutorials from Dan Shiffman (recommended!)

## Your Game (change to title of your game)

STRAPLINE. Add an exciting one sentence description of your game here.

IMAGE. Add an image of your game here, keep this updated with a snapshot of your latest development.

LINK. Add a link here to your deployed game, you can also make the image above link to your game if you wish. Your game lives in the [/docs](/docs) folder, and is published using Github pages. 

VIDEO. Include a demo video of your game here (you don't have to wait until the end, you can insert a work in progress video)

## Your Group

GROUP PHOTO. Add a group photo here.
![56c06f5ec6637c886f714ad5747c9ef1](https://github.com/user-attachments/assets/912356cb-d3f9-4d59-86cc-0887810f2660)

- Group member 1, name, email, role
- Group member 2, name, email, role
- Group member 3, name, email, role
- Group member 4, name, email, role
- Group member 5, name, email, role
- Group member 6, name, email, role

## Project Report

### Introduction

- 5% ~250 words 
- Describe your game, what is based on, what makes it novel? (what's the "twist"?) 

### Requirements 

- 15% ~750 words
- Early stages design. Ideation process. How did you decide as a team what to develop? Use case diagrams, user stories. 

###### Table 1: Game ideas and discussion results
| Game Type | Game Prototype | Game Description | Added Idea Points | Possible Challenges |
|----------|----------------|------------------|-------------------|---------------------|
| Platform Adventure / Roguelike / Mystery Gacha | Super Mario (platforming), Risk of Rain (RNG & risk/reward) | Players control Mario through platforming levels, jumping on enemies, collecting coins, and reaching the end flag. | (1) End-Level Box: 50/50 chance each level (Princess = bonuses, Dragon = player gets weaker but survives).<br>(2) Optional Boxes: Random power-ups in dangerous areas.<br>(3) Time Loop: Restart level, player keeps items/coins, loses health.<br>(4) Princess Blessings: Stack blessings for better rewards and higher Princess rates. | (1) RNG fairness & seed control<br>(2) Dynamic health bar & animation<br>(3) Sprite scaling & collision accuracy<br>(4) State persistence for time loop<br>(5) Particle systems (fireworks)<br>(6) Item effect stacking & timers<br>(7) Box placement & level balance<br>(8) Dynamic probability & pity system |
| Single-player / Multi-player / Arcade / Action / Strategy | Bomber Man | Players navigate a maze, placing bombs to destroy obstacles and enemies within a time limit. Each player has 3 lives. | (1) Explosive Block Types<br>- Chain explosions, mini-bombs, unusual fire patterns<br><br>(2) Dynamic Maze<br>- Walls move, paths open, blocks regenerate<br><br>(3) Enemy AI Variations<br>- Enemies can kick, throw, or push bombs | (1) Fair random maze generation<br>(2) Ensuring dynamic changes don’t disrupt gameplay<br>(3) Balancing different explosion behaviors |
| Multiplayer / MOBA / Action Strategy | Honor of Kings | A 5v5 MOBA focused on team-based combat, hero roles, strategy, and mechanical skill. | (1) Dynamic map events<br>(2) In-match progression choices<br>(3) Team coordination mechanics<br>(4) Improved tutorials & role guidance<br>(5) Post-match performance feedback | (1) Game balance across heroes & items<br>(2) High learning curve for new players<br>(3) Network latency & server stability<br>(4) Matchmaking fairness |
| Macro Management / Multi-tasking / Tower Defense | Command & Conquer: Red Alert | Players build bases, manage resources, research technology, and command land, sea, and air forces to defeat enemies. | (1) Random storyline events (e.g. cold snaps)<br>(2) Dynamic vision & radar systems<br>(3) Destructible terrain & structures<br>(4) Neutral resource competition | (1) RNG balance issues<br>(2) Collision recalculation after terrain change<br>(3) Fixed enemy paths reduce replay difficulty |
| Puzzle Game / Puzzle Adventure | Rusty Lake, Cube Escape, Monument Valley | Puzzle progression driven by observation, rule learning, experimentation, and information synthesis. | (1) Non-linear clue discovery<br>(2) Consistent rules with fair misdirection | (1) Interaction system accuracy (click/drag)<br>(2) Debugging non-linear puzzle states<br>(3) Puzzle logic & save-state management |
| Tower Defense | Kingdom Rush, Plants vs. Zombies | Players place defensive structures to stop waves of enemies from reaching their base. | Add collectible temporary buffs dropped by monsters to increase strategic depth. | Balancing randomness with strategy, avoiding interruption and visual clutter |
| Puzzle Game / Match-3 | Candy Crush Saga | Players swap tiles to match three or more items to meet level objectives within limited moves. | Add obstacles (chocolate, ice, chains) requiring multiple matches to clear. | Ensuring solvable boards & non-repetitive patterns; smooth animations & particle effects |


#### Two Game Ideas

We have selected two game concepts for further development.

The first is a Minecraft-themed 2D platformer. We plan to leverage the iconic pixel art and classic mechanics of Minecraft—such as biome-hopping (from grasslands to deep caves), tool upgrades, and using items like water buckets and TNT—to create a familiar yet fresh exploration and survival experience.

Its major advantages are significantly reduced asset creation by utilizing MC's established visual style and high recognizability among UK audiences. Another key feature of the game is the use of randomly generated enemies, ensuring that each playthrough feels unpredictable. In addition, the game includes multiple environments—such as underground caves, and underwater areas—each with distinct gameplay mechanics and movement constraints.

The second is an environmental puzzle game centered on a core "time reversal" mechanic with platforms or maze maps. The player starts in a fully polluted city and must navigate through it, undo ecological damage by collecting various pollutants and healing affected wildlife. A character selection system with varied stats (e.g., healing vs. cleanup proficiency) influences multiple endings.

A key design feature is that the game encourages players to retrace their steps. During the final phase, players must return along the same path they previously traveled. However, the environment has changed due to their actions, causing new tools, routes, or interactions to appear. This allows players to evaluate whether their choices have successfully led to a cleaner, healthier city. While the theme is impactful and the rewind mechanic is innovative, the main challenges was the complexity of tracking and reversing player's states and the additional asset for branching narratives.




https://github.com/user-attachments/assets/4a29aa32-1bd0-4df8-8a10-b927c0467f35


#### Stakeholders

1. The System:
- Development Team
- Designer
- Artists
- Testers
- Publisher

2. The Containing System:
- Players
- Family Member and Friends of Players (Potential Users)

3. The Wider Environment
- Other Teams
- Professors & Teaching Assistants

4. The External Environment
- Environmental Protection Department (Government)
- Network Supervision Departments
- Stockholders
- Regulators

###### Table 2: User Story and Acceptance Criteria 
| User Story / Epic                                                                                                                                                                                                                                                                                       | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **As** a development team, **I want** players with different skill levels to also get perfect feedback, **so that** I code easy and difficult game levels.                                                                                                                                              | **Given** a player who is new to the game, **when** they choose the easy difficulty setting, **then** they should receive immediate feedback, such as earning points or completing an achievement.                                                                                                                                                                                                                                                                                                                                                                               |
| **As** development Team, **I want** the game take up little storage space, **so that** the game should be portable.                                                                                                                                                                                     | **Given** we have to develop 3 levels for each map, we decided to use pixel background, **when** the game is launched, it can be played online and take up less than 1GB.                                                                                                                                                                                                                                                                                                                                                                                                        |
| **As** a development team,  <br>**I want** the game to take up minimal storage space,  **so that** it is easy to distribute and portable across different devices.                                                                                                                                      | **Given** the game includes three levels for each map,  **when** the game is developed and launched using pixel-style backgrounds and online assets,  **then** the game can be played online and the total storage size is less than 1 GB.                                                                                                                                                                                                                                                                                                                                       |
| **As** a designer, **I want** everyone who plays our game to feel that protecting the environment is a long process, **so that** I make different pollutants in the game levels.                                                                                                                        | **Given** that this game will target players of different age groups, **when** promoting this game, **then** we should consider the preferences of different age demographics and focus on the game’s primary target audience.                                                                                                                                                                                                                                                                                                                                                   |
| **As** a​n artist, **I want** to​ create a set of modular environmental tiles (e.g., land, rocks, trees, backgrounds), **so that**​ the level designer can quickly and flexibly build diverse yet visually cohesive levels.                                                                             | **Given**​ a complete tileset, **when**​ the level designer uses it in the editor, **then**​ all tile edges must connect seamlessly without visual gaps.<br>**Given**​ different biomes (e.g., surface, underground mine), **when**​ switching between them, **then**​ the tiles should have distinct colors and textures to signal the area change.<br>**Given**​ a built level, **when**​ a player views it, **then**​ the foreground, background, and characters must have a clear visual hierarchy to prevent clutter.                                                       |
| **As** a tester, **I want** to test all game levels and difficulty settings thoroughly, **so that** I can ensure the game works correctly and provides a smooth experience for players.                                                                                                                 | **Given** that the game has multiple difficulty levels and environmental challenges, **when** I play through each level and report bugs or unexpected behaviors, **then** the development team should be able to fix issues and improve gameplay stability.                                                                                                                                                                                                                                                                                                                      |
| **As** a publisher, **I want** the game to be released on multiple platforms such as mobile and PC, **so that** more players can easily access and play the game.                                                                                                                                       | **Given** the game is ready for launch, **when** it is published on various platforms and app stores, **then** players should be able to download, install, and play without technical issues.                                                                                                                                                                                                                                                                                                                                                                                   |
| **As** a​ player, **I want** to​ have a clear resource UI display, **so that​** I can always be aware of my current resource status.                                                                                                                                                                    | **Given**​ the game is in progress, **when**​ I look at the interface, **then**​ it must show the current counts of pollutants, energy value, and satiety level.<br>**Given**​ any resource quantity changes, **when**​ the change occurs, **then**​ the UI must update in real-time.                                                                                                                                                                                                                                                                                            |
| **As** an environmentally conscious player,<br>**I want** to explore polluted virtual worlds and undertake missions like helping clean ocean and plant forests, **so that** I can restore ecosystems and feel the impact of my actions on wildlife  while enjoying immersive gameplay.                  | **Given** a polluted level start, **when** I complete cleanup missions, **then** CO2 level drops and biodiversity increases.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **As** a member of the environmental protection department, **I want** to raise society's environmental protection awareness through EcoGuard, **so that** we can collaborate with the game, collect anonymized player data, and engage players in real-world campaigns like ocean waste cleanup.       | **Given** a critical mass of environmentally conscious players, **when** we review and analyze aggregated gameplay data internally, **then** we identify trends to organize tailored eco-activities for different player segments.                                                                                                                                                                                                                                                                                                                                               |
| **As** a professor or teaching assistant, **I want** to review the game design, implementation, and documentation, **so that** I can evaluate whether the project meets the course requirements and learning objectives.                                                                                | **Given** that the game project is submitted for assessment, **when** I play the game and review the technical and design documentation, **then** I should be able to assess the students’ understanding of game development and provide feedback.                                                                                                                                                                                                                                                                                                                               |
| **As** a game reviewer, **I want** to experience and evaluate the gameplay, graphics, and overall fun of the game, **so that** I can provide an objective review and inform potential players about the game’s quality.<br>                                                                             | **Given** that the game is publicly available or provided for review, **when** I play through the game and analyze user experience, **then** I should be able to write a comprehensive review that highlights the game’s strengths and weaknesses.                                                                                                                                                                                                                                                                                                                               |
| **As** the network supervision departments,  **I want** the the game to be educational and positive while encouraging children to learn about environmental protection, **so that** the props in the game should relate to real world and contains that are unsuitable for children should be excluded. | **Given** the game is an environmental protection game designed for children aged 6–12,  **when** a child plays the game continuously for more than 30 minutes,   **then** a clear warning message about the risks of excessive gaming is displayed on screen for at least 10 second.<br>**Given** the game is ready for public release,  **when** it is reviewed by a supervision team consisting of at least 3 educational or child-development experts,  **then** the game must achieve a content safety approval rating of 100% compliance with child protection guidelines. |


### Design

- 15% ~750 words 
- System architecture. Class diagrams, behavioural diagrams. 

### Implementation

- 15% ~750 words

- Describe implementation of your game, in particular highlighting the TWO areas of *technical challenge* in developing your game. 

### Evaluation

- 15% ~750 words

- One qualitative evaluation (of your choice) 

- One quantitative evaluation (of your choice) 

- Description of how code was tested. 

### Process 

- 15% ~750 words

- Teamwork. How did you work together, what tools and methods did you use? Did you define team roles? Reflection on how you worked together. Be honest, we want to hear about what didn't work as well as what did work, and importantly how your team adapted throughout the project.

### Conclusion

- 10% ~500 words

- Reflect on the project as a whole. Lessons learnt. Reflect on challenges. Future work, describe both immediate next steps for your current game and also what you would potentially do if you had chance to develop a sequel.

### Contribution Statement

- Provide a table of everyone's contribution, which *may* be used to weight individual grades. We expect that the contribution will be split evenly across team-members in most cases. Please let us know as soon as possible if there are any issues with teamwork as soon as they are apparent and we will do our best to help your team work harmoniously together.

### Additional Marks

You can delete this section in your own repo, it's just here for information. in addition to the marks above, we will be marking you on the following two points:

- **Quality** of report writing, presentation, use of figures and visual material (5% of report grade) 
  - Please write in a clear concise manner suitable for an interested layperson. Write as if this repo was publicly available.
- **Documentation** of code (5% of report grade)
  - Organise your code so that it could easily be picked up by another team in the future and developed further.
  - Is your repo clearly organised? Is code well commented throughout?
