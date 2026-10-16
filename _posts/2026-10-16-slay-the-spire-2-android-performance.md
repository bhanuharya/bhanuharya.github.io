---
layout: post
title: "Ten releases of measuring Slay the Spire 2, then I sent the DLL"
date: 2026-10-16
author: bhanuharya
tags: [android, godot, dotnet, performance, ai-agents]
---

Last time, my copy of Slay the Spire 2 ended up running on an iPhone and running *better* on my Android tablet. "Better" was carrying a lot of weight in that sentence. Fights were fine until the hand filled up, and I play Silent, whose whole plan is filling the hand. Big shiv turns crawled.

So I gave Claude Code one goal: make the game good on my tablet, especially with a lot of cards on screen. Ten releases later, here's what happened. Most of it went well. Some of it was ten releases because nobody could see the game's code, and I should have fixed that much sooner.

The usual disclaimer applies. I typed. Claude measured, wrote and shipped. I played a lot of Silent and sent log files.

## The setup

| | |
|---|---|
| Tablet | Xiaomi Pad 5: Snapdragon 860, Adreno 640 GPU, 2560×1600 at 120 Hz |
| Game | Slay the Spire 2: Godot 4.5, game code in C# |
| Runtime on Android | .NET's Mono runtime, with a JIT |
| Build | [StS2 Launcher Perf](https://github.com/bhanuharya/sts-2-launcher-mobile): upstream's Android launcher plus a performance add-on |

Everything below lives in that add-on. It changes the running game with Harmony patches and settings in the Perf settings panel. Every setting is off by default.

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

**Card rendering → Fast** draws the cards straight to the screen instead. The ripple effect goes, and you'd have to look for it to notice. The fight's GPU time went from about 25 ms to 14–15 ms, and the median frame from 30 fps to 60.

Two smaller fixes came from the same probe:

- **Card trails → Off.** At the end of each turn, discarded cards fly to the pile with a trail, and frames ran at about 90 ms for 2–3 seconds. That's gone.
- **Idle transition layer → Skip.** The full-screen fade layer was drawn even while invisible: 2.2 ms per frame for nothing. The first version also hid the real fade between rooms, so the rest site flashed for a second before a fight. I reported that as "weird thing it load the previous when it should be battle". Fixed the next release.

## The JIT tax

On Android the game's C# runs on Mono's JIT, so every method gets compiled the first time it runs. The first Blade Dance of the session, the first of a new enemy, the first of a new screen: each compiles on the spot and stalls a frame.

The fix is **JIT warm-up**. The add-on records every game method compiled during a session, and next launch it compiles them all at the main menu, 6 ms per frame so the menu keeps drawing. The first attempt compiled the whole game at once, and that crashed natively. Compiling only what earlier sessions actually used worked. Methods compiled during play dropped from 4,166 a minute to 284.

## Ideas that didn't pan out

| Idea | What happened |
|---|---|
| A GC latency setting, from an earlier try with another AI model | Mono doesn't support .NET's GC latency modes. Setting one throws an exception, so the setting did nothing |
| Rendering at low resolution (from the first post) | Softer and barely faster: Android's own Game Mode downscale was cheaper |
| A "CPU breakdown" to find which game script slows shiv turns | Every per-frame script together cost 0.2–0.6 ms a frame. The scripts weren't it |
| Holding on to assets the game kept reloading | Couldn't work, for reasons in the next section |

Still, with the GPU fixes and the warm-up, fights at full resolution went from 15–30 fps to 45–58, mostly 60. Then the logs stopped pointing anywhere useful.

## Ten releases of guessing

Three problems stayed:

1. **The same assets loading over and over.** In one 80-minute run, the game logged "Asset not cached" 482 times for the same few files, and most of those loads came right before a stutter:

   | Asset | Loads | Followed by a stutter |
   |---|---|---|
   | Card tooltip | 67 | 51 (59 ms median) |
   | Silent's energy icon | 59 | 30 (71 ms) |
   | A boss's map icon | 10 | 8 (209 ms) |

2. **One act costing twice as much.** Fights in Underdocks took 21 ms of GPU even at low resolution, against about 11 ms in the other acts.

3. **Enemy turns.** I told Claude "i notice when enemy making move fps drop". The split showed 45–85 ms of logic on those frames, with the GPU at a relaxed 12 ms. Creating the hit effects took 4–7 ms of that. The game's scripts took almost nothing. So something else in the game's code was spending 40–80 ms, and none of the instruments could see what.

Each release added another instrument: load timing, scene creation timing, per-frame script timing, async timing. Each log narrowed it down a little. After the fourth or fifth round I asked what I should have asked at the start:

> why we keep repeating, why can't you identify from the code what we can tune

The answer was simple: Claude didn't have the code. The game's files live on my tablet and, for the iOS build, on GitHub's build machines, downloaded with my Steam login. I'd kept them away from Claude's workspace on purpose, since the repo is public. So Claude had been profiling a black box from the outside, one release at a time.

I own the game. I sent Claude `sts2.dll` from my own install. It decompiled it privately into 3,424 source files, which never went near the repo, and read the parts the logs had been circling.

## What the code said

It took about ten minutes, less than one release cycle.

**The repeated loads were on purpose.** The game preloads a list of assets for each room. Anything else a room needs is loaded on the spot and marked "missed". At every room change, the game unloads and destroys every missed asset. So the tooltip, the energy icon and the power icons load again in every single room, by design.

It also explained why the earlier fix had failed. Claude had made the add-on hold on to assets that kept getting reloaded, so they'd stay in memory. But the game destroys the very objects being held. Claude had measured the correlation correctly and then guessed the cause wrong. The real fix is one line: **Keep loaded assets** turns the unload method into a no-op, so each missed asset loads once per session.

**Enemy turns rebuilt the whole combat UI, over and over.** Every change in a fight asks for a UI refresh on the next frame: HP, block, a power ticking down, energy, a card moving. The refresh rebuilds:

- every card in your hand, re-formatting its description with damage previews worked out through every power and relic, and, when the text changed, re-measuring it at several font sizes until it fits;
- every intent;
- every creature's health display;
- the energy counter and the end-turn button.

During an enemy's move something changes on almost every frame, so this runs frame after frame. That's the 45–85 ms.

All ten things listening for that refresh are UI, and none of the game's rules depend on it. So **Combat UI refresh → 10 per second** keeps the game's own refresh code exactly as it is and only changes how often it runs. A single change still shows on the next frame. A burst of changes folds into one refresh every 100 ms. Card and intent numbers can lag by up to a tenth of a second, which I don't expect to notice.

Both fixes are on the **Recommended** button in the Perf settings panel, together with the visual ones.

### Does this need my DLL on everyone's phone?

No. The DLL was for reading the game's code. The app ships only the add-on, which finds those methods by name and patches them in each player's own copy of the game, downloaded from their own Steam account. Everyone on the same game version gets the same code, so the same fixes apply. If an update renames something, the add-on logs it and leaves that part to the game instead of crashing.

## Division of labour, part 2

| Task | Me | Claude |
|---|---|---|
| Playing 80-minute Silent runs and uploading logs | ✓ | |
| Noticing enemy turns felt bad | ✓ | |
| Writing a frame log, a scene probe and four kinds of timing | | ✓ |
| Shipping ten releases in two days | | ✓ |
| Asking "why can't you just read the code" | ✓ | |
| Handing over the DLL | ✓ | |
| Reading 3,424 decompiled files to find two methods | | ✓ |
| Writing a fix that holds objects the game destroys | | ✓ |

## What's not done

- **The code fixes haven't been measured on the tablet yet.** They're released, and the next log decides whether they work. I'll update this post with the numbers.
- **One enemy is still slow.** While the Slumbering Beetle sleeps, the whole fight runs at 17–20 fps and recovers the moment it wakes up. The code shows its sleep effect is only particles, so that isn't the whole story yet.
- **Underdocks** still costs twice the GPU of the other acts. The next step is reading its background scenes, which live in the game's other big file.
- **Shiv turns** are still bound by the CPU. They may well be the same UI refresh, many times over. The next log should show it.

## What I learned

### Split the frame before anything else

"It's slow" has at least three different answers: logic, drawing, or the GPU. The split told me which in seconds. Every release before it was a guess.

### Correlation found the problem, the code found the cause

The logs correctly found which assets came right before stutters. The first fix based on that was still wrong, because the cause was a design choice that only showed up in the code.

### Ask for the source earlier

Ten releases of careful outside measurement got close. Ten minutes of reading the code got the answer. If you own the thing you're optimizing, give the agent the code before the fifth round of instrumentation, not after.

### Silent was right

No single big fix did this. It was a lot of small, precise ones: draw cards directly, skip one overlay, compile early, keep one cache, refresh less often. A shiv deck, basically. Now it needs to survive its own shiv turns.

The code and the release notes are at [bhanuharya/sts-2-launcher-mobile](https://github.com/bhanuharya/sts-2-launcher-mobile). If you play on an Android tablet, update, tap **Recommended**, and tell me if your enemy turns feel better. Mine are next. Now if you'll excuse me, I have a beetle to wake up.
