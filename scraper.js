const puppeteer = require("puppeteer-core");


async function getBrowser() {

    // Local Windows — use full Puppeteer
    if (process.platform === "win32") {
        const puppeteer = require("puppeteer");
        return puppeteer.launch({ headless: true });
    }

    // Render Linux — use system-installed Chromium
    const puppeteer = require("puppeteer-core");
    return puppeteer.launch({
        headless: true,
        executablePath: "/usr/bin/chromium-browser",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-zygote",
            "--single-process"
        ]
    });
}



async function scrape(name, state) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    let pageNumber = 1;
    let results = [];

    while (true) {
        const url = `https://www.paginegialle.it/ricerca/${name}/${state}%20(RM)/p-${pageNumber}`;
        console.log(`Visiting: ${url}`);

        await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

        // Wait for listings or break if none exist
        const listingsExist = await page.$(".search-itm.js-shiny-data-user");
        if (!listingsExist) {
            console.log("No more pages left. Scraping complete.");
            break;
        }

        const pageResults = await page.evaluate(async () => {
            const data = [];
            const profiles = document.querySelectorAll(".search-itm.js-shiny-data-user");

            for (let profile of profiles) {
                const nameEl = profile.querySelector(".search-itm__rag.google_analytics_tracked");
                const categoryEl = profile.querySelector(".search-itm__category");
                const addressEl = profile.querySelector(".search-itm__adr");
                const phoneBtn = profile.querySelector(".bttn--yellow bttn--lg-list");

                let phoneNumber = null;

                // The phone number is hidden behind the button → simulate click retrieval
                if (phoneBtn) {
                    phoneBtn.click();
                }

                // We wait a bit to allow phone to reveal
                await new Promise(res => setTimeout(res, 1000));

                const revealedPhone = profile.querySelector(".search-itm__ballonIcons");
                if (revealedPhone) {
                    phoneNumber = revealedPhone.innerText.trim();
                }

                data.push({
                    businessName: nameEl?.innerText.trim() || null,
                    category: categoryEl?.innerText.trim() || null,
                    address: addressEl?.innerText.trim() || null,
                    phone: phoneNumber,
                });
            }

            return data;
        });

        console.log(`Page ${pageNumber} results:`, pageResults);
        results = results.concat(pageResults);

        pageNumber++;
    }

    await browser.close();

    console.log("\nFINAL SCRAPED RESULTS:");
    console.log(results);
    return results;
}

exports.scrape = (req, res) => {
    try {
        const { name, state } = req.body;
        if (!name || !state) {
            return res.status(400).send({ error: "Missing 'name' or 'state' parameter." });
        }

        scrape(name, state).then(data => {
            return res.status(200).send({ data });
        });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
}
