# GoalTracker

As a user I want to be able to:
1. PIck my start and end date of the goal
2. Should be able to add multiple goals 
3. Track it ( checkmark done, cross missed it, uncheck have not started yet)
4. Being able to view the count of how many days left, how many did and did not do

Day - Date - Goal 1 - Goal 2 - Goal 2 - Goal 4 - Goal 5 - Notes - 
Remaining Day , Completed Day, Missed Day 
Customizable Field ( if they wanna make something visible in the page like current weight and make entry )

do not add anything exxecise keep it simple

---

## Simple 15-Day Sprint Demo

This workspace contains a minimal web app that reproduces the layout from the provided prototype image.

- Files added:
	- [index.html](index.html) — main HTML page
	- [styles.css](styles.css) — styles for the demo
  - [script.js](script.js) — app logic and localStorage
  - [assets/prototype.svg](assets/prototype.svg) — placeholder asset

## Run
Open [index.html](index.html) in your browser (double-click or `open index.html`). No build step required.

## Features
- Custom start/end date range with computed sprint duration
- Daily goal tracking with tri-state actions: done / missed / none
- Support for adding custom goals (e.g., Night Skincare)
- Week-based weight entry (every 7th day) plus ongoing weight log
- Progress summary (completion %, streak, remaining, missed)
- Sticky header, clean hierarchy, and responsive layout

## Next improvements
- Add unit toggle (lbs/kg)
- Add reset button and clear confirmation
- Add optional chart for weight trend over sprint
