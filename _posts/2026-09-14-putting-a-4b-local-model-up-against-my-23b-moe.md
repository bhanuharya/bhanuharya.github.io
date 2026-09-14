---
layout: post
title: "putting a 4b local model up against my 23b moe, twice"
date: 2026-09-14
author: bhanuharya
tags: [local-llm, llama.cpp, hardware, self-hosting, testing]
---

the local lane on the gpu box runs a 23b mixture of experts model, about 3b parameters active per token, quantised down to iq3_s so it fits on a 12 gb card. it writes well, it is fast enough, and it is unreliable in exactly the ways a 3.66 bit quant after pruning is unreliable.

so when a 4b model showed up as a fresh gguf, i wanted the obvious question answered: is the small dense model simply better? same box, same port, same prompts, one model at a time, two full runs.

short version: the 4b reads long documents about seven times faster and uses half the vram, and it is still not the better model. the 23b keeps the lane.

## the two candidates

the incumbent: 23b total, ~3b active, iq3_s mix at 3.66 bits per weight, 10.18 gb on disk, 131k context window, 22.9b parameters reported by the runtime. it uses 11,444 mib of the 12 gb card, so there is no room for a second model.

the challenger: 4.11b dense, 36 layers, gqa with 4 to 1 key value heads, 131k vocab, tied embeddings, hybrid attention with one full attention layer per three sliding window layers. shipped as q6_k, 3.37 gb. the card reports 6,425 mib with a 131k context loaded, which is the most attractive number in this whole post. the model nameplate claims 1m context. i treated that as marketing until a recall test said otherwise.

## how i tested

a small battery, run against each model on the same port so every client kept working:

- instruction precision: "reply with exactly: ok"
- two facts the 23b has fumbled before: whether ice cream contains cream cheese, and whether "icecream" is a valid spelling
- a refusal prone writing prompt, the sort of thing the lane exists for
- speed: a shallow prompt and an 80k token prompt, with a repeat to test the prompt cache
- planted fact recall at two depths

temperature 0 everywhere, same token caps, one model resident at a time. the box cannot hold both, 10.18 gb plus 3.37 gb over a 12 gb card, so each run was a stop, swap, start.

## the numbers

speed, 80k token prompt:

- challenger: 1,689 tok/s prefill, 48 seconds to first token, 37 tok/s generation
- incumbent: 224 tok/s prefill, 359 seconds to first token, 18 tok/s generation
- cached repeat of the same prompt: 0.6 seconds against 2.05
- shallow prompts: about 64 tok/s generation on both, a wash

memory: 6,425 mib against 11,444 mib.

recall: both models found a planted string at 41k and 96k tokens. no separation there.

facts, and this is where it stopped being a clean win:

- the 4b got the ice cream question right, the 23b waffled and conflated cream with cream cheese until it hit the token cap
- the 23b got the spelling question right, the 4b called "icecream" valid as a compound word
- both handled 17 times 23 and the exact "ok" instruction

one each. a wash, not a coronation.

## the catch: it thinks before it answers

the 4b is a thinking model. responses come back with the answer in one field and a separate reasoning stream in another, and the reasoning is not cheap. it spent 123 tokens of thinking to produce the word "ok". it spent 1,282 tokens to answer the spelling question.

that has a practical consequence. my writing probe came back with empty content at a 1,500 token cap, and still empty at 3,000, where it burned 12,249 characters of reasoning and never emitted an answer. pushed to 6,000 tokens it delivered properly: 14,951 characters of reasoning, then a 5,736 character tutorial, clean stop.

it was not refusing. it was deliberating past the budget, and a caller that caps tokens low gets silence instead of a shorter answer.

the other thing worth writing down: at temperature 0 the outputs were byte identical across both runs, same token counts, same reasoning lengths. that makes a rig like this a genuine regression check rather than a coin toss, which is more than i expected from a two run sample.

## what i am keeping

the 23b stays, and the reasons are boring ones. it answers directly with no reasoning tax, it carries the knowledge a 23b moe carries, and it is the known quantity for the writing i do with it. the 4b is not a better model, it is a faster reader, and at half the vram it is a genuinely useful one if i ever need to chew through long documents quickly.

both models are on disk but only one can be resident, so the swap scripts live next to the launcher and the whole exchange costs about ninety seconds.

two operational notes that cost me more than the benchmark did. first, a lane started from an ssh session dies the moment that session closes, it answers a health check, then the port goes dark, and you spend an hour blaming the model. the production lane survives because a scheduled task starts it. second, the lane is set to fail closed, so a request that cannot reach it errors instead of quietly going somewhere else. boring until it matters.

if the numbers hold on a third run i will leave the small model as a fast reader and stop trying to promote it :-)
