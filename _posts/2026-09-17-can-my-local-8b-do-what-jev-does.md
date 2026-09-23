---
layout: post
title: "Can my local 8B do what Jev does"
date: 2026-09-17
author: bhanuharya
tags: [local-llm, evals, calibration, llama.cpp, email]
redirect_from: /blog/email-triage-local-8b-vs-hosted/
---

TypeSafe's Jev kept landing in my feed, twice in one day. Both posts showed bounded choices rather than free-form chat. [One](https://x.com/nutlope/status/2100426999546184123) classified 1,018 research papers into 24 topics for eight cents, at a median 256 ms per paper; [another](https://x.com/gregpr07/status/2100411066966749359) ran a flight search in seven seconds for $0.0039.

I wanted to try the same shape on my local machine. I used synthetic email triage and compared Jev with an 8B local model. The local model matched Jev on three of eight queues. More importantly, its confidence was not useful for deciding which answers to route automatically.

## What Jev is

[TypeSafe](https://docs.typesafe.ai/) sells small units of AI as programming primitives, and Jev is the first of its System One models. There is no text for you to parse. It takes a state, a question and the answers you will accept, and returns a typed judgment: for the Choice primitive, the option it picked, a probability for every option offered, and a confidence. The answer cannot be a queue that does not exist.

Choice sits next to Noul for yes or no and Score for how far along a dimension something sits, and all three come back as values.

The difference from an LLM is the training target. A general model produces a plausible continuation, so structure is something you ask for politely and verify afterwards. Jev is pointed at the judgment: choose among these options and say how sure you are. Code owns the loop, the model owns one bounded decision.

Three properties follow:

- the answer set is closed by construction, so a wrong answer is checkable without a parser
- every option carries a probability, so the whole distribution is visible
- confidence is separate from the top probability and exists to be thresholded, which is what makes gating the design

## Why bother imitating it locally

- **Data.** A hosted call sends the state off the host, and for a mail router that state is the mail.
- **Money.** Both opening demos lead with per-item cost, and per-call pricing is what a local lane removes. The lane already runs for other work, so the experiment costs a day.
- **Control.** `jev-latest` floats, a hosted route can rate limit, and it can change under you. A file on disk cannot.

The fourth reason is less rational. When a decision is only a choice among options code has already enumerated, it looks like something an 8B ought to manage. That intuition is what the experiment tests.

## Two setups, one pattern

One setup is Jev, hosted. The other is LFM2.5-8B-A1B at Q4_K_M under llama-server on the ThinkPad T14 Gen 1 that serves my local lane, CPU only, 8 of its 12 threads and 4 slots given to the server.

Both setups run the same pattern, which is the part worth copying. Code enumerates the candidate queues, the model picks inside that set, code validates the pick against what it offered, and it gates on confidence before anything routes. Neither side is asked to write a label in prose and then trusted to have done it.

Two labs, each with the corpus frozen alongside the run. Lab 1 used a queue-level prompt over 94 sampled emails each, lab 2 a semantic option space over 205 items, and lab 2 is the one worth quoting.

## Making the local model answer like Jev

Jev returns three things per decision, and a chat completion returns none of them, which is most of the setup. The system prompt is identical on both sides, so this is a decoding and code problem.

LFM2.5-8B-A1B is sparse, 8B total with about 1B active per token, quantised to Q4_K_M at 4.9 GB, and served by one manual llama-server process on the ThinkPad: no service unit, bound to loopback, started by hand when I want it.

```
./llama-server -m LFM2.5-8B-A1B-Q4_K_M.gguf \
  -c 65536 -t 8 -tb 8 -ngl 0 -fa on \
  --jinja --metrics -a lfm25-8b \
  -n 2048 --repeat-penalty 1.1 --repeat-last-n 256
```

8 threads for generation and 8 for batching on a 12 thread host, `-ngl 0` so every layer stays on the CPU, flash attention on, `--jinja` so the model's own chat template is used. Four slots and no slot pinning, so the shared system prompt is believed to be re-prefilled on every call, which explains the 70% latency jump when the lab 2 prompt grew.

**The choice.** The option set is enumerated in code, closed by a grammar, and the model only ever continues a prefix:

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

The assistant turn is pre-filled with `{"label": "`, so the structure is handed to the model, and `continue_final_message` keeps that prefill a partial turn. The grammar comes from the taxonomy, so an answer outside the set is not discouraged, it is unreachable. 8 tokens at temperature 0 leaves no room to think or argue, which is why the model that needs 454 output tokens unconstrained needs 4 here.

Lab 2 moves the trick one level up: the model chooses among 25 natural descriptions and code maps the winner onto one of the 8 queues, so it reasons in words it already uses while the deployer's queue names stay a code concern. The grammar enumerates the descriptions, a dictionary lookup does the mapping.

**The distribution.** Jev hands back a probability for every option offered. Locally there is no such field, so it gets rebuilt from the token log probabilities: take the greedy token as the trunk, read the top 20 alternatives at each step, keep only the prefixes that can still become a valid option, accumulate the ones that finish, and renormalise across options, which in lab 2 also means folding the 25 descriptions back into the 8 queues.

Renormalising is not optional. The probabilities the server reports are raw, computed before the grammar mask, so reading `top_logprobs` straight gives a distribution that does not sum to one. The expansion is approximate too: alternatives are only reported along the greedy path, so a branch abandoned at the first token is scored against a prefix it never had.

Exact scoring means one call per option and needs teacher forcing, and the completions endpoint returned zero prompt tokens for `echo` when I tested it.

**The confidence.** Jev's confidence is separate from the top probability, so you can gate on one number and inspect the other. Locally there is nothing to return but the renormalised probability of the chosen option, so the two fields collapse into one.

The unconstrained control run drops the grammar and the prefix: same weights, same system prompt, `max_tokens` 512, and the label read back with a whole-word match where the last mention wins. That rule exists because the model writes sentences like "the subject does not say newsletter", and a naive match scores that as an answer.

So the configuration buys the shape and not the property. The pick is always legal and the gate always has a number to threshold. Whether that number is worth thresholding is the rest of this post.

## Lab 1: the grammar buys less than it looks like it does

Three setups over the same 94 item ids:

| setup | accuracy | ECE | latency p50 |
|---|---|---|---|
| Jev, bounded choice | 81.9% (77/94) | 0.091 | 739 ms |
| local 8B, grammar constrained | 63.8% (60/94) | 0.269 | 3,948 ms |
| local 8B, unconstrained | 52.1% (49/94) | n/a | 21,850 ms |

Constrained decoding beat the unconstrained run by 11.7 points, which was my first version of the finding. Then the correction: nine of the unconstrained run's answers contained no label at all, and those nine account for 9.6 of the 11.7 points. On the answers it actually produced it scored 57.6% against 63.8%, six items in 94, which is noise.

The grammar bought machine-readable output and speed, 454 output tokens per decision down to 4 and 21.8 seconds down to 3.9. On accuracy it changed nothing.

## The gate is the real result

Accuracy cannot automate anything on its own. Automation is a threshold on confidence, and what matters is how many wrong answers get past it.

Jev, the hosted model, over 94 items:

| confidence gate | mailbox covered | accuracy inside | wrong answers passed |
|---|---|---|---|
| 0.6 | 89.4% | 89.3% | 9 |
| 0.7 | 84.0% | 94.9% | 4 |
| 0.8 | 79.8% | 96.0% | 3 |
| 0.9 | 62.8% | 100% | 0 |

The local model over the same 94 items:

| confidence gate | mailbox covered | accuracy inside | wrong answers passed |
|---|---|---|---|
| 0.6 | 93.6% | 67.0% | 29 |
| 0.7 | 86.2% | 71.6% | 23 |
| 0.8 | 80.9% | 73.7% | 20 |
| 0.9 | 71.3% | 77.6% | 15 |

At a 0.8 gate the hosted model runs four fifths of the mailbox with three wrong routings out of 94. The local model does the same volume with twenty. That ratio, wrong answers passed per unit of automation, is the property worth paying for.

ECE says the same thing from another angle, 0.091 against 0.269, and the local model is more confident when it is right, 0.964 against 0.941. Confident when right and equally confident when wrong is what makes a gate dangerous.

![Errors that pass a confidence gate](/assets/img/gate-errors-escaped.png)

*Wrong answers that clear the gate, lab 2. The local model covers the same volume at every threshold because it has nothing below 90% confidence.*

## Lab 2: three changes, two of them worse

Lab 2 changed three things, each aimed at a failure I had already measured: queue definitions written as actions, a space of 25 natural descriptions mapped onto the 8 queues in code, and a full expansion over the raw token distribution, going past the greedy path. 205 items, 60 traps.

- Jev on the queue-level prompt: 84.4%. Jev on the semantic space: 85.9%. Local on the semantic space: 65.4%.
- The local model went from 63.8% to 65.4% across a corpus that got harder, so flat in practice, and 71% slower per decision, 3.9 seconds to 6.7, because the prompt grew.
- The semantic space made Jev's traps worse, 43 of 60 against 48 of 60, and cost it 65,810 output tokens against 15,590.
- Calibration got worse, ECE 0.339 for the local model.

Two negative results. Vocabulary the model actually uses did not buy accuracy, and it more than quadrupled Jev's output tokens for a point and a half on 205 items.

## The local model cannot be recalibrated

ECE 0.339 raw, and fitting a temperature on held-out data left it in the 0.32 to 0.36 band, which is to say it did nothing. The reason is in the coverage: gate coverage is identical at 0.7, 0.8 and 0.9, 84.9% at every threshold. Every answer the model is willing to gate arrives at high confidence, so nothing ever occupies the uncertain band for a temperature to rescale.

31 of its 205 answers produced no usable distribution either, and those rows cannot be presented to a gate at all.

![Stated confidence against observed accuracy](/assets/img/reliability.png)

*Confidence bins against accuracy, lab 2. The local model has no answers below 90% confidence, and none of the low bins have a local bar.*

Anyone planning a local seat should take this much from it. A model that never reports doubt cannot be repaired by prompting, by a grammar, or by rescaling its outputs. Calibration is a property of training.

## Where it does work, per queue

![Per-queue recall, lab 2](/assets/img/recall-by-queue.png)

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

The local model is level on newsletter, security and meeting, loses everywhere else, and one collapse does most of the damage. `complaint` is 24 of the 205 items and the local model gets 1 of them, so that queue alone accounts for most of the 19 point aggregate gap.

The defensible statement is not that a small model cannot do this. It is that this small model can do three of eight queues, and one aggregate number hid it. A two-tier design falls out of the table: let the local lane take the queues where it is level, escalate the rest, and report the removed volume against the accuracy cost.

## The instrument, because it is the part I trust most

Ten defects were found and fixed before or during measurement, three of which would have produced confident wrong conclusions:

- Three trap items had their gold label pointing at the decoy queue, so a phishing email was filed under `billing` in the ground truth and every run would have been scored wrong against it.
- The grammar's closing brace rides on the final token, so a completed option never equalled an option name and a correct answer was scored as no answer.
- The gate coverage metric dropped rows with no distribution, turning 84.9% coverage into 100% in one file while the report's own table said 84.9%.

The rest are ordinary. A malformed grammar literal made the constrained run return HTTP 400 on every item. A scorer read the token after the label and ignored the label's own. A 64 token cap returned empty answers because the model was still thinking. An answer parser matched labels inside negations, so "the subject does not say newsletter" scored as a newsletter answer.

Two corrections were to my own claims, in the open: the size of the constraint's benefit and the coverage denominator.

One measurement did not get patched. Exact per-option scoring needs teacher forcing, so every local confidence number here stays an approximation over the greedy path and its top-20 alternatives.

## What these numbers do not say

- The corpus is template generated and the bodies run 77 to 208 characters, so real mail will score lower and every accuracy here is an upper bound.
- One model, one quantisation, one CPU lane, one corpus. Nothing here generalises to small models as a class.
- `jev-latest` floats, so the hosted numbers cannot be reproduced against a pinned version.
- Lab 1's trap sample was 14 items, and its "local beats hosted on traps" reading did not survive lab 2, where Jev won 48 of 60 against 31.
- The description of Jev comes from TypeSafe's own documentation. Everything measured here is the behaviour of the API they serve.
- The two posts in the opening are demos, self-reported by people adjacent to the vendors. Neither reports accuracy on its own task.
- The $0.0786 per 1,000 emails figure is the paper classifier's number applied to my token counts. TypeSafe publishes no rate card for this, and the pricing page returns 404.

## Next, cheapest first

- Two or three few-shot examples for the confusable queues, `internal` against `meeting` and `personal` against no-fit.
- Agreement between two runs with the option order permuted, used as the gate, since the model's own confidence is not.
- A fine-tuned encoder classifier, milliseconds per item on CPU, with its calibration coming from training.
- The CPU economics: pin one slot so the shared system prompt is prefilled once, and give the server all 12 threads.

Cost was never going to decide this. The hosted model is about eight cents per thousand emails on the paper classifier's anchor, and the local lane is free per call but runs 909 items an hour in lab 1 and 536 in lab 2, so 50,000 emails a month is 55 to 93 hours of lane time. At triage volumes the money is small on both sides, and the gate is the question.

The run behind it: 158 tool calls, 1,286,819 input tokens, 428,852 output, and 41,917,952 cache reads, which are context reprocessed on the way in. Cost is recorded as zero because the route is unpriced in the usage table. Nothing here was free.

I would test the queues where the local model held up as a prefilter, with the others sent to Jev or a person. I would not let its confidence decide that split yet.
