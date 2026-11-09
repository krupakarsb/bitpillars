# BitPillars

<img src="brand/bitpillars-github-banner-1280x640.png" alt="BitPillars Games" width="100%">

Tiny pixel games, built for fun and free to play in your browser, on a phone or a desktop. No installs, no ads, no accounts.

**[▶ Open BitPillars](https://krupakarsb.github.io/bitpillars/)**

## Games

| Game | Genre | Play | Source |
|---|---|---|---|
| **LOOPFALL**: a gravity puzzle in a world that repeats forever | Puzzle | [Play](https://krupakarsb.github.io/bitpillars/loopfall/) | [`loopfall/`](loopfall/) |

<img src="loopfall/docs/thumb.png" width="420" alt="LOOPFALL gameplay">

## Layout

```
index.html        landing page: animated pixel hero + game grid
loopfall/         one folder per game, each with its own README and built index.html
```

Every game folder ships a built `index.html`, so GitHub Pages serves it at `krupakarsb.github.io/bitpillars/<folder>/` with no build step.

## Adding a game

1. Create a folder such as `my-game/` with an `index.html`, a `README.md` and a `docs/thumb.png` (16:10).
2. In the root `index.html`, copy a game card, point it at the folder, and add the folder to the `GAMES` list (used by "Play Random Game").
3. Add a row to the table above.

## Brand

Logo, profile pictures, favicons, banner and splash screen live in [`brand/`](brand/). The wordmark is set in Jersey 10 (SIL Open Font License).

## Contact

bitpillars@gmail.com

## License

[MIT](LICENSE)
