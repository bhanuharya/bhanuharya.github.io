---
layout: post
title: "4B vs 23B on the 3060"
date: 2026-09-14
author: bhanuharya
tags: [local-llm, llama.cpp, hardware, self-hosting, testing]
---

The local lane on the GPU box runs a 23B mixture-of-experts model, about 3B parameters active per token, quantised down to IQ3_S so it fits on a 12 GB card. It writes well, it is fast enough, and it is unreliable in exactly the ways a 3.66-bit quant after pruning is unreliable.

So when a 4B model showed up as a fresh GGUF, I wanted the obvious question answered: is the small dense model simply better? Same box, same port, same prompts, one model at a time, two full runs.

Short version: the 4B reads long documents about seven times faster and uses half the VRAM, and it is still not the better model. The 23B keeps the lane.

## The box

One Windows 11 machine with a 12 GB card in it, and the card is the whole constraint:

- Intel i5-12400, 6 cores and 12 threads
- 32 GB of system RAM
- RTX 3060 with 12 GB of VRAM, running the CUDA build of llama.cpp
- no spare VRAM lying around: the 23B lane holds 11,444 MiB of the 12,288 available

That last number is why the two models take turns. There is not enough room for both, so every comparison in this post is a stop, swap, start, and the ninety seconds it costs counts as downtime for anything already pointed at the lane.

## The two candidates

The incumbent: GLM-4.7-Flash, a mixture of experts at 23B total and about 3B active per token, REAP-pruned into a community decensored build and quantised to IQ3_S mix at 3.66 bits per weight. 10.18 GB on disk, 131K context window, 22.9B parameters reported by the runtime. It uses 11,444 MiB of the 12 GB card, so there is no room for a second model.

The challenger: Spark-X2.5-4B from XHToken, 4.11B dense, 36 layers, GQA with 4-to-1 key/value heads, 131K vocab, tied embeddings, hybrid attention with one full attention layer per three sliding-window layers. Shipped as Q6_K, 3.37 GB, in an abliterated GGUF build.

The most widely linked abliteration of this base ships safetensors only, so the GGUF I ran is a separate abliteration of the same model. The card reports 6,425 MiB with a 131K context loaded, which is the most attractive number in this whole post. The model nameplate claims 1M context. I treated that as marketing until a recall test said otherwise.

## How I tested

A small battery, run against each model on the same port so every client kept working:

- instruction precision: "reply with exactly: ok"
- two facts the 23B has fumbled before: whether ice cream contains cream cheese, and whether "icecream" is a valid spelling
- a refusal-prone writing prompt, the sort of thing the lane exists for
- speed: a shallow prompt and an 80K token prompt, with a repeat to test the prompt cache
- planted fact recall at two depths

Temperature 0 everywhere, same token caps, one model resident at a time. The box cannot hold both, 10.18 GB plus 3.37 GB over a 12 GB card, so each run was a stop, swap, start.

## The numbers

Speed, 80K token prompt:

- challenger: 1,689 tok/s prefill, 48 seconds to first token, 37 tok/s generation
- incumbent: 224 tok/s prefill, 359 seconds to first token, 18 tok/s generation
- cached repeat of the same prompt: 0.6 seconds against 2.05
- shallow prompts: about 64 tok/s generation on both, a wash

Memory: 6,425 MiB against 11,444 MiB.

Recall: both models found a planted string at 41K and 96K tokens. No separation there.

Facts, and this is where it stopped being a clean win:

- the 4B got the ice cream question right, the 23B waffled and conflated cream with cream cheese until it hit the token cap
- the 23B got the spelling question right, the 4B called "icecream" valid as a compound word
- both handled 17 times 23 and the exact "ok" instruction

One each. A wash, not a coronation.

## The catch: it thinks before it answers

The 4B is a thinking model. Responses come back with the answer in one field and a separate reasoning stream in another, and the reasoning is not cheap. It spent 123 tokens of thinking to produce the word "ok". It spent 1,282 tokens to answer the spelling question.

That has a practical consequence. My writing probe came back with empty content at a 1,500 token cap, and still empty at 3,000, where it burned 12,249 characters of reasoning and never emitted an answer. Pushed to 6,000 tokens it delivered properly: 14,951 characters of reasoning, then a 5,736 character tutorial, clean stop.

It was not refusing. It was deliberating past the budget, and a caller that caps tokens low gets silence instead of a shorter answer.

The other thing worth writing down: at temperature 0 the outputs were byte-identical across both runs, same token counts, same reasoning lengths. That makes a rig like this a genuine regression check rather than a coin toss, which is more than I expected from a two-run sample.

## What I am keeping

The 23B stays, and the reasons are boring ones. It answers directly with no reasoning tax, it carries the knowledge a 23B MoE carries, and it is the known quantity for the writing I do with it. The 4B is not a better model, it is a faster reader, and at half the VRAM it is a genuinely useful one if I ever need to chew through long documents quickly.

Both models are on disk but only one can be resident, so the swap scripts live next to the launcher and the whole exchange costs about ninety seconds.

Two operational notes that cost me more than the benchmark did. First, a lane started from an SSH session dies the moment that session closes, it answers a health check, then the port goes dark, and you spend an hour blaming the model. The production lane survives because a scheduled task starts it. Second, the lane is set to fail closed, so a request that cannot reach it errors instead of quietly going somewhere else. Boring until it matters.

If the numbers hold on a third run I will leave the small model as a fast reader and stop trying to promote it :-)
