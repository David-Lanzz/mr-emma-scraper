const puppeteer = require("puppeteer");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrape(name, state, type = "business") {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
            // ❌ removed "--single-process" (it crashes Chromium)
        ]
    });

    const results = [];
    let pageNumber = 1;

    while (true) {
        const page = await browser.newPage();

        // Block heavy resources
        await page.setRequestInterception(true);
        page.on("request", req => {
            if (["image", "stylesheet", "font"].includes(req.resourceType()))
                req.abort();
            else
                req.continue();
        });

        const url = `https://www.paginebianche.it/${
            type.toLowerCase() === "private" ? "persone" : "aziende"
        }?qs=${name}&dv=${state}%20(RM)&p=${pageNumber}`;

        console.log("Visiting:", url);

        await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

        // Correct selector for each listing
        const listings = await page.$$(".list-element.list-element--free");

        if (!listings.length) {
            await page.close();
            break;
        }

        for (const profile of listings) {

            // Business Name
            const businessNameEl = await profile.$(".list-element__title.ln-3.org.fn");
            const businessName = businessNameEl
                ? await businessNameEl.evaluate(el => el.innerText.trim())
                : null;

            // Address
            const addressEl = await profile.$(".list-element__address.adr");
            const address = addressEl
                ? await addressEl.evaluate(el => el.innerText.trim())
                : null;

            // Phone (usually inside a button label)
            const phoneEl = await profile.$(".btn__label.tel");
            const phone = phoneEl
                ? await phoneEl.evaluate(el => el.innerText.trim())
                : null;

            results.push({
                businessName,
                address,
                phone
            });
        }

        await page.close();
        pageNumber++;
    }

    await browser.close();
    return results;
}

exports.scrape = async (req, res) => {
    try {
        const { name, state, type } = req.body;
        if (!name || !state)
            return res.status(400).send({ error: "Missing 'name' or 'state' parameter." });

        const data = await scrape(name, state, type);
        res.status(200).send({ data });
    } catch (error) {
        console.error("Scrape failed:", error);
        res.status(500).send({ error: error.message });
    }
};
