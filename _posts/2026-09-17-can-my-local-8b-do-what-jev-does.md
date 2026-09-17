---
layout: post
title: "Can my local 8B do what Jev does"
date: 2026-09-17
author: bhanuharya
tags: [local-llm, evals, calibration, llama.cpp, email]
redirect_from: /blog/email-triage-local-8b-vs-hosted/
---

TypeSafe's Jev is new, and it landed in my feed twice in one day. [Hassan El Mghari](https://x.com/nutlope/status/2100426999546184123) used it to classify 1,018 AI research papers into 24 topics for eight cents, at a median 256 ms per paper. A [browser demo](https://x.com/gregpr07/status/2100411066966749359) from the Browser Use founder had it driving a real flight search in seven seconds for $0.0039. Different tasks, one primitive underneath: code enumerates the answers, the model picks one, and what comes back is the pick, a probability for every option that was offered, and a confidence you can threshold.

Both of those are hosted. So the question I wanted answered was not whether Jev works. It was whether my local lane could produce the same shape on a task of mine, with an accuracy cost I could live with, and whether anything it returned would be safe to gate.

Mail triage is the task. In a security team that question is a compliance question before it is a cost question, because a router that reads mail sends the mail somewhere.

So I ran it as an experiment with a frozen protocol instead of a vibe check: sort synthetic email into queues, one arm on Jev, one on the local lane, and gate every answer on confidence the way a router that runs unattended would have to.

The short version. The local model is level with the hosted one on three of eight queues and nowhere near it on the rest. The number that decides whether either of them can run unattended is not accuracy, it is how many wrong answers walk through the confidence gate. And the local arm cannot be rescued by plumbing, because it never reports doubt in the first place.

## The pattern and the two arms

The hosted arm is Jev, over the same task. The local arm is LFM2.5-8B-A1B at Q4_K_M under llama-server on the ThinkPad T14 Gen 1 that serves my local lane, CPU only with no GPU offload, 8 of its 12 threads and 4 slots given to the server.

Both arms run the same pattern, and that part is worth copying. The code enumerates the candidate queues, the model picks inside that set, the code validates the pick against the set it offered, and it gates on confidence before anything gets routed. No arm is asked to write a label in prose and then trusted to have done it.

Two labs, each with the corpus frozen alongside the run. Lab 1 used a queue-level prompt over 94 sampled emails per arm. Lab 2 used a semantic option space over 205 items, and it is the one worth quoting.

## Making the local model answer like Jev

Jev returns three things per decision: the one option it chose out of the set you offered, a probability for every option you offered, and a confidence. A chat completion returns none of them, so getting those three things out of a local 8B is most of what the setup is. The system prompt is the same text on both sides, which means everything below is decoding and code rather than prompt wording.

The lane first. LFM2.5-8B-A1B is sparse, 8B total with about 1B active per token, quantised to Q4_K_M at 4.9 GB on disk, and served by one llama-server process on the ThinkPad. The lane is manual: no service unit, nothing pointed at it by default, started by hand when I want it, and bound to loopback.

```
./llama-server -m LFM2.5-8B-A1B-Q4_K_M.gguf \
  -c 65536 -t 8 -tb 8 -ngl 0 -fa on \
  --jinja --metrics -a lfm25-8b \
  -n 2048 --repeat-penalty 1.1 --repeat-last-n 256
```

Reading the flags: 8 threads for generation and 8 for batching on a 12 thread host, `-ngl 0` so every layer stays on the CPU, flash attention on, `--jinja` so the model's own chat template is used rather than one I hand rolled, and a loopback bind so the lane is not reachable off the machine. The run notes record four slots and no slot pinning, which is why the shared system prompt is believed to be re-prefilled on every call. That is a lane problem, not a model problem, and it is the reason the longer lab 2 prompt cost 70% more latency.

**The choice.** The option set is enumerated in code, closed by a grammar, and the model is only ever asked to continue a prefix:

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

The assistant turn is pre-filled with `{"label": "`, so the model continues a structure instead of inventing one, and `continue_final_message` with `add_generation_prompt` false is what makes the prefill count as a partial turn rather than a finished one. The grammar is generated from the taxonomy, so an answer outside the set is not discouraged, it is unreachable. And 8 tokens at temperature 0 leaves no room to think or argue, which is why the arm that needs 454 output tokens with no constraint needs 4 here.

Lab 2 puts the same trick one level up. The model chooses among 25 natural descriptions and code maps the winner onto one of the 8 queues, so it reasons in words it already uses rather than in a taxonomy I invented, and the deployer's queue names stay a code concern. The grammar enumerates the descriptions, and a dictionary lookup does the mapping.

**The distribution.** Jev hands back a probability for every offered option. There is no such field locally, so it gets rebuilt from the token log probabilities: take the greedy token as the trunk, read the top 20 alternatives at each step, keep only the prefixes that can still become a valid option, accumulate the ones that finish as options, and renormalise across options. In lab 2 a second folding step adds the 25 descriptions back into the 8 queues.

Renormalising is not optional. The probabilities the server reports are raw, computed before the grammar mask is applied, so reading `top_logprobs` straight gives a distribution that does not sum to one and does not correspond to what the model was allowed to say. The expansion is also an approximation: alternatives are only reported along the greedy path, so a branch abandoned at the first token never gets re-expanded, and what is reported against it is conditioned on a prefix it did not have. The exact method is one call per option, reading each option's own logprob, and that needs teacher forcing, which this build does not offer. The completions endpoint with `echo` and `logprobs` returned zero prompt tokens when I tested it directly.

**The confidence.** Jev returns a confidence as a value separate from the top probability, which is what lets you gate on one number and still inspect the other. Locally there is nothing to return but the renormalised probability of the chosen option, so the local arm's confidence is its top probability and the two fields collapse into one.

The unconstrained control arm drops the grammar and the prefix. Same weights, same system prompt, `max_tokens` 512, and the label is read back out of the text with a whole-word match where the last mention wins. That last rule exists because the model writes sentences like "the subject does not say newsletter", and a naive match scores that as an answer.

So the configuration buys the shape and not the property. The pick is always legal, the distribution always sums to one, and the gate always has a number to threshold. Whether that number is worth thresholding is what the rest of this post is about.

## Lab 1: the grammar buys less than it looks like it does

Three arms over the same 94 item ids:

| arm | accuracy | ECE | latency p50 |
|---|---|---|---|
| Jev, bounded choice | 81.9% (77/94) | 0.091 | 739 ms |
| local 8B, grammar constrained | 63.8% (60/94) | 0.269 | 3,948 ms |
| local 8B, unconstrained | 52.1% (49/94) | n/a | 21,850 ms |

Constrained decoding beat the unconstrained arm by 11.7 points, and that was my first version of the finding. Then the correction. Nine of the unconstrained arm's answers contained no label at all, and those nine account for 9.6 of the 11.7 points. Restricted to the answers it actually produced, it scored 57.6% against 63.8%, six items out of 94, which is noise. What the grammar bought was machine-readable output and speed, 454 output tokens per decision down to 4 and 21.8 seconds down to 3.9. Not comprehension.

## The gate is the real result

Accuracy on its own cannot automate anything. Automation is a threshold on confidence, and what matters at that threshold is how many wrong answers get past it.

Jev, the hosted arm, over 94 items:

| confidence gate | mailbox covered | accuracy inside | wrong answers passed |
|---|---|---|---|
| 0.6 | 89.4% | 89.3% | 9 |
| 0.7 | 84.0% | 94.9% | 4 |
| 0.8 | 79.8% | 96.0% | 3 |
| 0.9 | 62.8% | 100% | 0 |

The local arm over the same 94 items:

| confidence gate | mailbox covered | accuracy inside | wrong answers passed |
|---|---|---|---|
| 0.6 | 93.6% | 67.0% | 29 |
| 0.7 | 86.2% | 71.6% | 23 |
| 0.8 | 80.9% | 73.7% | 20 |
| 0.9 | 71.3% | 77.6% | 15 |

At a 0.8 gate the hosted model runs four fifths of the mailbox with three wrong routings out of 94. The local arm does the same volume with twenty. That ratio, wrong answers passed per unit of automation, is the property worth paying for.

The calibration numbers say the same thing from another angle. ECE is 0.091 against 0.269, and the local arm is more confident when it is right, 0.964 against 0.941. A model that is confident when it is right and equally confident when it is wrong is the combination that makes a gate dangerous instead of useless.

![Errors that pass a confidence gate](/assets/img/gate-errors-escaped.png)

*Wrong answers that clear the gate, lab 2. The local arm covers the same volume at every threshold because it has nothing below 90% confidence.*

## Lab 2: three changes, two of them worse

Lab 2 changed three things, each aimed at a failure I had already measured: queue definitions written as actions rather than subject matter, a space of 25 natural descriptions mapped onto the 8 queues in code so the model can choose in words it actually uses, and a full expansion over the raw token distribution instead of only the greedy path. 205 items, 60 traps.

- Jev on the queue-level prompt: 84.4%. Jev on the semantic space: 85.9%. Local on the semantic space: 65.4%.
- The local arm went from 63.8% to 65.4% across a corpus that got harder, so flat in practice, and 71% slower per decision, 3.9 seconds to 6.7, because the prompt grew.
- The semantic space made the hosted arm's traps worse, 43 of 60 against 48 of 60, and cost it 65,810 output tokens against 15,590.
- Calibration got worse rather than better, ECE 0.339 for the local arm.

Two negative results, kept rather than buried. Giving the model vocabulary it actually uses did not buy accuracy, and it more than quadrupled the hosted arm's output tokens to land a point and a half better on 205 items.

## The local arm cannot be recalibrated

ECE 0.339 raw. Fitting a temperature on held-out data left it somewhere in the 0.32 to 0.36 band, which is to say it did nothing. The reason shows up in the coverage: the local arm's gate coverage is identical at 0.7, 0.8 and 0.9, 84.9% at every threshold. Every answer it is willing to gate arrives at high confidence, so it never occupies the uncertain band and there is nothing for a temperature to rescale.

![Stated confidence against observed accuracy](/assets/img/reliability.png)

*Confidence bins against accuracy, lab 2. The local arm has no answers below 90% confidence, and none of the low bins have a local bar.*

A second problem sits next to that one. 31 of its 205 answers produced no usable distribution at all, so those rows cannot even be presented to a gate.

That is the finding I would hand to anyone planning a local seat. A model that never reports doubt cannot be repaired by prompting, by a grammar, or by rescaling its outputs. Calibration is a property of training.

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

The local model is level on newsletter, security and meeting, and it loses everywhere else, with one collapse doing most of the damage. `complaint` is 24 of the 205 items and the local arm gets 1 of them, so that queue alone accounts for most of the 19 point aggregate gap.

The defensible statement is not "a small model cannot do this". It is "this small model can do three of eight queues, and one aggregate number hid that". A two-tier design falls straight out of the table: let the local lane take the queues where it is level, escalate the rest, and report the removed volume against the accuracy cost.

## The instrument, because it is the part I trust most

Ten defects were found and fixed before or during measurement, three of which would have produced confident wrong conclusions:

- Three trap items had their gold label pointing at the decoy queue. A phishing email was filed under `billing` in the ground truth, so every arm would have been scored wrong against it. The error was in the data, not in the models.
- The grammar's closing brace rides on the final token of the answer, so a completed option never equalled an option name, and a correct answer was scored as no answer.
- The gate coverage metric dropped rows that produced no distribution, which turned 84.9% coverage into 100% in one file while the report's own table said 84.9%.

The rest are the ordinary kind. A malformed grammar literal made the constrained arm return HTTP 400 on every item. A scorer read the token after the label instead of the label's own tokens, so its distribution was meaningless. A 64 token cap returned empty answers because the model was still thinking. And an answer parser matched labels inside negations, so "the subject does not say newsletter" scored as a newsletter answer.

Two corrections were to my own claims, made in the open: the size of the constraint's benefit, and the coverage denominator. Both are entries in the deviations log rather than quiet edits.

One measurement was abandoned rather than patched. Exact per-option scoring needs teacher-forced scoring, and the completions endpoint with `echo` and `logprobs` returned zero prompt tokens when I tested it directly. The local distribution is therefore an approximation over the greedy path and its top-20 alternatives, renormalised across labels. That is a limitation of every local confidence number in this post, not a footnote.

## What these numbers do not say

- The corpus is template generated and the bodies run 77 to 208 characters. Real mail is longer and messier, so every accuracy here is an upper bound.
- One model, one quantisation, one CPU lane, one corpus. Nothing here generalises to small models as a class.
- `jev-latest` floats, so the hosted numbers cannot be reproduced against a pinned version.
- Lab 1's trap sample was 14 items, and its "local beats hosted on traps" reading did not survive lab 2, where the hosted arm won 48 of 60 against 31.
- The two posts in the opening are demos, not evaluations. Neither one reports accuracy on its own task, and both are self-reported by people adjacent to the vendors.
- The $0.0786 per 1,000 emails figure is the paper classifier's number, eight cents for 1,018 items, applied to my token counts. It is not a rate card for this task, and TypeSafe's pricing page returns 404.

## Next, cheapest first

- Two or three few-shot examples for the confusable queues, `internal` against `meeting` and `personal` against no-fit, which is where the aggregate loses its points.
- Agreement between two runs with the option order permuted, used as the gate. The model's own confidence is not usable as one.
- A fine-tuned encoder classifier, milliseconds per item on CPU, with its calibration coming from training instead of from a prompt.
- The CPU economics: pin one slot so the shared system prompt is prefilled once, and use all 12 threads instead of 8.

Cost was never going to decide this. The hosted model works out at about eight cents per thousand emails on the anchor from the paper classifier's own example. The local lane is free per call but runs 909 items an hour in lab 1 and 536 in lab 2, so 50,000 emails a month is 55 to 93 hours of lane time. At triage volumes the money is small on both sides, and the gate is the question.

The run behind all of it: 158 tool calls, 1,286,819 input tokens, 428,852 output tokens, and 41,917,952 cache reads, which are context that was reprocessed rather than generated and are reported apart for that reason. Cost is recorded as zero because this route is unpriced, not because the work was free.

So the 8B stays as a candidate prefilter for the queues it already handles, and stops auditioning as the router :-)
