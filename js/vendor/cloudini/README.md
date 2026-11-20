# Vendored Cloudini WebAssembly build

`cloudini_wasm_single.js` is copied unmodified from the Cloudini 1.5.0 release asset
`cloudini-wasm-1.5.0.zip` (sha256 `333ae6631aa422c9379f0c5bba8735b357e63a5c572acda76501d887d60f8063`):
https://github.com/facontidavide/cloudini/releases/tag/1.5.0

It is the single-file build (WASM embedded, browser/worker environment, C++ exceptions
reported as errors) and defines a global `CloudiniModule` factory. It is loaded lazily by
`../../cloudini.js`, which documents the C API it uses.

Cloudini is Copyright Davide Faconti and licensed under the Apache License 2.0; see `LICENSE`.

To upgrade, replace `cloudini_wasm_single.js` with the file from a newer release and update
the version above.
