from ingestion.chunking import chunk_text

DOC = (
    "\n4.1 Renewal Premium\n"
    "The renewal premium is payable as per the premium table applicable at renewal.\n"
    + ("The premium depends on the age band and the sum insured chosen.\n" * 80)
    + "4.2 Grace Period\n"
    "A grace period applies to renewal payments as stated in the policy schedule.\n"
)


def test_chunks_carry_governing_header():
    chunks = chunk_text(DOC, target_tokens=100, overlap_tokens=10)
    assert chunks
    grace_chunks = [c for c in chunks if "4.2 Grace Period" in c.header]
    premium_chunks = [c for c in chunks if "4.1 Renewal Premium" in c.header]
    assert grace_chunks and premium_chunks


def test_chunks_respect_target_size():
    chunks = chunk_text(DOC, target_tokens=100, overlap_tokens=10)
    # target + one packed line of slack is acceptable; runaway chunks are not
    assert all(c.n_tokens <= 150 for c in chunks)


def test_no_chunk_straddles_clause_boundary():
    chunks = chunk_text(DOC, target_tokens=100, overlap_tokens=10)
    for chunk in chunks:
        assert not ("4.1 Renewal Premium" in chunk.text and "4.2 Grace Period" in chunk.text)


def test_empty_document_yields_no_chunks():
    assert chunk_text("") == []
