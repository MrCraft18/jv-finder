const puppeteer = require('puppeteer')

puppeteer.launch({
    headless: false,
    args: [
        `--disable-extensions-except=./extension`,
        `--load-extension=./extension`,
      ]
})
.then(async browser => {
    browser.newWindowPage = async () => {
        const blankPage = await browser.newPage()
        await blankPage.goto(`file://${__dirname}/extension/blank.html`)

        const id = new Date().getTime()

        await blankPage.evaluate(id => {
            const event = new CustomEvent('CustomEventForExtension', {detail: {url: `data:text/html,${id}`}});
            window.dispatchEvent(event)
        }, id)

        // await new Promise(res => setTimeout(res, 1000))

        await new Promise(resolve => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for new page.'));
            }, 20000); // Timeout after 20 seconds

            browser.on('targetcreated', async target => {
                const page = await target.page()
                if (page && page.url().includes(id)) {
                    resolve(page)
                    clearTimeout(timeout)
                }
            })
        })

        let pages = await browser.pages()
        const page = pages.find(page => page.url().includes(id))
        
        blankPage.close()

        return page
    }

    const page1 = await browser.newWindowPage()
    await page1.goto('https://facebook.com')

    const page2 = await browser.newWindowPage()
    await page2.goto('https://facebook.com')

    const page3 = await browser.newWindowPage()
    await page3.goto('https://facebook.com')

    // const page = await browser.newPage();
    // await page.goto(`file://${__dirname}/extension/blank.html`)

    // const url = 'data:text/html,1234'



    // pages.forEach(page => [
    //     console.log(page.url())
    // ])
})