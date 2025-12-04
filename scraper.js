const puppeteer = require("puppeteer");


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrape(name, state, type = 'business') {
    // Launch Puppeteer with the new headless mode
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--single-process"
        ]
    });

    const results = [];
    let pageNumber = 1;

    while (true) {
        const page = await browser.newPage();

        // Disable images/fonts to reduce memory
        await page.setRequestInterception(true);
        page.on("request", req => {
            if (["image", "stylesheet", "font"].includes(req.resourceType())) req.abort();
            else req.continue();
        });
        const url = `https://www.paginebianche.it/${type.toLowerCase() === 'private' ? 'persone' : 'aziende'}?qs=${name}&dv=${state}%20(RM)&p=${pageNumber}`;

        console.log(`Visiting: ${url}`);

        await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

        const listings = await page.$$(".search-itm.js-shiny-data-user");
        if (!listings.length) {
            await page.close();
            break;
        }

        for (const profile of listings) {
            const businessName = await profile.$eval(".search-itm__rag.google_analytics_tracked", el => el.innerText).catch(() => null);
            const category = await profile.$eval(".search-itm__category", el => el.innerText).catch(() => null);
            const address = await profile.$eval(".search-itm__adr", el => el.innerText).catch(() => null);

            let phone = null;
            const phoneBtn = await profile.$(".bttn--yellow.bttn--lg-list");
            if (phoneBtn) {
                await phoneBtn.click();
                // usage:
                await sleep(800);
                phone = await profile.$eval(".search-itm__ballonIcons", el => el.innerText).catch(() => null);
            }

            results.push({ businessName, category, address, phone });
        }

        await page.close(); // free memory immediately
        pageNumber++;
    }

    await browser.close();
    return results;
}

exports.scrape = async (req, res) => {
    try {
        const { name, state, type } = req.body;
        if (!name || !state) return res.status(400).send({ error: "Missing 'name' or 'state' parameter." });

        const data = await scrape(name, state, type);
        res.status(200).send({ data });
    } catch (error) {
        console.error("Scrape failed:", error);
        res.status(500).send({ error: error.message });
    }
};


