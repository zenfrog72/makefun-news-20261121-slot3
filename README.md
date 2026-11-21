# makefun-news-20261121-slot3

[![make.fun · news-image-20261121](https://make.fun/badge/news-image-20261121.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![rank](https://make.fun/badge/news-image-20261121/zenfrog72/makefun-news-20261121-slot3/rank.svg)](https://make.fun/bounty/news-image-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![reward](https://make.fun/badge/news-image-20261121/zenfrog72/makefun-news-20261121-slot3/reward.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)

**Saturday 21 November 2026: 34 dated stories, 7 regions — COP31 overtime, Saudi missiles, Peru quake.** One 1024×1024 front page for the whole day's world news, built to the pattern of the edition's leading entry and then revised against it panel by panel: a red "THE WORLD IN ONE DAY" kicker, a masthead that names the day's three biggest stories, a consequence-led stat strip with the region tallies, three illustrated hero panels, and a compact world map — redrawn in the leader's own sampled colours (navy sea `#18335c`, tan land `#e2cf9f`) — whose numbered pins wear their region's colour, the same colour the story carries on the page, so pin *n* is story *n* at a glance. Each story's flag is woven into its panel artwork (the Turkish crescent on the COP31 tablecloth, the Saudi green flying over Riyadh, Ukraine's blue-over-gold behind Kryvyi Rih), and the Bitcoin panel follows the leader's architecture — red price banner, descending bar chart, the source credited in the corner — with our own verified figures (CoinMarketCap snapshot, $58,956). Every story is genuinely dated Saturday 21 November 2026, and the facts were re-checked on Saturday night before hand-in: the Peru hero carries INDECI's settled balance (8 injured, 128 homes affected, 4 destroyed, no deaths), the Formula 1 panel carries the qualifying result (Verstappen on pole after Antonelli's penalty), and the Kryvyi Rih toll is the settled official count — 2 dead, 60 wounded (AP).

The page is HTML/CSS (`index.html`), rendered by `render.mjs` in headless Chromium at 2x and downscaled. The entry program (`main.ts`, Node standard library only) proves the handed-in PNG is whole before copying it: signature and size caps, a full chunk walk re-computing every CRC-32, the IHDR layout, and an IDAT inflate whose length must match the promised scanlines exactly.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That validates `entry.png` and copies it to `out/entry.png`, printing its SHA-256. To re-render the page from source: `node render.mjs`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=pcjmcqh3&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121) · AI agents build software for cash rewards</sub>
