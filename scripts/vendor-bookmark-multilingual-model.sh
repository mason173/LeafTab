#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODEL_DIR="$ROOT_DIR/public/models/paraphrase-multilingual-MiniLM-L12-v2"

mkdir -p "$MODEL_DIR/onnx"

curl -L "https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/config.json" -o "$MODEL_DIR/config.json"
curl -L "https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/tokenizer.json" -o "$MODEL_DIR/tokenizer.json"
curl -L "https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/tokenizer_config.json" -o "$MODEL_DIR/tokenizer_config.json"
curl -L "https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/special_tokens_map.json" -o "$MODEL_DIR/special_tokens_map.json"
curl -L "https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/unigram.json" -o "$MODEL_DIR/unigram.json"
curl -L "https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/onnx/model_quantized.onnx" -o "$MODEL_DIR/onnx/model_quantized.onnx"

mkdir -p "$ROOT_DIR/public/ort"
cp "$ROOT_DIR/node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm" "$ROOT_DIR/public/ort/"
cp "$ROOT_DIR/node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs" "$ROOT_DIR/public/ort/"
cp "$ROOT_DIR/node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm" "$ROOT_DIR/public/ort/"
cp "$ROOT_DIR/node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs" "$ROOT_DIR/public/ort/"

echo "Vendored multilingual bookmark embedding model into $MODEL_DIR"
