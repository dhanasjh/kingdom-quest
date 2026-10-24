import asyncio, base64, io, os, sys
from dotenv import load_dotenv
from PIL import Image
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
KEY = os.getenv("EMERGENT_LLM_KEY")
OUT = "/app/frontend/assets/images/game"
os.makedirs(OUT, exist_ok=True)

STYLE = ("Original character (not based on any existing franchise), cute chibi cartoon mascot, glossy 3D casual mobile game icon style, "
         "head and shoulders, big expressive eyes, centered, fills the frame, thick soft outline, vibrant, no text, no border, ")
CHARS = [
    ("char_ninja", "a brave little ninja kid with messy brown hair, a red cloth scarf and a cheerful determined grin, on a solid flat bright red background"),
    ("char_pigtails", "a cheeky kindergarten girl with black pigtails and a red dress, mischievous grin, on a solid flat bright red background"),
    ("char_monk", "a tiny cheerful monk kid in an orange robe holding a small wooden staff, on a solid flat bright orange background"),
    ("char_lion", "a happy fluffy lion cub with a big mane and a toothy smile, on a solid flat bright orange background"),
    ("char_hero", "a little adventurer kid hero with a plain yellow cape with NO logo, NO emblem, NO letters, plain shirt, aviator goggles on forehead, thumbs up, on a solid flat bright yellow background"),
    ("char_duck", "a goofy yellow duckling explorer with a tiny backpack and explorer hat, on a solid flat bright yellow background"),
    ("char_squad", "a confident kid adventurer with a green camo cap, aviator goggles and a backpack, battle royale adventure vibe, no weapons, on a solid flat bright green background"),
    ("char_frog", "a cute frog prince with a tiny golden crown and a big grin, on a solid flat bright green background"),
    ("char_fairy", "a little fairy girl with sparkly translucent wings and a flower crown, on a solid flat coral pink background"),
    ("char_bunny", "a cheerful pink bunny with floppy ears and a carrot, on a solid flat coral pink background"),
    ("char_shadow", "a cool kid ninja in a dark outfit with a face mask showing friendly smiling eyes, on a solid flat dark charcoal background"),
    ("char_panda", "a cute chubby baby panda eating bamboo, on a solid flat dark charcoal background"),
]
THEMES = [
    "Magical sunlit forest, glowing mushrooms, giant trees",
    "Sandy dunes, ancient sandstone temples, bright oasis",
    "Lollipop trees, chocolate rivers, gummy hills, candy land",
    "Glowing emerald and ruby crystal cavern, sparkling rock walls",
    "Volcano peak with bubbling lava rivers, obsidian rocks, warm embers",
    "Floating islands in the sky, fluffy clouds, windmills, sunny",
    "Clockwork city with bronze gears, steam pipes, mechanical platforms, steampunk",
    "Mushroom valley with giant colorful bouncy mushrooms and fairy lights",
    "Sunken shipwreck with coral reefs, treasure galleon, bubbles, bright turquoise water",
    "Snowy tundra with ice castles, snowy pine trees, frozen lake",
    "Dense jungle with ruined stone temples and vines, tropical",
    "Cute spooky haunted manor, glowing pumpkins, crooked gates, warm moonlight",
    "Dragon's lair treasure cave with gold coin piles and glowing gems",
    "Starry observatory with brass telescopes and glowing golden constellations at dusk",
    "Rainbow road, colorful glowing candy paths among warm sunset clouds and stars",
    "Royal castle with golden banners, white marble towers, red carpets, victory celebration",
]

sem = asyncio.Semaphore(6)

async def gen(name, prompt, size, fmt):
    path = f"{OUT}/{name}.{fmt}"
    if os.path.exists(path):
        return
    async with sem:
        for attempt in range(3):
            try:
                chat = LlmChat(api_key=KEY, session_id=f"kq-{name}-{attempt}", system_message="You create game art.")
                chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
                _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
                if not images:
                    raise RuntimeError("no image")
                im = Image.open(io.BytesIO(base64.b64decode(images[0]["data"]))).convert("RGB")
                w, h = size
                # center-crop to target aspect
                tr = w / h
                iw, ih = im.size
                if iw / ih > tr:
                    nw = int(ih * tr); im = im.crop(((iw - nw) // 2, 0, (iw - nw) // 2 + nw, ih))
                else:
                    nh = int(iw / tr); im = im.crop((0, (ih - nh) // 2, iw, (ih - nh) // 2 + nh))
                im = im.resize(size, Image.LANCZOS)
                if fmt == "jpg":
                    im.save(path, quality=72, optimize=True, progressive=True)
                else:
                    im.save(path, optimize=True)
                print("ok", name, flush=True)
                return
            except Exception as e:
                print("retry", name, attempt, str(e)[:120], flush=True)
    print("FAILED", name, flush=True)

async def main():
    tasks = [gen(n, STYLE + d, (192, 192), "png") for n, d in CHARS]
    for i, t in enumerate([]):
        p = (f"Vertical portrait mobile game background, 9:16, {t}. Bright, warm, cheerful casual mobile puzzle game art, "
             "painterly 3D-ish, soft lighting, depth, no characters, no text, no UI, calm center area.")
        tasks.append(gen(f"bg_{i + 1:02d}", p, (720, 1280), "jpg"))
    await asyncio.gather(*tasks)

asyncio.run(main())
