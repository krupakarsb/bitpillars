#!/usr/bin/env python3
"""Inline the engine into the template -> slingshot/index.html (one self-contained file)."""
import pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'index.html'
tpl = (root / 'src' / 'game.template.html').read_text(encoding='utf-8')
eng = (root / 'src' / 'engine.js').read_text(encoding='utf-8')
assert '/*__ENGINE__*/' in tpl
out.write_text(tpl.replace('/*__ENGINE__*/', eng), encoding='utf-8')
print('built', out, len(out.read_text(encoding='utf-8')), 'bytes')
