<div align="center">

# University of Bristol<br>Software Engineering - Group 15 (2026)

</div>

<p align="center">
  <img src="./SuperCatAndSteve/assets/pic/bg/startscreen.png" alt="SuperCat and Steve Start Screen" width="100%">
</p>

<p align="center">
  <a href="#" target="_blank"><img src="./docs/images/video icon.png" alt="Video icon" height="22"><img src="https://img.shields.io/badge/Watch%20Our%20Video-F28C28?style=for-the-badge" alt="Watch Our Video"></a>
  &nbsp;&nbsp;
  <a href="https://uob-comsm0166.github.io/2026-group-15/SuperCatAndSteve/" target="_blank"><img src="./SuperCatAndSteve/assets/pic/player_cat/Alex_right.png" alt="Alex right" height="22"><img src="https://img.shields.io/badge/Play%20Our%20Game-63C74D?style=for-the-badge" alt="Play Our Game"></a>
</p>

---

## Table of Contents

- [1. Team](#1-team)
- [2. Introduction](#2-introduction)
- [3. Requirements](#3-requirements)
  - [3.1 Case Diagram](#31-case-diagram)
  - [3.2 User Stories](#32-user-stories)
  - [3.3 Early Stage Design](#33-early-stage-design)
  - [3.4 Ideation Process](#34-ideation-process)
    - [Two Game Ideas](#two-game-ideas)
    - [Stakeholders](#stakeholders)
    - [Team Reflection on Requirements Workshop](#team-reflection-on-requirements-workshop)
- [4. Design](#4-design)
  - [4.1 Class Diagram](#41-class-diagram)
  - [4.2 Communication Diagram](#42-communication-diagram)
  - [4.3 Design Conclusion](#43-design-conclusion)
- [5. Implementation](#5-implementation)
  - [Camera Movement](#camera-movement)
  - [Physics Engine](#physics-engine)
  - [Gameplay Additions](#gameplay-additions)
- [6. Evaluation](#6-evaluation)
  - [6.1 Qualitative Analysis](#61-qualitative-analysis)
  - [6.2 Quantitative Analysis](#62-quantitative-analysis)
  - [6.3 JUnit Testing](#63-junit-testing)
- [7. Process](#7-process)
- [8. Conclusion](#8-conclusion)
- [9. Individual Contribution](#9-individual-contribution)

---
## Weekly Lab
## Weekly Labs

| Week | Title                                                         | Documentation |
|------|---------------------------------------------------------------|---------------|
| 01   | Lab 1: Game Ideas                                       | [README](https://github.com/UoB-COMSM0166/2026-group-15/tree/main/Homework_Week1_GameIdeas) |
| 02   | Lab 2: Spray Fun and Brainstorm                       | [README](https://github.com/UoB-COMSM0166/2026-group-15/tree/main/Homework_Week2_SprayFun) |
| 03   | Lab 3: Prototype & Game Selection                               | [README] (https://github.com/UoB-COMSM0166/2026-group-15/tree/main/Homework_Week3_Prototypes) |
| 04   | Lab 4: User Stories & Requirements Engineering                 | [README](link_to_readme_04) |
| 05   | Lab 5: Object-Oriented Design & Agile Estimation               | [README](link_to_readme_05) |
| 07   | Lab 7: Think Aloud Study & Heuristic Evaluation                | [README](link_to_readme_07) |
| 08   | Lab 8: HCI Evaluation — NASA-TLX & SUS                          | [README](link_to_readme_08) |
| 09   | Lab 9: Quality Assurance — Black-Box & White-Box Testing       | [README](link_to_readme_09) |

## 1. Team

![Team Photo](./docs/images/team-photo-with-name.jpg)

- Group member 1, Helen - Yitong Zheng 
- Group member 2, Li - Li Shen 
- Group member 3, Alice - Xianwen Hu
- Group member 4, Murphy - Jingyu Xiao
- Group member 5, Anna - Sirui Zhong
- Group member 6, Bella - Linjing Zhang

---

## 2. Introduction
Super Cat and Steve is an environmental-themed platform adventure built around three different worlds: a forest, an underwater area, and a factory.

Each level shares the same core. Move forward, jump across platforms, avoid danger, and stay alive. But the goal is not just to reach the end. Players also collect pollutants, use tools, rescue trapped animals, and deal with enemies such as zombies along the way.

The game takes its starting point from two familiar sources. From Mario, it borrows platform movement and obstacle-based progression. From Minecraft, it takes inspiration from pixel-art visuals and resource mining. These influences shape the basic form of the game, but the project tries to push them in a different direction.

What makes Super Cat and Steve distinctive is the way the environment affects play. In the underwater level, buoyancy changes how the player moves. In the factory level, pipes open up new routes. The result is a game where environmental protection is not only the theme, but also part of what the player actually does.

---

## 3. Requirements
### 3.1 Early-stage Design and Ideation
At the beginning of the project, our team did not decide the final game idea straight away. We first had a brainstorming session where each member suggested possible game types. The ideas we discussed included obstacle-avoidance games such as Snake and Temple Run, matching games like Tetris, level-based platform games inspired by Mario, and battle-style games based on a simplified version of Hearthstone. This gave us several possible directions and helped us compare different types of gameplay before making a decision.

<p align="center"><strong>Game Ideas and Discussion Results</strong></p>

| Game Type | Game Prototype | Game Description | Added Idea Points | Possible Challenges |
|----------|----------------|------------------|-------------------|---------------------|
| Platform Adventure / Roguelike / Mystery Gacha | Super Mario (platforming), Risk of Rain (RNG & risk/reward) | Players control Mario through platforming levels, jumping on enemies, collecting coins, and reaching the end flag. | (1) End-Level Box: 50/50 chance each level (Princess = bonuses, Dragon = player gets weaker but survives).<br>(2) Optional Boxes: Random power-ups in dangerous areas.<br>(3) Time Loop: Restart level, player keeps items/coins, loses health.<br>(4) Princess Blessings: Stack blessings for better rewards and higher Princess rates. | (1) RNG fairness & seed control<br>(2) Dynamic health bar & animation<br>(3) Sprite scaling & collision accuracy<br>(4) State persistence for time loop<br>(5) Particle systems (fireworks)<br>(6) Item effect stacking & timers<br>(7) Box placement & level balance<br>(8) Dynamic probability & pity system |
| Single-player / Multi-player / Arcade / Action / Strategy | Bomber Man | Players navigate a maze, placing bombs to destroy obstacles and enemies within a time limit. Each player has 3 lives. | (1) Explosive Block Types<br>- Chain explosions, mini-bombs, unusual fire patterns<br><br>(2) Dynamic Maze<br>- Walls move, paths open, blocks regenerate<br><br>(3) Enemy AI Variations<br>- Enemies can kick, throw, or push bombs | (1) Fair random maze generation<br>(2) Ensuring dynamic changes don’t disrupt gameplay<br>(3) Balancing different explosion behaviors |
| Multiplayer / MOBA / Action Strategy | Honor of Kings | A 5v5 MOBA focused on team-based combat, hero roles, strategy, and mechanical skill. | (1) Dynamic map events<br>(2) In-match progression choices<br>(3) Team coordination mechanics<br>(4) Improved tutorials & role guidance<br>(5) Post-match performance feedback | (1) Game balance across heroes & items<br>(2) High learning curve for new players<br>(3) Network latency & server stability<br>(4) Matchmaking fairness |
| Macro Management / Multi-tasking / Tower Defense | Command & Conquer: Red Alert | Players build bases, manage resources, research technology, and command land, sea, and air forces to defeat enemies. | (1) Random storyline events (e.g. cold snaps)<br>(2) Dynamic vision & radar systems<br>(3) Destructible terrain & structures<br>(4) Neutral resource competition | (1) RNG balance issues<br>(2) Collision recalculation after terrain change<br>(3) Fixed enemy paths reduce replay difficulty |
| Puzzle Game / Puzzle Adventure | Rusty Lake, Cube Escape, Monument Valley | Puzzle progression driven by observation, rule learning, experimentation, and information synthesis. | (1) Non-linear clue discovery<br>(2) Consistent rules with fair misdirection | (1) Interaction system accuracy (click/drag)<br>(2) Debugging non-linear puzzle states<br>(3) Puzzle logic & save-state management |
| Tower Defense | Kingdom Rush, Plants vs. Zombies | Players place defensive structures to stop waves of enemies from reaching their base. | Add collectible temporary buffs dropped by monsters to increase strategic depth. | Balancing randomness with strategy, avoiding interruption and visual clutter |
| Puzzle Game / Match-3 | Candy Crush Saga | Players swap tiles to match three or more items to meet level objectives within limited moves. | Add obstacles (chocolate, ice, chains) requiring multiple matches to clear. | Ensuring solvable boards & non-repetitive patterns; smooth animations & particle effects |


After careful consideration, we have selected two game concepts for further development.

The first is a Minecraft-themed 2D platformer. We plan to leverage the iconic pixel art and classic mechanics of Minecraft—such as biome-hopping (from grasslands to deep caves), tool upgrades, and using items like water buckets and TNT—to create a familiar yet fresh exploration and survival experience.

Its major advantages are significantly reduced asset creation by utilizing MC's established visual style and high recognizability among UK audiences. Another key feature of the game is the use of randomly generated enemies, ensuring that each playthrough feels unpredictable. In addition, the game includes multiple environments—such as underground caves, and underwater areas—each with distinct gameplay mechanics and movement constraints

The second is an environmental puzzle game centered on a core "time reversal" mechanic with platforms or maze maps. The player starts in a fully polluted city and must navigate through it, undo ecological damage by collecting various pollutants and healing affected wildlife. A character selection system with varied stats (e.g., healing vs. cleanup proficiency) influences multiple endings.

After choosing this direction, we developed the idea into Super Cat and Steve, an environmental platform game with three themed levels: forest, underwater, and factory. From this point, our requirements became more specific. The game needed to support basic movement, double jump, combat, item use, mining, score-based level completion, and interactions with environmental hazards. It also needed to include systems for collecting pollutants and rescuing trapped animals, since these actions were central to the theme of the game. According to the current gameplay design, players choose a level at the start, use keyboard controls to move, attack zombies with the F key, use the mouse for tools and mining, and pass the level by gaining enough score through cleanup and rescue tasks.
**The following is a paper prototype of our game:**
[![视频预览](https://img.youtube.com/vi/nzsu2YbncT4/maxresdefault.jpg)](https://youtu.be/nzsu2YbncT4)



### 3.2 Stakeholders 
To make our requirements clearer, we used the approach introduced in the requirements workshop. We first identified the stakeholders for the game, then grouped their needs into broader epics, and finally turned these into user stories and acceptance criteria. This was useful because it made us think about the project from different perspectives instead of only from the programmer’s side. In our materials, the stakeholders included not only players but also the development team, artists, testers, publishers, reviewers, teaching staff, and organisations interested in environmental education. This wider view helped us think more carefully about usability, portability, educational purpose, and overall presentation.

The player was still the main stakeholder, so most of our functional requirements were written around the player’s actions. A player should be able to choose a level, move through the environment, avoid or attack enemies, collect pollutants, use tools, rescue animals, and complete the level by earning enough points. However, writing these requirements as user stories made them more precise. Instead of saying that the game should be “interesting” or “educational”, we had to describe exactly what the user would do and what the system should return in response. The acceptance criteria were especially helpful because they gave us a simple way to decide whether a feature worked properly or not.

<img width="1536" height="1024" alt="onion model" src="https://github.com/user-attachments/assets/b7c967ee-8189-4378-b14c-9797fc61944e" />




### 3.3 Use Case Diagram
This use case diagram shows the main ways the player interacts with Super Cat and Steve. The player starts the game, selects a level, and then enters the main part of the gameplay, shown here as Explore Level. From this point, the player can carry out several different actions during the level, such as collecting pollutants, rescuing animals, using tools, fighting enemies, and mining resources.

We placed Explore Level at the centre of the diagram because it is the core activity of the game. Most of the important gameplay actions happen during exploration, while Complete Level represents the final objective. In our game, finishing a level is closely connected to environmental tasks, especially pollutant collection and animal rescue. For this reason, these two actions are shown as key parts of level completion. Overall, the diagram highlights that environmental protection is built into the gameplay itself rather than added only as background theme.

<img width="725" height="515" alt="case diagram" src="https://github.com/user-attachments/assets/d1997d90-a505-403e-b446-0775469490f4" />


### 3.4 User Stories and Acceptance Criteria
The following user stories were selected from our earlier requirements discussion and refined into a smaller set of core stories. We focused on the stories that were most closely related to the final version of *Super Cat and Steve*, especially its environmental theme, level design, player interaction, and testing needs.

| User Story / Epic | Acceptance Criteria |
| --- | --- |
| **As** a player, **I want** to move through different levels, collect pollutants, and rescue trapped animals, **so that** I can make progress while experiencing the environmental theme of the game. | **Given** the player is in a level, **when** they collect pollutants or rescue animals, **then** their score should increase accordingly.<br>**Given** the player reaches the required score, **when** the level objectives are completed, **then** the player should be able to pass the level. |
| **As** a player, **I want** to use tools in different situations, **so that** I can deal with hazards and complete environmental tasks more effectively. | **Given** the player has collected the correct tool, **when** they use it in the appropriate situation, **then** the related hazard or obstacle should be removed or reduced.<br>**Given** the player uses the wrong tool, **when** the action is triggered, **then** the game should not apply the intended effect. |
| **As** a designer, **I want** each level to represent a different environmental setting, **so that** players can experience a wider range of ecological problems during the game. | **Given** the player enters a new level, **when** the environment changes, **then** the level should show a distinct theme such as forest, underwater, or factory.<br>**Given** the player moves between levels, **when** the new scene loads, **then** the visual style and environmental challenges should clearly differ from the previous one. |
| **As** an artist, **I want** to create modular environmental tiles and assets, **so that** levels can be built efficiently while still looking visually consistent. | **Given** a complete tileset, **when** it is used to build a level, **then** tile edges should connect without obvious gaps.<br>**Given** different themed levels, **when** players view them, **then** the foreground, background, and characters should remain visually clear and easy to distinguish. |
| **As** a player, **I want** a clear resource and status UI, **so that** I can understand my current progress and react quickly during gameplay. | **Given** the game is in progress, **when** the player looks at the interface, **then** the UI should display key information such as score, health, or collected items.<br>**Given** the player’s status changes, **when** the change happens, **then** the UI should update immediately. |
| **As** a tester, **I want** to test the game across different levels and gameplay situations, **so that** I can identify bugs and help improve stability. | **Given** the game includes multiple levels, enemies, and environmental mechanics, **when** a tester plays through them, **then** unexpected behaviour should be recorded and reported clearly.<br>**Given** bugs are found, **when** the development team reviews the reports, **then** the issues should be reproducible and fixable. |
| **As** a professor or teaching assistant, **I want** to review the game design, implementation, and documentation, **so that** I can assess whether the project meets the module requirements. | **Given** the project has been submitted, **when** I review the game and its documentation, **then** I should be able to understand the design decisions, core features, and technical work completed by the team. |



### 3.5 Reflection on the Requirements Process
Through the requirements workshop, our team developed a clearer, more systematic way to capture and structure requirements by first analysing the jogging‑app case study and then applying the same techniques to our own environmental protection game. Starting from the case helped us separate the method (stakeholders → epics → user stories → acceptance criteria) from any specific domain, so we could later reuse it for our game design.

​In the case study, we began by identifying stakeholders such as employees, managers, health services, and transport providers, which showed us how many different parties are affected by a single app. From there we defined epics to describe high‑level goals, then broke these into user stories using the “As a… I want… So that…” template, which forced us to think concretely about each stakeholder’s needs and benefits.

We then wrote acceptance criteria in the Given–When–Then format to turn those stories into testable, unambiguous conditions, clarifying what “done” means for each requirement. After this, we transferred the same process to our environmental protection game by identifying our own stakeholders (players, environmental agencies, developers, etc.), grouping their goals into epics, and expressing concrete user stories and acceptance criteria for gameplay, learning outcomes, and technical behaviour.

​Applying these techniques to our game solidified the connection between requirements and the product's core context. It helped us align technical tasks (e.g., efficient asset loading) with business goals (portability) and user values (environmental education), ensuring that every feature we plan serves a clear purpose for both the project and its users.


Looking back, the requirements stage was not just an early planning task. It played an important role in shaping the whole project. It helped us choose an idea that matched both our interests and our technical ability, and it also gave us a clearer structure for development. Without that stage, the game would probably have remained a general “environmental game” idea rather than becoming a more focused platform adventure with clear goals and mechanics.

---

## 4. Design
- 15% ~750 words 
- System architecture. Class diagrams, behavioural diagrams.

- <img width="1590" height="700" alt="3339b730d5d336317972099c83ecc550" src="https://github.com/user-attachments/assets/b58ce78b-cf50-478e-ae06-c9fbae35e6a1" />

### 4.1 Class Diagram
Write here.

### 4.2 Communication Diagram
Write here.

### 4.3 Design Conclusion
Write here.

---

## 5. Implementation
- 15% ~750 words

- Describe implementation of your game, in particular highlighting the TWO areas of *technical challenge* in developing your game. 

### Camera Movement
Write here.

### Physics Engine
Write here.

### Gameplay Additions
Write here.

---

## 6. Evaluation
- 15% ~750 words

### 6.1 Qualitative Analysis

We conducted a **Think Aloud evaluation** on the **first forest level** and the **partially implemented second ocean level** to identify usability issues during gameplay.

#### Key Findings

- **Guidance and information**
  - Grey hint boxes were often overlooked until players were stuck, which suggests that their visibility is not sufficient, especially for younger players.

- **Combat and controls**
  - Enemies showed little reaction when hit and there were no clear health indicators, so players could not easily tell whether their attacks were successful or how many hits were required.
  - Some players instinctively tried **Left Click** to attack and mentioned that the attack animation did not match the actual hit range.

- **Items and environment behaviour**
  - Some tools stayed in the inventory after use while others disappeared, leaving players unsure whether tools were meant to be reusable or single‑use.
  - Lava could only be cleaned from one side, forcing players to backtrack, and cleaned acid pools looked unchanged, so it was hard to see whether an area was finished.

- **Movement and interface**
  - Rock collision boxes felt too large, making some jumps effectively impossible because of invisible boundaries.
  - Inventory slots were narrow, which made it difficult to collect and quickly review all tools and pollutants.

#### Follow-up Changes

In later iterations, we increased hint visibility, improved combat feedback and hitbox alignment, made tool and environment behaviour more consistent, and adjusted collision boxes and the inventory layout to make the game easier to play and understand.

================================================================================
原：
（- **UI/UX:** The gray hint boxes are not prominent enough and are easy to miss.
- **Combat & Mechanics:** 
	- **Enemy Interaction:** Enemy behaviors or hit reactions are needed. Enemies may need a life bar to indicate how many hits are needed before defeating them. 
    - **Controls:** Consider mapping the **Left Click** for attacks.
    - **Hitbox/Range:** The attack animation and the actual attack range need refinement.
        
- **Bugs & Logic:**
    - **Item Persistence:** Tools should not disappear from the inventory after being used.
    - **Lava**: Water cannot be used on the right side of the lava.
    - **Acid pool :** The acid pool should turn entirely blue (to signal a state change).
        
- **Level Design:** 
- **Collision:** Rocks are impossible to jump onto because their **collision boxes** are too large.
- **Inventory:** The slots for tools and pollutants are too narrow/short.）
================================================================================

### 6.2 Quantitative Analysis
We conducted a structured usability and workload evaluation with 10 participants. Each user played the game at two difficulty levels: **Level 1 (Easy)** and **Level 2 (Hard)**.

#### 6.2.1 Methodology
* **System Usability Scale (SUS):** A 10-item questionnaire to measure perceived usability.
* **NASA Task Load Index (TLX):** Measured across 6 dimensions to assess mental and physical workload.
* **Statistical Test:** Wilcoxon Signed-Rank Test (Paired, Two-tailed, $\alpha = 0.05$).

#### 6.2.2 Data Summary & Statistical Results
1.1.1 raw data

<img width="612" height="255" alt="SUS_raw" src="https://github.com/user-attachments/assets/26061f49-1f60-474f-87bb-11c12a449000" />

statistical analysis of SUS data:
<img width="1200" height="487" alt="SUS_analysis2" src="https://github.com/user-attachments/assets/19cfad5d-0a8b-49d1-b7a2-d41d8137339a" />

<img width="833" height="570" alt="TLX_raw" src="https://github.com/user-attachments/assets/b504fd59-07d3-47c9-90cd-2e7c486ff82d" />

Data Summary:
| Metric | Level 1 Mean (SD) | Level 2 Mean (SD) | Wilcoxon Statistic | P-value | Significant? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SUS Score** | 86.0 | 55.0 | $W = 0$ | $p < 0.01$ | **Yes** |
| **NASA TLX** | 27.6 | 21.9 | $W = 8.5$ | $p > 0.05$ | **No** |


#### 6.2.3 Key Findings

##### System Usability Scale (SUS)
The SUS score dropped significantly from **86.0 (Grade A - Excellent)** to **55.0 (Grade F - Poor)**. 
* **Interpretation:** The drastic drop suggests that as difficulty increases, the game's mechanics or UI become significantly more frustrating to use. The current "Hard" mode may be compromising the player's sense of control.

##### NASA Task Load Index (TLX)
Interestingly, the workload did not show a statistically significant difference ($p > 0.05$). 
* **Interpretation:** While players felt the game was "less usable" (via SUS), their overall perceived workload (mental/physical effort) remained relatively stable. This might be due to a small effective sample size ($n=6$ after ties) or players reaching a "ceiling" of effort early on.

### 6.3 JUnit Testing
- Description of how code was tested.

---

## 7. Process
- 15% ~750 words

- Teamwork. How did you work together, what tools and methods did you use? Did you define team roles? Reflection on how you worked together. Be honest, we want to hear about what didn't work as well as what did work, and importantly how your team adapted throughout the project.

---

## 8. Conclusion
Overall, this project helped us understand how difficult it is to turn a simple game idea into a working product. At the start, Super Cat and Steve seemed like a fairly straightforward platform game with an environmental theme. However, once we started building it, we realised that many small ideas were much harder to implement than expected. This was one of the biggest lessons from the whole project: in game development, even simple mechanics can become complicated when they interact with physics, level design, and player control.

One of the most difficult parts was the cat-following mechanic. We wanted the cat to move naturally with the main character, but this was harder than we first thought. Because the game contains multiple layers of platforms, the cat sometimes judged the wrong platform as the ground and moved to the upper level by mistake. In other situations, when the player jumped, the cat would also jump even though it was not always necessary. Solving this problem made us realise that companion behaviour needs more than just simple following logic. It also needs better judgement about terrain, timing, and movement state.

Another major challenge was the underwater level. We added buoyancy to make the level feel different from the others, but balancing this mechanic took time. Sometimes the character would keep floating upwards and even leave the screen, so we had to keep adjusting buoyancy, gravity, and movement control until the level felt playable. This showed us that environmental mechanics can make a game more interesting, but they also create balancing problems that need careful testing.

We also learned a lot about teamwork. Our group used a Kanban board to manage tasks and followed an agile style of development, with one sprint each week. We discussed progress in weekly meetings and used pull requests before merging code. This was useful because it reduced the chance of unnoticed bugs going directly into the main branch. At the same time, collaboration was not always smooth. Sometimes GitHub conflicts happened when several people edited similar files, and some bugs were only found by other team members during review. Even so, this process taught us how important communication and code review are in group software projects.

If we had more time, the most realistic next steps would be adding online multiplayer and trying AI-generated maps to improve replayability. If we developed a future version or sequel, we would also like to add more scenes, such as space levels or cave levels with limited visibility. These ideas would let us keep the same core gameplay while making the world larger and more varied.

In the end, we think this project was valuable not only because we made a playable game, but also because it taught us how to plan, test, discuss, and improve a shared idea as a team. The final version still has room for improvement, but it already shows the main concept we wanted to build: a platform game where environmental protection is part of the player’s actions, not just part of the background.

---

## 9. Individual Contribution
- Provide a table of everyone's contribution, which *may* be used to weight individual grades. We expect that the contribution will be split evenly across team-members in most cases. Please let us know as soon as possible if there are any issues with teamwork as soon as they are apparent and we will do our best to help your team work harmoniously together.

### Additional Marks

You can delete this section in your own repo, it's just here for information. in addition to the marks above, we will be marking you on the following two points:

- **Quality** of report writing, presentation, use of figures and visual material (5% of report grade) 
  - Please write in a clear concise manner suitable for an interested layperson. Write as if this repo was publicly available.
- **Documentation** of code (5% of report grade)
  - Organise your code so that it could easily be picked up by another team in the future and developed further.
  - Is your repo clearly organised? Is code well commented throughout?
