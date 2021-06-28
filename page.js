const puppeteer = require('puppeteer-core');

class Page {
    constructor(browserPage, screen) {
        this.browserPage = browserPage;
        this.screen = screen;
        this.sleeping = false;
        this.browserPage.on(
            'error',
            async (error) => await this._reloadOnError()
        );
    }

    async display() {
        const pageImage = await this.browserPage.screenshot({
            type: 'png',
            fullpage: 'true',
            encoding: 'binary',
        });

        if (this.sleeping) {
            this.screen.init();
            this.sleeping = false;
        } else if (this.handle) {
            clearTimeout(this.handle);
        }

        await this.screen.displayPNG(pageImage);
        this.handle = setTimeout(() => {
            this.screen.driver.sleep();
            this.sleeping = true;
        }, 60000);
    }

    async goto(url) {
        this.lastUrl = url;
        return await this.browserPage.goto(url);
    }

    onConsoleLog(callback) {
        this.browserPage.on('console', (msg) => callback(msg.text()));
    }

    async _reloadOnError() {
        if (this.lastUrl) {
            await this.goto(this.lastUrl);
        }
    }
}

async function getPage(screen) {
    const browser = await puppeteer.launch({
        executablePath: 'chromium-browser',
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--disable-web-security', 
            '--disable-features=IsolateOrigins', 
            ' --disable-site-isolation-trials',
            '--no-sandbox'
        ]
    });
    const browserPage = await browser.newPage();

    // Pass the User-Agent Test.
    const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';
    await browserPage.setUserAgent(userAgent);

    await browserPage.setViewport({
        width: screen.width,
        height: screen.height,
        deviceScaleFactor: 1,
    });
    
    // Pass the Webdriver Test.
    await browserPage.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        });
    });
    return new Page(browserPage, screen);
}

module.exports = getPage;
