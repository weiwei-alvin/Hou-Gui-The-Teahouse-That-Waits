# 候歸茶館：圖片清單與生成指令

這份是遊戲需要的所有圖片，以及每一張要貼給 ChatGPT 的指令。

## 總覽

| 類別 | 張數 | 檔名 | 必要性 |
|---|---|---|---|
| 場景 | 10 | `00-base.png`、`lamp-1~3`、`tea-1~3`、`seat-1`、`seat-2-window`、`seat-2-brazier` | 必做 |
| 序幕 | 3 | `intro-1.png` ~ `intro-3.png`（第 4 格直接用 `00-base.png`） | 必做 |
| 結局暖光 | 1 | `warm.png` | 選做（沒有的話遊戲用疊色代替） |
| 卡片插圖 | 15 | `card-*.png` | 選做（沒有的話用現在的線條圖示） |

**不用畫的**：場景裡的掌櫃、客人、鶴杯、她的小燈籠，以及卡框和卡片文字。這些由程式另外畫上去，所以所有圖裡都不要有人物。

做好的圖全部放進專案的 `art/` 資料夾，檔名要完全照表。

## 製作規則

1. **用網頁版 ChatGPT**，不要用 Codex。網頁版的選取筆刷能只改指定區域，這是修改圖成敗的關鍵。
2. **每張圖都開新對話。** 在同一個對話裡連續修改，構圖容易跑掉。
3. **修改圖一定要先塗選取區域**：上傳指定的來源圖，用編輯畫面的選取筆刷只塗「要塗的範圍」那一欄寫的地方，再貼指令。
4. **按「下載」存原檔**，不要截圖。
5. **驗收**：把修改圖和來源圖疊在一起比對，選取範圍以外有任何改變，例如窗戶移位、櫃檯變形、色調整張變了，就重做那一張。
6. 圖都是 3:2 橫式。所有圖由 ChatGPT 生成，README 和任何對外文章都要註明。

## 生成順序

```
00-base ─┬─ lamp-1-raised ── lamp-2-patched ── lamp-3-lit
         ├─ tea-1-gathered ── tea-2-stove-fixed ── tea-3-lit ── (warm，選做)
         └─ seat-1-cleared ─┬─ seat-2-window
                            └─ seat-2-brazier
```
先做 `00-base.png`，確認你滿意整體畫風和配置再往下。之後的每一張都以它為準，底圖一換，後面全部要重做。

---

## 一、場景（10 張）
### `00-base.png`｜修復前底圖

- 來源：新對話，不用上傳圖片。

```
Create a single, production-quality 2D game environment illustration for "Hou Gui Teahouse", a supernatural teahouse restoration game.

CANVAS AND CAMERA
- Landscape aspect ratio 3:2.
- Fixed three-quarter top-down perspective, resembling an intricately illustrated dollhouse with its front wall removed.
- The camera looks slightly downward into the teahouse, showing both the interior and the cobblestone street outside.
- Consistent architectural perspective, stable object scale, and clearly separated interactive zones.
- No dramatic perspective distortion, fisheye effect, or cinematic depth-of-field blur.
- This image will serve as the permanent master background for a game. Every architectural and object position must be clearly established.

ART DIRECTION
Cinematic East Asian Gothic Storybook Fantasy.

A richly atmospheric, hand-painted 2D dark-fantasy game environment, blending traditional Chinese architectural elegance with restrained Western Gothic ornamentation.

Visual qualities:
- Intricate yet confident ink-like outlines.
- Painterly textures with controlled, slightly stylized brushwork.
- Refined anime-inspired environmental detailing without exaggerated cartoon proportions.
- Subtle cel-shaded structure combined with soft, atmospheric painted shadows.
- Richly textured aged wood, weathered stone, cracked ceramics, dusty surfaces, and tarnished metal.
- Strong, readable silhouettes and clear material differentiation.
- A carefully composed storybook illustration with the sophistication of a premium indie narrative game.
- Beautifully eerie, melancholic, intimate, mysterious, and quietly supernatural.

Avoid photorealism, generic 3D rendering, plastic-looking surfaces, excessive ornamental clutter, chibi aesthetics, and overly bright fantasy colors.

ARCHITECTURE
An abandoned traditional Chinese wooden teahouse with understated Gothic-fantasy influences:
- Dark lacquered timber beams.
- Weathered curved tiled eaves.
- Intricate carved wooden lattice windows.
- Aged wrought-iron hinges and fittings.
- Small, muted leaded-glass inserts.
- Worn wooden floorboards.
- Subtle antique Chinese motifs.
- A few decorative Gothic arches or iron flourishes integrated naturally into the architecture.

The teahouse must remain unmistakably Chinese in its overall architectural identity.

COLOR AND LIGHTING
Dominant palette:
- Deep midnight ink blue.
- Desaturated teal.
- Cold blue-green.
- Charcoal brown.
- Muted violet-grey.
- Small accents of weathered vermilion.

Lighting:
- Cold moonlight and faint ambient illumination.
- Thin atmospheric mist along the abandoned street.
- Soft, restrained highlights revealing materials and silhouettes.
- Deep shadows, but not so dark that interactive objects become difficult to identify.
- Almost no warm illumination.
- No active lantern light, firelight, or glowing stove.

A faded blank vermilion paper charm may hang on the wall, along with worn red lacquer details. These are decorative accents, not light sources.

SPATIAL LAYOUT
The scene must follow the arrangement below precisely.

LEFT THIRD — EXTERIOR STREET
An empty, abandoned cobblestone street visible immediately outside the teahouse.

Near the doorway:
- A wooden lantern post lies fallen diagonally across the cobblestones.
- The post has a clearly visible structural crack.
- Its attached paper-and-wood lantern is damaged and completely unlit.
- A small, distinct pile of salvageable wooden planks rests beside the doorway.
- A simple stone bench stands against the exterior wall, unobstructed and large enough for one ghostly visitor to sit on.

The fallen lantern post, scrap wood pile, and stone bench must occupy visibly separate spaces.

BOUNDARY BETWEEN EXTERIOR AND INTERIOR
- An open doorway in the teahouse's left side wall.
- The doorway clearly connects the street to the interior.
- The interior floor level and perspective must remain visually coherent with the exterior.

INTERIOR — BACK WALL
- On the left portion of the back wall: a large, ornate carved wooden lattice window.
- On the right portion: aged wooden shelves containing old ceramic jars and dusty objects.
- Beneath the shelves: a long, dark wooden service counter.
- Keep the counter surface sufficiently clear for a ghostly shopkeeper character to be added later.

INTERIOR — LEFT WAITING AREA
Directly below the lattice window:
- A heap of broken wooden crates, loose boards, and dusty debris.
- The debris clearly occupies a potential seating area.
- No intact table or chairs are present here.

INTERIOR — CENTRAL FLOOR
- An old, empty iron brazier standing on three legs.
- The brazier is cold, dark, and completely unlit.
- Leave enough open floor space around it to accommodate a small round table and two wooden chairs later.

INTERIOR — RIGHT TEA STATION
- A low wooden tea station table near the right wall.
- A small traditional clay stove rests on the table.
- The stove has a clearly visible crack and is completely cold.
- Exactly three old ceramic teacups and one ceramic teapot lie scattered on the floor immediately in front of the tea station.
- The cups and teapot are recognizable, intact enough to be reused, but visibly worn.
- No active fire, glowing embers, kettle, or steam.

INTERACTIVE READABILITY
The three restoration targets must be visually obvious:
1. Fallen lantern post on the exterior street.
2. Broken tea station on the interior right.
3. Cluttered waiting area beneath the lattice window.

These three regions should not visually overlap.

Keep clear walking space between the doorway, central floor, service counter, and tea station.

The scene should look beautifully abandoned, inviting curiosity and exploration despite its unsettling atmosphere.

STRICT EXCLUSIONS
- No humans.
- No ghosts or supernatural characters.
- No animals or creatures.
- No furniture beyond what is explicitly described.
- No text, Chinese characters, English letters, numbers, signs, subtitles, or UI.
- No logos, watermarks, decorative borders, or presentation mockups.
- No active supernatural effects.
- No glowing lanterns or flames.

OUTPUT
One complete, clean game background illustration filling the entire 3:2 canvas.

The image should read as a unified, handcrafted game environment, not a collage, concept sheet, or cinematic storyboard.
```

### `lamp-1-raised.png`｜扶正燈柱

- 來源：上傳 `00-base.png`。
- 要塗的範圍：燈柱和它倒下的地面

```
Perform a strictly localized edit of the uploaded game background.

This is a restoration-state edit, NOT a scene redesign.

TARGET REGION
The fallen wooden lantern post on the exterior cobblestone street, in the left third of the image.

REQUIRED CHANGE
- Raise the fallen wooden lantern post into a natural, upright position on its original base.
- The post must remain visibly damaged, with its structural crack clearly exposed.
- Its attached paper-and-wood lantern remains damaged and completely unlit.
- Restore the cobblestone texture where the fallen post previously lay, matching the surrounding pavement seamlessly.
- Keep the small pile of scrap wooden planks beside the doorway exactly where it was.
- Keep the stone bench unchanged.

VISUAL CONTINUITY
Preserve the original cinematic East Asian Gothic storybook style: refined ink-like outlines, hand-painted textures, cold moonlit atmosphere, desaturated teal shadows, weathered Chinese wooden architecture, and quiet supernatural melancholy.

STRICT SCENE LOCK
- Identical camera angle, perspective, crop, and canvas dimensions.
- Preserve every architectural element and all object positions outside the target region.
- Do not modify the tea station, stove, teacups, waiting-area debris, brazier, counter, window, doorway, or stone bench.
- No new objects or characters.
- No new light sources, flame, or glow.
- No text, logos, or interface elements.
- No global color grading or stylistic reinterpretation.

Only the lantern post and the pavement exposed beneath its previous position may change.

The final image must remain visually aligned with the original background for game-state compositing.
```

### `lamp-2-patched.png`｜用木料補好燈柱

- 來源：上傳 `lamp-1-raised.png`。
- 要塗的範圍：燈柱和門邊那堆木料

```
Perform a strictly localized restoration-state edit of the uploaded game background.

TARGET REGION
The upright but damaged wooden lantern post on the exterior street, and the small scrap wood pile beside the doorway.

REQUIRED CHANGES
- Repair the lantern post's visible structural crack using two short strips of salvaged wood.
- Secure the wooden braces with visibly wrapped rough rope.
- The repair should look handmade, practical, and slightly imperfect.
- The original crack may remain faintly visible beneath the braces.
- Remove the entire scrap wood pile beside the doorway, revealing natural, undisturbed cobblestones beneath it.
- Keep the lantern attached to the post, damaged-looking and completely unlit.

VISUAL CONTINUITY
Maintain the same sophisticated hand-painted Gothic storybook illustration style, aged timber textures, controlled ink-like linework, cold teal shadows, and atmospheric nighttime lighting.

STRICT SCENE LOCK
- Preserve the exact existing camera, scale, geometry, composition, and framing.
- All architecture and unrelated objects must stay in precisely the same positions.
- Do not change the waiting-area debris, tea station, stone bench, brazier, window, counter, or doorway.
- No additional decorations, new props, magical effects, or characters.
- No lantern glow or warm illumination.
- No change to the overall environment color balance.
- No text or UI.

Only the lantern's wooden structural repair and removal of the scrap wood pile may be visible as changes.

Keep all untouched regions visually identical to the source image.
```

### `lamp-3-lit.png`｜點亮門燈

- 來源：上傳 `lamp-2-patched.png`。
- 要塗的範圍：燈籠和燈柱周圍的地面

```
Perform a strictly localized lighting-state edit of the uploaded game background.

TARGET REGION
The repaired upright lantern post on the exterior street and its immediate surrounding cobblestones.

REQUIRED CHANGE
- Illuminate the existing lantern from within using a pale, spectral blue-green glow.
- The light should feel supernatural, delicate, and slightly eerie.
- Add a soft, localized pool of cool light on the cobblestones immediately surrounding the post.
- Gently reveal the repaired wood braces, rope bindings, and nearby stone textures through this new illumination.
- Preserve the repaired lantern post's exact structure, size, and position.

LIGHTING STYLE
A restrained ghostly radiance with soft painterly falloff.

Color: desaturated spectral cyan and pale jade-teal.

The lantern should become a small, striking visual focal point against the deep midnight-blue street.

The illumination must remain subtle and localized, with no excessive bloom, neon intensity, or magical particles.

STRICT SCENE LOCK
- Exact same camera, composition, canvas size, and architectural layout.
- No changes to any object positions.
- Do not illuminate the teahouse interior or activate the tea stove.
- Do not change the brazier, waiting area, counter, stone bench, or tea station.
- No orange, gold, or yellow lantern light.
- No new objects, characters, writing, or interface elements.
- No global exposure increase or overall color-grading change.

Only the lantern's illumination and its physically plausible, localized light spill may change.

The result must be suitable for compositing into the master game background.
```

### `tea-1-gathered.png`｜收拾茶具

- 來源：上傳 `00-base.png`。
- 要塗的範圍：茶桌和桌前地上的茶具

```
Perform a strictly localized restoration-state edit of the uploaded game background.

TARGET REGION
The tea station on the right side of the teahouse and the small floor area directly in front of it.

REQUIRED CHANGES
- Remove the three scattered ceramic teacups and one ceramic teapot from the floor.
- Place those same three teacups and the same teapot neatly together on the wooden tea station table.
- Arrange the teacups in a compact group beside the teapot.
- Preserve the original ceramics' colors, aged glazing, chipped edges, and recognizable shapes.
- The floorboards where the ceramics previously lay must become visible, with textures matching the surrounding floor seamlessly.

IMPORTANT
The clay stove remains in its original position.
Its structural crack remains clearly visible.
The stove is completely cold, unlit, and inactive.

VISUAL CONTINUITY
Maintain the original hand-painted dark storybook fantasy style, fine ink-like outlines, aged ceramic textures, atmospheric teal moonlight, and restrained Gothic details.

STRICT SCENE LOCK
- Identical fixed camera angle, crop, scale, and composition.
- No changes to the exterior lantern, scrap wood, stone bench, doorway, waiting-area debris, counter, lattice window, or iron brazier.
- No new ceramic objects.
- No additional decorations.
- No fire, glowing embers, smoke, or steam.
- No characters, text, UI, or global lighting changes.

Only the relocation of the existing teacups and teapot, and the exposed floor beneath them, may change.

Preserve all unrelated regions for precise game-state compositing.
```

### `tea-2-stove-fixed.png`｜修好爐子

- 來源：上傳 `tea-1-gathered.png`。
- 要塗的範圍：爐子

```
Perform a strictly localized restoration-state edit of the uploaded game background.

TARGET REGION
The cracked traditional clay stove resting on the tea station table, on the right side of the interior.

REQUIRED CHANGE
- Repair the existing structural crack in the clay stove.
- Seal the damaged area with a visible patch of fresh clay, slightly darker and smoother than the surrounding weathered clay.
- The repaired seam should remain subtly visible to communicate careful handmade restoration.
- Preserve the stove's original silhouette, dimensions, material, position, and architectural character.
- The stove now looks structurally sound but remains completely unlit and cold.

The three collected teacups and one teapot remain neatly arranged on the tea station table, exactly as in the source image.

VISUAL CONTINUITY
Maintain the exact existing painterly Gothic storybook aesthetic, subtle linework, ceramic material textures, cold moonlit shadows, and desaturated nighttime palette.

STRICT SCENE LOCK
- Same camera, crop, composition, perspective, and canvas size.
- Do not move or redesign the stove, tea station table, teacups, or teapot.
- Do not alter any unrelated area.
- No fire, flame, embers, steam, kettle, smoke, or magical light.
- Do not change the entrance lantern, waiting-area debris, iron brazier, or exterior street.
- No new characters, objects, text, or UI.
- No change to global lighting or colors.

The only visible difference should be the repaired clay stove surface.

All other pixels should remain unchanged wherever possible.
```

### `tea-3-lit.png`｜生火煮茶

- 來源：上傳 `tea-2-stove-fixed.png`。
- 要塗的範圍：整張茶桌

```
Perform a strictly localized restoration and lighting-state edit of the uploaded game background.

TARGET REGION
The repaired clay stove and surrounding tea station table on the right side of the teahouse.

REQUIRED CHANGES
- Light the repaired clay stove with a small, controlled, pale spectral-blue flame.
- Place one modest, traditional dark-metal tea kettle directly on the stove.
- A delicate, thin wisp of steam rises from the kettle.
- Rearrange the existing three teacups into a neat, evenly spaced row on the tea station table.
- Keep the existing ceramic teapot beside the cups.
- The tea station should now look functional, orderly, and ready to serve a guest.

LIGHTING AND ATMOSPHERE
- The flame glows softly in muted, cool blue.
- Add a very subtle blue-green light reflection on the clay stove and immediate tea station surface.
- Steam should be delicate and translucent, clearly visible against the darker background.
- The visual effect should suggest supernatural tea preparation without becoming flashy or exaggerated.

STYLE
Cinematic hand-painted East Asian Gothic storybook fantasy, refined material rendering, delicate ink-like outlines, muted supernatural lighting, and intimate haunted atmosphere.

STRICT SCENE LOCK
- Preserve the identical camera, crop, architecture, and overall composition.
- Keep the tea station and all pre-existing furniture in exactly the same position.
- Do not modify the entrance lantern, waiting area, brazier, shelves, doorway, or exterior street.
- Do not add extra utensils, decorations, or unrelated objects.
- No orange or yellow flames.
- No dramatic smoke clouds or large magical particles.
- No global lighting or color adjustments.
- No people, ghosts, text, logos, or UI.

Only the active tea station, its rearranged existing ceramics, the new kettle, and their localized light and steam may change.

Maintain precise visual compatibility with the original master background.
```

### `seat-1-cleared.png`｜清空候客區

- 來源：上傳 `00-base.png`。
- 要塗的範圍：窗下那堆破木箱

```
Perform a strictly localized restoration-state edit of the uploaded game background.

TARGET REGION
The damaged waiting area directly beneath the large carved wooden lattice window on the left side of the teahouse interior.

REQUIRED CHANGE
- Completely remove the heap of broken crates, discarded wooden boards, and dusty debris from beneath the window.
- Reveal the original wooden floorboards that were previously hidden under the debris.
- The exposed floor should look old, weathered, and naturally integrated with the surrounding floor.
- Preserve realistic wood grain, board spacing, wear patterns, and existing perspective.
- The area should now be visibly clear and usable, while retaining the haunted teahouse's aged character.

IMPORTANT
Do not introduce any furniture into the cleared space yet.

Do not make the floor look newly constructed or artificially polished.

VISUAL CONTINUITY
Preserve the rich hand-painted Gothic storybook style, weathered Chinese timber architecture, subdued teal shadows, fine linework, and melancholic nighttime atmosphere.

STRICT SCENE LOCK
- Identical camera, framing, crop, and perspective.
- Do not change the lattice window itself.
- Preserve the iron brazier and all surrounding floor space.
- Do not move the counter, tea station, exterior lantern, stone bench, or doorway.
- Do not activate any fire or light source.
- No new objects, characters, text, or UI.
- No global lighting, color, texture, or stylistic changes.

Only the debris removal and restoration of the previously obscured floorboards may change.

All other parts of the background must remain visually consistent with the original.
```

### `seat-2-window.png`｜窗邊座位

- 來源：上傳 `seat-1-cleared.png`。
- 要塗的範圍：窗下的空地

```
Perform a strictly localized furniture-placement edit of the uploaded game background.

TARGET REGION
The cleared waiting area directly beneath the large carved wooden lattice window.

REQUIRED CHANGE
Add exactly:
- One small, round, dark wooden tea table.
- Two simple, traditional wooden chairs.

PLACEMENT
- Position the round table on the cleared floor directly beneath the lattice window.
- Arrange the two chairs naturally around the table, forming a small, intimate seating area.
- The furniture must fit the existing architectural perspective and scale.
- The chairs should be fully recognizable and visually separate from the table.
- Keep a clear passage between the seating area and the central floor.

FURNITURE DESIGN
- Dark, aged Chinese timber.
- Subtle carved details matching the existing teahouse.
- Slightly worn surfaces.
- Simple, elegant silhouettes.
- No cushions, tablecloths, teacups, food, or decorations added.

LIGHTING
Use only the existing ambient cold moonlight.
Add subtle contact shadows beneath the furniture, consistent with the original scene.

Do not introduce new light sources.

STRICT SCENE LOCK
- Exact same camera, crop, layout, colors, and painting style.
- The iron brazier remains cold and unobstructed.
- The floor beside the brazier stays empty.
- No changes to the tea station, doorway, exterior lantern, stone bench, counter, or window.
- No new architectural features.
- No people, ghosts, writing, signs, or UI.

Only the new table, two chairs, and their physically appropriate contact shadows may change.

The final image must align precisely with the cleared waiting-area background.
```

### `seat-2-brazier.png`｜火盆旁座位

- 來源：上傳 `seat-1-cleared.png`（**不是** window 那張）。
- 要塗的範圍：火盆旁的空地

```
Perform a strictly localized furniture-placement edit of the uploaded game background.

This is an ALTERNATIVE seating arrangement to the window-side furniture layout.

SOURCE REQUIREMENT
The uploaded image must show the waiting area already cleared of debris, with no table or chairs installed.

TARGET REGION
The open interior floor beside the central three-legged iron brazier.

REQUIRED CHANGE
Add exactly:
- One small, round, dark wooden tea table.
- Two simple, traditional wooden chairs.

PLACEMENT
- Arrange the table and chairs naturally beside the existing cold iron brazier.
- The seating should feel intimate and slightly mysterious, as though visitors might gather around the brazier.
- Maintain appropriate clearance around the brazier.
- Keep the passage to the service counter and tea station unobstructed.
- Match the existing camera perspective and object scale precisely.

IMPORTANT SPATIAL CONDITION
The waiting area directly beneath the lattice window must remain completely empty, showing only the cleared old wooden floorboards.

Do not add any furniture beneath the window.

FURNITURE DESIGN
- Weathered dark Chinese timber.
- Delicate, restrained carved details.
- Simple, readable silhouettes.
- Materials and craftsmanship consistent with the original teahouse.

LIGHTING
The iron brazier remains cold, empty, and unlit.

Use the existing cold ambient moonlight and subtle contact shadows only.

No fire, ember glow, smoke, or additional illumination.

STRICT SCENE LOCK
- Preserve the exact camera, architecture, composition, palette, and painterly storybook style.
- The iron brazier must remain in its original position.
- Do not modify the cleared floor beneath the lattice window.
- Do not move the counter, tea station, exterior lantern, doorway, or stone bench.
- No additional furniture, characters, decorative props, text, or UI.
- No global lighting changes.

Only the table, the two chairs, and their localized contact shadows may change.

The image must remain visually compatible with every other restoration state of the master teahouse background.
```

---

## 二、序幕（3 張）

三張都開新對話，不用上傳圖片。第 4 格直接用 `00-base.png`。

### `intro-1.png`｜喪禮之後

```
A single illustrated scene, landscape 3:2. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering. Quiet and melancholy, not gory.

Inside an old Taiwanese countryside house on the night after a funeral. A low wooden table by a window, white chrysanthemums in a vase, a small incense burner with a thin thread of smoke, and among some old belongings an aged paper envelope lying on the table. Rain on the window. No people, no faces, no portrait photos, no text, no letters, no logos, no watermark.
```

### `intro-2.png`｜鑰匙與信

```
A single illustrated close-up, landscape 3:2. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering. Quiet and melancholy.

Top-down close-up of an opened old paper envelope on a wooden table: an old brass key with a worn red tassel, and a handwritten letter whose ink has been blurred and washed out by rain, so that no writing is readable. A few raindrops on the paper. No people, no readable text, no logos, no watermark.
```

### `intro-3.png`｜空無一人的鎮街

```
A single illustrated scene, landscape 3:2. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering. Eerie, quiet, slightly unsettling, never gory.

An abandoned small-town street at night, blending Chinese and Western fantasy architecture: dark timber shopfronts with curved tiled eaves, wrought-iron balconies, every door and window dark and shut. Thin mist along the cobblestones. At the far end, one old teahouse with a faded wooden signboard hanging over its door; the signboard is weathered and blank. No people, no characters, no text, no letters, no logos, no watermark.
```

---

## 三、選做：`warm.png`｜結局暖光

- 來源：上傳 `tea-3-lit.png`。
- 要塗的範圍：不用塗，這張是整體光線的改變。

```
Edit this image. Change only the lighting: the door lantern and the stove now glow with soft warm amber light, and warm light spills through the lattice window and across the floor. Keep the night sky and the street outside cool and dark. Keep everything else exactly the same: composition, camera, objects, and their positions.
```

---

## 四、卡片插圖（15 張，選做）

遊戲現在的卡片，是在拱形卡框裡畫一個白色線條圖示，跟魔法生涯的卡片同一種樣式，不另外畫圖也能用。這一節是想讓每張卡改成插畫時用的。

- **卡框、編號、名稱、說明都由程式畫**，圖裡只要畫中間那個物件，不要有邊框或文字。
- 比例是 2:3 直式，物件放正中央，四周留空，因為圖會被裁成拱形。
- 每張都開新對話，不用上傳圖片。
- **不要畫出姑婆的樣子。**「仔細看客人」那張只畫燈籠和一截袖子，客人的身分要留給玩家自己發現。
- 全部做完再一次交，畫風才比較一致。只做一部分的話，那幾張會和其他卡的線條圖示不搭。

| 檔名 | 卡片 |
|---|---|
| `card-lamp-raise.png` | 扶正燈柱（Raise the lamp post） |
| `card-lamp-patch.png` | 用木料補好（Brace with scrap wood） |
| `card-lamp-light.png` | 點亮門燈（Light the lamp） |
| `card-tea-gather.png` | 收拾茶具（Gather the teaware） |
| `card-tea-stove.png` | 修好爐子（Mend the stove） |
| `card-tea-fire.png` | 生火（Light the stove） |
| `card-seat-clear.png` | 清走木箱（Clear the crates） |
| `card-seat-window.png` | 窗邊座位（Seats by the window） |
| `card-seat-brazier.png` | 火盆旁座位（Seats by the brazier） |
| `card-cup-pour.png` | 倒茶進鶴杯（Fill the crane cup） |
| `card-guest-look.png` | 仔細看客人（Look at the guest） |
| `card-cup-serve.png` | 放下鶴杯（Set down the crane cup） |
| `card-keep-letter.png` | 姑婆的信（Great-aunt's letter） |
| `card-keep-crane-cup.png` | 鶴杯（Crane cup） |
| `card-keep-lantern.png` | 她的小燈籠（Her small lantern） |

### 行動卡（12 張）

#### `card-lamp-raise.png`｜扶正燈柱

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

A cracked wooden lantern post lying fallen on wet cobblestones at night, its small paper-and-wood lantern dark and damaged. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-lamp-patch.png`｜用木料補好

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

Close-up of a cracked wooden post braced with two strips of salvaged wood, tied with rough rope. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-lamp-light.png`｜點亮門燈

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

A small paper-and-wood lantern on an old post, just lit from within with a pale, cold blue-green glow against the dark. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-tea-gather.png`｜收拾茶具

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

Three worn ceramic teacups and a chipped teapot gathered together on dusty floorboards. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-tea-stove.png`｜修好爐子

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

A small traditional clay stove with a crack freshly sealed by darker, smoother clay; cold and unlit. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-tea-fire.png`｜生火

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

A small clay stove lit with a pale spectral-blue flame, a dark metal kettle on top with a thin wisp of steam. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-seat-clear.png`｜清走木箱

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

A heap of broken wooden crates and loose boards beneath a carved wooden lattice window, with something faintly pale half-hidden underneath. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-seat-window.png`｜窗邊座位

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

A small round dark wooden tea table with two simple wooden chairs beneath a carved lattice window, lit by cold moonlight. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-seat-brazier.png`｜火盆旁座位

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

A small round dark wooden tea table with two simple wooden chairs beside a cold three-legged iron brazier. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-cup-pour.png`｜倒茶進鶴杯

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

Warm tea being poured into an old pale celadon cup with a small crane painted on it; a thin curl of steam. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-guest-look.png`｜仔細看客人

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

A small hand-held lantern, the same simple paper-and-wood design as a door lantern, held by a pale translucent sleeve; only the lantern and the sleeve, no figure, no face. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-cup-serve.png`｜放下鶴杯

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

An old pale celadon cup with a small crane painted on it, full of tea, set down on a dark wooden table; a faint warm glow at its rim. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

### 收藏卡（3 張）

#### `card-keep-letter.png`｜姑婆的信

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

An opened old paper envelope with an old brass key with a worn red tassel, and a letter whose ink is blurred by rain so nothing is readable. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-keep-crane-cup.png`｜鶴杯

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

An old pale celadon teacup with a small crane painted on it, slightly chipped at the rim, shown alone like a cherished keepsake. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

#### `card-keep-lantern.png`｜她的小燈籠

```
A single card illustration, portrait 2:3. Style: cinematic East Asian Gothic storybook fantasy. Hand-painted 2D illustration with intricate yet confident ink-like outlines, painterly textures with controlled brushwork, refined anime-inspired detailing, soft atmospheric shadows. Palette: deep midnight ink blue, desaturated teal, cold blue-green, charcoal brown, muted violet-grey, small accents of weathered vermilion. Avoid photorealism and 3D rendering.

A small hand-held paper-and-wood lantern glowing faintly cold blue-green, shown alone like a keepsake. Composition: one clear subject, centered, with simple dark background and generous empty margin on all sides, because the image will be cropped into an arched card window. No border, no frame, no card layout, no people, no faces, no text, no letters, no numbers, no logos, no watermark.
```

---

## 交付

必做的 13 張做好後（選做的可以之後再補），連同檔名一起交給 Claude。Claude 會先檢查每張修改圖有沒有改到選取範圍以外的地方，再按門燈、茶爐、座位三個區域裁切合成，放進遊戲。
