"""Tests for eval metrics module."""
import pytest
from app.eval.metrics import (RecalledRef, hit_at_k, recall_at_k,
                              reciprocal_rank, abstention_scores, percentile)


def test_hit_at_k():
    refs = [RecalledRef("osha3404", 23, 23)]
    rel = [{"doc": "osha3404", "pages": [23]}]
    assert hit_at_k(refs, rel, 5) == 1.0


def test_recall_at_k():
    refs = [RecalledRef("osha3404", 20, 25)]
    rel = [{"doc": "osha3404", "pages": [23, 24]}]
    assert recall_at_k(refs, rel, 5) == 1.0


def test_reciprocal_rank():
    refs = [RecalledRef("osha3404", 1, 1), RecalledRef("osha3404", 23, 23)]
    rel = [{"doc": "osha3404", "pages": [23]}]
    assert reciprocal_rank(refs, rel) == 0.5


def test_abstention_scores():
    should = [True, True, False, False]
    did = [True, False, False, True]
    scores = abstention_scores(should, did)
    assert scores["precision"] == 0.5
    assert scores["recall"] == 0.5
    assert scores["f1"] == 0.5


def test_percentile():
    assert percentile([1, 2, 3, 4, 5], 0.5) == 3
    assert percentile([10, 20, 30], 0.95) == 30