#!/usr/bin/env python3
"""Inline the engine and the room data into the template -> index.html (one self-contained file)."""
import pathlib, sys, json
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'index.html'
tpl = (root / 'src' / 'game.template.html').read_text(encoding='utf-8')
eng = (root / 'src' / 'engine.js').read_text(encoding='utf-8')
rooms = json.loads((root / 'src' / 'rooms.json').read_text(encoding='utf-8'))
for r in rooms['campaign'] + rooms['pool']: r.pop('solution', None)          # keep the shipped file small
assert '/*__ENGINE__*/' in tpl and '/*__ROOMS__*/null' in tpl
out.write_text(tpl.replace('/*__ENGINE__*/', eng).replace('/*__ROOMS__*/null', json.dumps(rooms, separators=(',', ':'))), encoding='utf-8')
print('built', out, len(out.read_text(encoding='utf-8')), 'bytes')
