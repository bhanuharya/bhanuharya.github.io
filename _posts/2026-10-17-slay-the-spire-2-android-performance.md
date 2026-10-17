---
layout: post
title: "Nineteen releases of tuning Slay the Spire 2 on a tablet"
date: 2026-10-17
author: bhanuharya
tags: [android, godot, dotnet, performance, ai-agents]
---

Last time, my copy of Slay the Spire 2 ended up running on an iPhone and running *better* on my Android tablet. "Better" was carrying a lot of weight in that sentence. Fights were fine until the hand filled up, and I play Silent, whose whole plan is filling the hand. Big shiv turns crawled.

So I gave Claude Code one goal: make the game good on my tablet, especially with a lot of cards on screen. Nineteen releases later, here's what happened. Most of it went well. A good part of it took longer than it should have, for two reasons I'll get to. First, nobody could see the game's code. Second, a log that says two things happen together doesn't say one causes the other. I learned the second one twice.

The usual disclaimer applies. I typed. Claude measured, wrote and shipped. I played a lot of Silent and sent log files.

## The setup

| | |
|---|---|
| Tablet | Xiaomi Pad 5: Snapdragon 860, Adreno 640 GPU, 2560×1600 at 120 Hz |
| Game | Slay the Spire 2: Godot 4.5, game code in C# |
| Runtime on Android | .NET's Mono runtime, with a JIT |
| Build | [StS2 Launcher Perf](https://github.com/bhanuharya/sts-2-launcher-mobile): upstream's Android launcher plus a performance add-on |

Everything below lives in that add-on. It changes the running game with Harmony patches and settings in the Perf settings panel. Every setting is off by default, and a **Recommended** button turns on the ones worth having.

## Step one: make the game say where the time goes

The first post's lesson was "measure before fixing", so this time measuring came first. The add-on got a frame log: every 10 seconds, one line that splits each frame into three parts.

- **logic:** the game's code, animations and tweens.
- **draw:** the CPU side of rendering.
- **gpu:** the GPU's own time.

Then a line for every stutter over 50 ms, with what happened during it:

```text
[Perf] hitch 121 ms: instancing 6 4 ms (vfx_damage_num 3 ms, ...); nodes +10 (vfx_attack_slash x1, hit_spark_vfx x1, ...) | logic 117 draw 4 other 1 gpu 13 ms
```

That split turned out to be the most useful thing in the whole project. A slow frame with the GPU near the frame time is a graphics problem. A slow frame with the GPU idle is a code problem. Those need completely different fixes, and before the log I couldn't tell which I had.

## Cards were half the GPU

At full resolution, a fight took the GPU about 26 ms per frame. Holding 60 fps needs under 16.7. Claude wrote a "scene probe" that hides one part of the screen at a time for a moment and measures what the GPU time drops to:

| Part of a Silent fight | GPU time per frame |
|---|---|
| ~7 cards in hand | 12.7 ms |
| Background (6 layers) | ~6.6 ms |
| Enemies and Silent | ~3 ms |
| An invisible transition overlay | 2.2 ms |

Half the frame was the cards. Each card is drawn offscreen first, then pasted onto the screen with a ripple shader. On a phone GPU, which renders the screen in small tiles, every offscreen pass costs roughly a full-screen read and write. Seven cards meant seven of them, every frame.

**Card rendering → Fast** draws the cards straight to the screen instead. The ripple effect goes, and you'd have to look for it to notice. The fight's GPU time went from about 25 ms to 14–15 ms.

Two smaller fixes came from the same probe:

- **Card trails → Off.** At the end of each turn, discarded cards fly to the pile with a trail, and frames ran at about 90 ms for 2–3 seconds. That's gone.
- **Idle transition layer → Skip.** The full-screen fade layer was drawn even while invisible: 2.2 ms per frame for nothing. The first version also hid the real fade between rooms, so the rest site flashed for a second before a fight. I reported that as "weird thing it load the previous when it should be battle". Fixed the next release.

## The JIT tax

On Android the game's C# runs on Mono's JIT, so every method gets compiled the first time it runs. The first Blade Dance of the session, the first of a new enemy, the first of a new screen: each compiles on the spot and stalls a frame.

The fix is **JIT warm-up**. The add-on records every game method compiled during a session, and next launch it compiles them all at the main menu, 6 ms per frame so the menu keeps drawing. The first attempt compiled the whole game at once, and that crashed natively. Compiling only what earlier sessions actually used worked. Methods compiled during play dropped from 4,166 a minute to 284.

## Ten releases of guessing

With the GPU fixes and the warm-up, fights went from 15–30 fps to 45–58. Then the logs stopped pointing anywhere useful. Three problems stayed:

1. **The same assets loading over and over.** In one 80-minute run, the game logged "Asset not cached" 482 times for the same few files: the card tooltip 67 times, Silent's energy icon 59, the power icons dozens each. Most of those loads came right before a stutter.
2. **Enemy turns.** I told Claude "i notice when enemy making move fps drop". The split showed 45–85 ms of logic on those frames, with the GPU at a relaxed 12 ms. Creating the hit effects took 4–7 ms of that. The game's scripts took almost nothing. Something else was spending 40–80 ms, and none of the instruments could see what.
3. **One act costing twice as much.** Fights in Underdocks took about twice the GPU time of the other acts.

Each release added another instrument: load timing, scene creation timing, per-frame script timing, async timing. Each log narrowed it down a little. After the fourth or fifth round I asked what I should have asked at the start:

> why we keep repeating, why can't you identify from the code what we can tune

The answer was simple: Claude didn't have the code. The game's files live on my tablet, downloaded with my Steam login, and I'd kept them away from Claude's workspace on purpose, since the repo is public. So Claude had been profiling a black box from the outside, one release at a time.

I own the game. I sent Claude `sts2.dll` from my own install. It decompiled it privately into 3,424 source files, which never went near the repo, and read the parts the logs had been circling.

## What the game's code said

It took about ten minutes, less than one release cycle.

**The repeated loads were on purpose.** The game preloads a list of assets for each room. Anything else a room needs is loaded on the spot and marked "missed". At every room change, the game destroys every missed asset. So the tooltip and the icons load again in every single room, by design.

It also explained why an earlier fix had failed. Claude had made the add-on hold on to assets that kept getting reloaded. But the game destroys the very objects being held. The correlation was right and the guessed cause was wrong. The real fix is one line: **Keep loaded assets** turns the unload method into a no-op.

**Enemy turns rebuilt the whole combat UI, frame after frame.** Every change in a fight (HP, block, a power ticking down, energy, a card moving) asks for a UI refresh on the next frame. The refresh rebuilds every card in your hand: it re-formats the description, works the damage preview through every power and relic, and re-measures the text at several font sizes until it fits. It also rebuilds every intent, every health display, the energy counter and the end-turn button. During an enemy's move something changes on almost every frame. **Combat UI refresh → 10 per second** keeps the game's own refresh code and only changes how often it runs. The hand's cards now also update a few per frame instead of all at once.

**Colored numbers ran C# for every letter, every frame.** "Deal **6** damage" in gold is a custom text effect, and Godot calls its C# code for each character of it on every frame: every number on every card, intent and tooltip. A Decimillipede fight had run at 44–51 ms of logic per frame, and everything the log could time explained only about 12 of it; this was what the code pointed at for the rest. **Text colors → Built-in** converts those tags to Godot's own color tag, which draws natively and only when the text changes. Same colors.

Here's what logic looks like now, in an hour-long session at full resolution with all of that on:

| | Before the code fixes | After |
|---|---|---|
| Enemy moves followed by a slow-logic frame | every hit | 1 in 5 (26 of 121) |
| Logic on those frames | 45–85 ms | around 50 ms |
| Logic per frame, median per fight | 44–51 ms in the worst fight | 5.5–10 ms in every fight |

Most enemy turns are smooth now, and the CPU is no longer what holds a fight back. The Decimillipede hasn't shown up in a log since, so that row is still waiting for its rematch, and the one-in-five enemy moves are still on the list.

### Does this need my DLL on everyone's phone?

No. The DLL was for reading the game's code. The app ships only the add-on, which finds those methods by name and patches them in each player's own copy of the game, downloaded from their own Steam account. If an update renames something, the add-on logs it and leaves that part to the game.

## Then the engine's code

With logic fixed, the log had a new pattern. In a slime fight, stretches of 1–6 seconds where every frame took 97 ms on the GPU: 10 fps. Every one started within a second of a slime's move. The Foul Potion did it too, and treasure rooms.

This time the culprit was in Godot itself, so Claude read Godot 4.5's source. Every slime move plays a goo splash, and the goo particles are set to bounce off things. While any such emitter is on screen, even with zero particles out (I play with particles at 0%), Godot rebuilds a collision map of the whole screen every frame. By default that's the screen plus 20% on every side, 3584×2240 on my tablet, with eleven compute passes.

The proof was a number. The map's buffers come to exactly 26.8 MB, and the frame log had shown texture memory jumping by exactly +26.8 MB on the first slime splash of every session, since its first version. Nobody had asked why. On a desktop with the same Godot version, one such emitter took a frame from 28.6 ms to 286 ms.

The collision map is built from collision shapes in the scene. With none, nothing can collide, so all that work changes nothing on screen. **Particle collisions → Light** turns collision off for those emitters (same motion, no map) and keeps the map small for anything else.

The first version only half worked. The splash brings its own collision shape, a floor for the goo, so the "nothing to collide with" check switched itself back off on every splash. The smaller map still took the frames from 97 ms to about 20. The next release skips collision whenever particles are at 0%, and the log for the slime fight now says `collision map 0 frames`. Slimes run at 53 fps.

## The garbage collector that wasn't

Correlation, round two. In one 24-minute session a third of the stutters had a garbage collection in them, and the 49 big collections sat in frames averaging 300 ms. Claude concluded the collector was the problem.

Mono only takes its options from environment variables, read once as it starts. The add-on runs inside Mono, too late to set them. So Claude added a small Android content provider to the APK. Android starts an app's providers before its first screen, so before Godot starts Mono. The add-on writes the options to a file, and the provider sets them on the next launch. If a launch with them ever fails to come up, the next one starts without them. With that, release 18 shipped a "concurrent garbage collector" setting, and turned on Mono's own log of every collection.

That log is what showed the theory was wrong:

```text
Mono: GC_MINOR: (Nursery full) time 6.86ms, stw 8.11ms promoted 603K major size: 67744K ...
Mono: GC_MAJOR_CONCURRENT_START: (LOS overflow)
Mono: GC_MAJOR: (user request) time 104.51ms, stw 110.07ms ...
```

- Small collections stop the game for 6–10 ms. They were in the long frames, but they weren't what made them long.
- Mono on Android was already using the concurrent collector. My new setting changed nothing, and it's gone in release 19.
- The genuinely long ones, 100–150 ms, are the game calling `GC.Collect()` itself after each room loads, during the fade between rooms.

The one real garbage fix came from the code, not the collector. The wavy `[sine]` text creates a throwaway dictionary wrapper, with a finalizer, for every letter on every frame. That's about 2,500 a second for values that never change. The add-on now runs the same wave and reads each tag's settings once.

## Underdocks: it was the water

Release 18 was my best tablet session yet, right up until the act changed. Same run, same settings, full resolution:

| Act | fps (median per fight) | GPU per frame |
|---|---|---|
| Overgrowth | 51–56 | 12–15 ms |
| Hive | 47–54 | 14–15 ms |
| Underdocks | 18–36 | 19–54 ms |

Fifteen minutes at 18 fps. My review of that release was "really really bad".

The add-on takes a snapshot of the scene whenever the GPU stays slow, and those snapshots named the cause: the water. Underdocks' water shimmer is about 19 sprites drawn additively, one on top of another, with a two-noise fire shader. Several of them cover half the screen or more. They sit inside 7–9 clip masks that keep the shimmer inside the water, and each mask is drawn offscreen first, the same trick that made the cards expensive. The base water layers also run a ripple shader. Overgrowth's background has none of that.

**Background animation → Off** (it used to be just "Background sway") now stills it: the shimmer isn't drawn, the masks draw as plain layers, and the ripple comes off. The water art stays where it is; it just stops moving. A stand-in scene in Godot on a desktop went from 655 ms per frame to 195. That's a software renderer, so only the ratio means anything. Particles at 0% also stop drawing emitters entirely now, because Godot updates every drawn emitter on the GPU each frame even with nothing to emit, and Underdocks has 22–25 in its background alone.

That's release 19, and it hasn't been on the tablet yet.

## Division of labour, part 2

| Task | Me | Claude |
|---|---|---|
| Playing hour-long Silent runs and uploading logs | ✓ | |
| Noticing enemy turns felt bad | ✓ | |
| Writing a frame log, a scene probe and five kinds of timing | | ✓ |
| Shipping nineteen releases | | ✓ |
| Asking "why can't you just read the code" | ✓ | |
| Handing over the DLL | ✓ | |
| Reading 3,424 decompiled files and Godot's renderer | | ✓ |
| Matching a 26.8 MB mystery to a collision map | | ✓ |
| Shipping a garbage collector setting that changed nothing | | ✓ |
| Rating a release "really really bad" | ✓ | |

## What's not done

- **Underdocks** needs its rematch on the tablet with release 19.
- **The Insatiable**, the act 2 boss, still runs at about 30 fps with 25 ms of GPU. Its background is the next one to open up.
- **One enemy move in five** still ends in a frame of about 50 ms of logic.
- **Low resolution** had 4–8 second freezes mid-fight in one session, with nothing in the log to explain them. The log now itemizes long gaps instead of assuming the app was in the background. Until that's understood, full resolution is the setting.
- **The forced `GC.Collect()`** after every room load costs 100–150 ms, hidden mostly by the fade. It's a candidate, not a priority.

## What I learned

### Split the frame before anything else

"It's slow" has at least three different answers: logic, drawing, or the GPU. The split told me which in seconds. Every release before it was a guess.

### Correlation finds where to look, the code says why

The logs correctly found which assets came before stutters, and which stutters had collections in them. Both first fixes built on those correlations were wrong: one held objects the game destroys, the other tuned a collector that was already tuned. Both real answers came from reading code, the game's once and Godot's once. The 26.8 MB number sat in every log until someone asked what it was.

### Ask for the source earlier

Ten releases of careful outside measurement got close. Ten minutes of reading the code got the answer. If you own the thing you're optimizing, give the agent the code before the fifth round of instrumentation, not after.

### Measure per area, not per session

A session at "mostly 50 fps" can still hide fifteen minutes at 18. Splitting the numbers by act is what put Underdocks on the list.

### Silent was right

No single big fix did this. It was a lot of small, precise ones: draw cards directly, skip one overlay, compile early, keep one cache, refresh less often, color text natively, stop rebuilding a collision map, still the water. A shiv deck, basically.

The code and the release notes are at [bhanuharya/sts-2-launcher-mobile](https://github.com/bhanuharya/sts-2-launcher-mobile). If you play on an Android tablet, update and tap **Recommended**. If you reach Underdocks, I'd like to hear whether the water still sinks you.
