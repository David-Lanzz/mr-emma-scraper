const puppeteer = require("puppeteer");

async function getBrowser() {
    return puppeteer.launch({
        headless: "new",
        executablePath: "/usr/bin/google-chrome",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-zygote",
            "--no-first-run",
            "--disable-default-apps",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-breakpad",
            "--disable-component-extensions-with-background-pages",
            "--disable-features=TranslateUI,BackForwardCache,WebRtcHideLocalIpsWithMdns",
            "--disable-ipc-flooding-protection",
            "--disable-notifications",
            "--disable-popup-blocking",
            "--disable-renderer-backgrounding",
            "--disable-sync",
            "--mute-audio",
            "--single-process" // further reduces memory usage
        ]
    });
}

async function scrape(name, state) {
    const browser = await getBrowser();
    const results = [];
    let pageNumber = 1;

    while (true) {
        const page = await browser.newPage();

        // Block unnecessary requests to save memory
        await page.setRequestInterception(true);
        page.on("request", req => {
            if (["image", "stylesheet", "font"].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        const url = `https://www.paginegialle.it/ricerca/${name}/${state}%20(RM)/p-${pageNumber}`;
        console.log(`Visiting: ${url}`);

        try {
            await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
        } catch (err) {
            console.error(`Failed to load page ${pageNumber}:`, err.message);
            await page.close();
            break;
        }

        const listings = await page.$$(".search-itm.js-shiny-data-user");
        if (!listings.length) {
            await page.close();
            console.log("No more pages. Scraping complete.");
            break;
        }

        for (const profile of listings) {
            const businessName = await profile.$eval(".search-itm__rag.google_analytics_tracked", el => el.innerText.trim()).catch(() => null);
            const category = await profile.$eval(".search-itm__category", el => el.innerText.trim()).catch(() => null);
            const address = await profile.$eval(".search-itm__adr", el => el.innerText.trim()).catch(() => null);

            let phone = null;
            const phoneBtn = await profile.$(".bttn--yellow.bttn--lg-list");
            if (phoneBtn) {
                await phoneBtn.click().catch(() => null);
                await page.waitForTimeout(800);
                phone = await profile.$eval(".search-itm__ballonIcons", el => el.innerText.trim()).catch(() => null);
            }

            results.push({ businessName, category, address, phone });
        }

        await page.close(); // immediately free memory
        pageNumber++;
    }

    await browser.close();
    return results;
}

exports.scrape = async (req, res) => {
    try {
        const { name, state } = req.body;
        if (!name || !state) return res.status(400).send({ error: "Missing 'name' or 'state' parameter." });

        const data = await scrape(name, state);
        res.status(200).send({ data });
    } catch (error) {
        console.error("Scrape failed:", error);
        res.status(500).send({ error: error.message });
    }
};
