const puppeteer = require("puppeteer-core");

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
            "--single-process" // reduces memory footprint
        ]
    });
}

async function scrape(name, state) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);

    page.on("request", req => {
        const type = req.resourceType();
        if (["image", "stylesheet", "font"].includes(type)) {
            req.abort();
        } else {
            req.continue();
        }
    });

    let pageNumber = 1;
    let results = [];

    while (true) {
        const url = `https://www.paginegialle.it/ricerca/${name}/${state}%20(RM)/p-${pageNumber}`;
        console.log(`Visiting: ${url}`);

        await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

        const listings = await page.$$(".search-itm.js-shiny-data-user");
        if (!listings.length) {
            console.log("No more pages left. Scraping complete.");
            break;
        }

        for (const profile of listings) {
            // Extract text safely
            const businessName = await profile.$eval(".search-itm__rag.google_analytics_tracked", el => el.innerText.trim()).catch(() => null);
            const category = await profile.$eval(".search-itm__category", el => el.innerText.trim()).catch(() => null);
            const address = await profile.$eval(".search-itm__adr", el => el.innerText.trim()).catch(() => null);

            let phone = null;
            const phoneBtn = await profile.$(".bttn--yellow.bttn--lg-list");
            if (phoneBtn) {
                await phoneBtn.click();
                await page.waitForTimeout(800); // wait for phone to reveal
                phone = await profile.$eval(".search-itm__ballonIcons", el => el.innerText.trim()).catch(() => null);
            }

            results.push({ businessName, category, address, phone });
        }

        // Free memory between pages
        await page.evaluate(() => { document.body.innerHTML = ""; });

        await page.waitForTimeout(300); // slight delay
        pageNumber++;
    }

    await browser.close();
    return results;
}

exports.scrape = (req, res) => {
    try {
        const { name, state } = req.body;
        if (!name || !state) {
            return res.status(400).send({ error: "Missing 'name' or 'state' parameter." });
        }

        scrape(name, state)
            .then(data => res.status(200).send({ data }))
            .catch(err => res.status(500).send({ error: err.message }));
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
};
