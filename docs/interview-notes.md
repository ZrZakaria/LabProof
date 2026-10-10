# Interview Notes

## How do you ensure your RAG system is not hallucinating?

I manage hallucinations through a layered verification strategy:

1. **Relevance gate** — Before calling the LLM, I check whether the retrieved chunks are relevant enough. If the best rerank score is below a calibrated threshold, the system abstains instead of generating an answer. This prevents the model from inventing answers when the documents don't contain the information.

2. **Schema-constrained generation** — The LLM is forced to output JSON matching a `DraftAnswer` schema. Every sentence must carry at least one citation ID (`S1`, `S2`, etc.). This makes the citations explicit and machine-checkable.

3. **Independent NLI verification** — A separate multilingual NLI model (mDeBERTa-v3) checks each answer sentence against the cited source text. It scores 1- and 2-sentence premise windows and keeps the best entailment score. Sentences with P(entailment) < threshold are marked "unsupported". Invalid citation IDs (e.g., `S9` when only `S1`-`S5` were provided) are detected and reported.

4. **Measurement and audit** — I evaluate the system on a manually labeled golden set, measuring groundedness, citation validity, abstention F1, and NLI-vs-human agreement. I treat the verifier itself as a component I audit for precision — I know it makes mistakes, so I report its agreement rate honestly.

These safeguards reduce hallucinations, but they cannot eliminate them completely. The NLI verifier can make mistakes, so I measure its performance and clearly communicate the system's limitations.
