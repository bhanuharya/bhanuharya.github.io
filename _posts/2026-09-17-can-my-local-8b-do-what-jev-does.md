---
layout: post
title: "Can my local 8B do what Jev does"
date: 2026-09-17
author: bhanuharya
tags: [local-llm, evals, calibration, llama.cpp, email]
redirect_from: /blog/email-triage-local-8b-vs-hosted/
---

TypeSafe's Jev showed up in my feed twice in one day. Both demos used it to pick from a fixed set of answers, not to chat. [One](https://x.com/nutlope/status/2100426999546184123) sorted 1,018 research papers into 24 topics for eight cents, at a median 256 ms per paper. [The other](https://x.com/gregpr07/status/2100411066966749359) ran a flight search in seven seconds for $0.0039.

[Jev](https://docs.typesafe.ai/) doesn't return text. You give it a state, a question and the answers you'll accept. It returns the option it picked, a probability for every option, and a separate confidence score you're meant to threshold.

I wanted to know if a local 8B could do the same job. Partly for privacy, since for email triage the input is the email. Partly because a local model has no per-call cost and doesn't change under me. And partly because picking one of eight queues sounded like something an 8B should manage.

I tested it on synthetic email triage. The local model matched Jev on three of eight queues. The bigger problem was its confidence: it was just as sure of its wrong answers, so I couldn't use it to decide what to route automatically.

## The local setup

LFM2.5-8B-A1B, 8B parameters with about 1B active per token, quantised to Q4_K_M (4.9 GB). It runs under llama-server on the ThinkPad T14 that hosts my local lane, CPU only, started by hand when I need it:

```
./llama-server -m LFM2.5-8B-A1B-Q4_K_M.gguf \
  -c 65536 -t 8 -tb 8 -ngl 0 -fa on \
  --jinja --metrics -a lfm25-8b \
  -n 2048 --repeat-penalty 1.1 --repeat-last-n 256
```

Both sides get the same system prompt. A chat completion gives you none of the three things Jev returns, so most of the work was making the local model answer in the same shape:

```json
{
  "model": "lfm25-8b",
  "messages": ["<system prompt>", "<the email>", {"role": "assistant", "content": "{\"label\": \""}],
  "temperature": 0,
  "max_tokens": 8,
  "grammar": "root ::= (\"billing\" | \"security\" | ... | \"__none__\") \"\\\"}\"",
  "continue_final_message": true,
  "add_generation_prompt": false,
  "logprobs": true,
  "top_logprobs": 20,
  "cache_prompt": true
}
```

* **The pick.** The assistant turn is pre-filled with `{"label": "`, and the grammar lists the allowed queues, so the model can't answer anything else. With 8 tokens at temperature 0, a decision takes 4 output tokens. Without the grammar the same model used 454.
* **The probabilities.** llama-server has no per-option probability, so I rebuilt one from the top 20 token logprobs along the greedy path, then renormalised over the valid options. The renormalising is required: the server reports probabilities from before the grammar mask, so they don't sum to one. It's still an approximation. Exact scoring needs one forced call per option, and the completions endpoint returned zero prompt tokens for `echo` when I tried it.
* **The confidence.** There's nothing separate to return, so it's just the probability of the chosen option.

For comparison I also ran the model without the grammar or the prefill, with a 512-token cap, and pulled the label out of its answer.

## Lab 1: 94 emails

| setup | accuracy | ECE | latency p50 |
|---|---|---|---|
| Jev | 81.9% (77/94) | 0.091 | 739 ms |
| local 8B, with grammar | 63.8% (60/94) | 0.269 | 3,948 ms |
| local 8B, no grammar | 52.1% (49/94) | n/a | 21,850 ms |

My first conclusion was that the grammar added 11.7 points of accuracy. It didn't. Nine of the no-grammar answers had no label in them at all, and those nine account for 9.6 of the 11.7 points. On the answers it did give, it was 57.6% against 63.8%, six emails out of 94. That's noise.

The grammar bought parseable output and speed, 21.8 seconds per email down to 3.9. It didn't buy accuracy.

## The gate

To automate triage you pick a confidence threshold, route everything above it, and send the rest to a person. The number that matters is how many wrong answers get through.

| gate | Jev covers | Jev wrong, passed | local covers | local wrong, passed |
|---|---|---|---|---|
| 0.6 | 89.4% | 9 | 93.6% | 29 |
| 0.7 | 84.0% | 4 | 86.2% | 23 |
| 0.8 | 79.8% | 3 | 80.9% | 20 |
| 0.9 | 62.8% | 0 | 71.3% | 15 |

At 0.8, both handle about four fifths of the mailbox. Jev lets 3 wrong answers through out of 94. The local model lets 20 through. Its average confidence on the answers it got right was actually higher than Jev's, 0.964 against 0.941.

![Errors that pass a confidence gate](/assets/img/gate-errors-escaped.png)

*Wrong answers that clear the gate, lab 2. The local model covers the same share at every threshold because it has no answers below 90% confidence.*

## Lab 2: 205 emails

For lab 2 I changed three things, each aimed at a failure I'd seen in lab 1. Queue definitions were written as actions. The model picked from 25 plain descriptions, which code mapped onto the 8 queues. And the probabilities came from a full expansion over the token distribution, not just the greedy path. The set had 205 emails, 60 of them traps.

* Jev went from 84.4% to 85.9% with the descriptions. The local model got 65.4%, up from 63.8% on a harder set, so no real change.
* The local model got slower, 3.9 to 6.7 seconds per email, because the prompt grew.
* The descriptions made Jev worse on traps (43 of 60, down from 48) and raised its output tokens from 15,590 to 65,810.
* The local model's ECE got worse, 0.339.

I tried fixing the calibration with temperature scaling on held-out data. ECE stayed between 0.32 and 0.36. Looking at coverage shows why: it's 84.9% at 0.7, 0.8 and 0.9 alike. Every answer the local model gives a usable score for sits above 90% confidence, so there's nothing in the middle to rescale. Another 31 of the 205 answers produced no usable distribution at all.

![Stated confidence against observed accuracy](/assets/img/reliability.png)

*Confidence against accuracy, lab 2. The local model has no answers below 90% confidence.*

I don't think a prompt, a grammar or rescaling can fix a model that never reports doubt.

## Per queue

| true queue | Jev | local 8B |
|---|---|---|
| newsletter | 87% | 97% |
| security | 89% | 89% |
| meeting | 88% | 88% |
| no-fit | 94% | 81% |
| internal | 89% | 63% |
| billing | 80% | 57% |
| personal | 56% | 44% |
| complaint | 100% | 4% |

The local model keeps up on newsletter, security and meeting. Complaints are the disaster: 24 of the 205 emails, and it got 1 of them. That one queue is most of the 19-point gap.

So a split might work: the local model takes its three good queues and everything else goes to Jev or a person.

## Bugs in my own harness

I found and fixed ten bugs before or during the runs. Three of them would have given me confident, wrong conclusions:

* Three trap emails had their correct label pointing at the decoy queue. A phishing email was filed under `billing` in the answer key.
* The grammar's closing brace comes in the same token as the end of the label, so a finished answer never matched an option name, and correct answers were scored as no answer.
* The coverage metric dropped rows with no distribution, which turned 84.9% coverage into 100% in one file while the report's own table said 84.9%.

Four of the other seven:

* A typo in the grammar made every request return HTTP 400.
* A scorer read the token after the label instead of the label itself.
* A 64-token cap returned empty answers because the model was still thinking.
* The answer parser matched labels inside negations, so "the subject does not say newsletter" counted as a newsletter answer.

## What this doesn't show

* The emails are template-generated and 77 to 208 characters long. Real mail will score lower, so every accuracy here is a best case.
* It's one model, one quantisation, one CPU and one email set. It says nothing about small models in general.
* `jev-latest` changes over time, so the Jev numbers can't be reproduced against a fixed version.
* In lab 1 the local model beat Jev on traps, but there were only 14 traps. In lab 2, with 60, Jev won 48 to 31.
* The two demos at the top are self-reported, and neither reports accuracy.
* TypeSafe publishes no price for this, and their pricing page returns 404. The cost estimate below borrows the paper demo's rate.

## Cost isn't the question

At the paper demo's rate, Jev costs about eight cents per thousand emails. The local model is free per call but handled 909 emails an hour in lab 1 and 536 in lab 2, so 50,000 emails a month would take it 55 to 93 hours. At these volumes the money is small either way. What decides it is how many errors get through the gate.

## Next

* Two or three examples in the prompt for the queues it confuses: internal against meeting, personal against no-fit.
* Run each email twice with the options in a different order, and gate on whether the two runs agree, since the model's confidence is no use.
* A small fine-tuned classifier, which takes milliseconds per email on CPU and comes out of training calibrated.
* Pin one server slot so the shared system prompt is only processed once, and give the server all 12 threads. With four unpinned slots it's probably reprocessed on every call, which would explain why lab 2 got slower.

For now I'd test the local model as a prefilter on its three good queues, with everything else going to Jev or a person. I wouldn't let its confidence decide that split.
