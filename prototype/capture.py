import asyncio, json
from playwright.async_api import async_playwright

OUT = "/w/hosts/2/u/6adae0f9c4a6630be12bc58f/workspace/stratTrack/screenshots"
URL = "http://127.0.0.1:5173/"

async def main():
    import os
    os.makedirs(OUT, exist_ok=True)
    errors = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1440, "height": 900})
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append("console:" + m.text) if m.type == "error" else None)
        await pg.goto(URL, wait_until="networkidle")
        await pg.wait_for_selector(".card")
        await pg.screenshot(path=f"{OUT}/1-dashboard.png", full_page=True)

        await pg.click(".card >> nth=1")
        await pg.wait_for_selector(".chart")
        await pg.screenshot(path=f"{OUT}/3-strategy-detail.png", full_page=True)

        await pg.click("text=Export to booking")
        await pg.wait_for_selector(".modal")
        await pg.click(".modal >> text=Generate SportyBet booking code")
        await pg.wait_for_selector(".code")
        await pg.screenshot(path=f"{OUT}/4-booking-export.png", full_page=False)
        await pg.click(".modal >> text=✕")

        await pg.click("text=Builder")
        await pg.wait_for_selector(".builder")
        await pg.screenshot(path=f"{OUT}/2-strategy-builder.png", full_page=True)
        await b.close()
    print(json.dumps({"errors": errors}))

asyncio.run(main())
