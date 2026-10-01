---
layout: post
title: "4B vs 23B on the 3060"
date: 2026-09-14
author: bhanuharya
tags: [local-llm, llama.cpp, hardware, self-hosting, testing]
---

My GPU box runs GLM-4.7-Flash as its local model. It's a 23B mixture of experts with about 3B active per token, pruned and quantised to fit on a 12 GB RTX 3060. It writes well. The pruning and quantisation also make it unreliable on some facts.

Then a 4B model came out as a GGUF, and I wondered if smaller might be better. I ran both on the same machine with the same prompts. The 4B read long prompts about seven times faster and used about half the VRAM. I kept the 23B anyway.

## The box

* Intel i5-12400, 6 cores and 12 threads
* 32 GB of RAM
* RTX 3060 with 12 GB of VRAM, running the CUDA build of llama.cpp on Windows 11

The 23B takes 11,444 MiB of the card's 12,288, so the two models can't be loaded together. Every comparison meant stopping one and starting the other, about ninety seconds each time. Both ran on the same port so my other clients kept working.

## The two models

**GLM-4.7-Flash**, the one I already run: 22.9B parameters, REAP-pruned, a community decensored build, quantised to IQ3_S mix at 3.66 bits per weight. 10.18 GB on disk, 131K context.

**Spark-X2.5-4B** from XHToken: 4.11B dense, 36 layers, one full attention layer for every three sliding-window ones. Q6_K, 3.37 GB. The most widely linked abliterated version only ships safetensors, so I ran a different abliteration of the same base that comes as a GGUF. With 131K context loaded it uses 6,425 MiB. The model card claims 1M context. I only tested recall up to 96K.

## The tests

Temperature 0, same token caps for both:

* "reply with exactly: ok"
* two questions the 23B has gotten wrong before: does ice cream contain cream cheese, and is "icecream" a valid spelling
* a writing prompt of the kind that often gets refused, which is what I mostly use this model for
* speed on a short prompt and an 80K-token prompt, then the long prompt again to hit the cache
* a planted string to find at 41K and 96K tokens

## Results

| | 4B | 23B |
|---|---|---|
| prefill, 80K prompt | 1,689 tok/s | 224 tok/s |
| time to first token, 80K prompt | 48 s | 359 s |
| generation, 80K prompt | 37 tok/s | 18 tok/s |
| cached repeat | 0.6 s | 2.05 s |
| VRAM | 6,425 MiB | 11,444 MiB |

On short prompts both generated about 64 tok/s. Both found the planted string at both depths. Both replied with exactly "ok" and got 17 × 23 right.

The two facts went one each. The 4B got the ice cream question right. The 23B kept mixing up cream and cream cheese until it ran into the token cap. On the spelling question it was the other way round: the 23B got it right, and the 4B decided "icecream" was a valid compound word.

## The 4B thinks before it answers

It's a reasoning model. The answer comes back in one field and its reasoning in another. It spent 123 tokens of reasoning to say "ok", and 1,282 on the spelling question.

The writing prompt came back empty at a 1,500-token cap. It was still empty at 3,000, after 12,249 characters of reasoning. At 6,000 it finished: 14,951 characters of reasoning, then a 5,736-character answer. It never refused. It just hadn't finished thinking, so a client with a low token cap gets an empty response, not a shorter one.

At temperature 0 both runs were byte-identical, with the same token counts and the same reasoning lengths. Two runs is a small sample, but it means this setup can work as a regression check.

## Why I kept the 23B

It answers directly without spending tokens on reasoning, it knows more, and I know how it behaves on the writing I use it for. The 4B's one real advantage is reading long prompts fast. It's on disk, and the swap scripts sit next to the launcher if I need to get through long documents quickly.

## What actually cost me time

Not the benchmark. A model server started from an SSH session dies when that session closes. It passed a health check, then the port went dark, and I spent an hour blaming the model. The lane I actually use is started by a scheduled task, which is why it survives.

It's also set to fail closed: if the lane is down, requests error out instead of quietly going somewhere else.

If the numbers hold on a third run, I'll keep the 4B as a fast reader and stop trying to promote it :-)
