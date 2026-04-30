# Privacy

 The current version of *Super Cat and Steve* does not ask the player to create an account or enter personal details such as name, email, age, location, or phone number. The game can be played without knowing who the player is, so we do not need to collect personally identifiable data.

The data used by the game is mostly normal gameplay state, such as the current level, health, score, inventory, sound volume, language setting, and level progress. This data is used only to run the game and update the screen. We did not find code for cookies, analytics, advertising trackers, login systems, databases, or sending player data to a server.

Because of this, the current privacy risk is low. The game keeps its main features without collecting personal data. This also makes the design simpler, because we do not need to store or protect sensitive user information.

For future work, we should keep the same approach
- do not add login unless it is really needed;
- do not collect names, emails, locations, or device identifiers;
- keep scores and settings local to the browser if saving is added;
- explain clearly to players if any data is collected later;
- add a reset option if saved progress or settings are stored.

The main privacy risk would come from future features such as online leaderboards, accounts, analytics, or cloud saving. If we add any of these, we should only collect the minimum data needed and make the purpose clear to the player.
