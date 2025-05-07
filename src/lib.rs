use napi::bindgen_prelude::*;
use once_cell::sync::OnceCell;
use tokenizers::Tokenizer;

/// Lazily initialise the tokenizer the first time encode() is called.
/// The model weights have already been downloaded into /models by
/// scripts/download-model.py (or local dev's first run).
static TOKENIZER: OnceCell<Tokenizer> = OnceCell::new();

#[napi]
pub fn encode(text: String) -> Vec<u32> {
    let tokenizer = TOKENIZER.get_or_init(|| {
        Tokenizer::from_pretrained("TaylorAI/bge-micro-v2", None)
            .expect("load tokenizer")
    });
    tokenizer
        .encode(text, true)
        .expect("encode failed")
        .get_ids()
        .to_vec()
}