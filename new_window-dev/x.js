const puppeteer = require('puppeteer')

puppeteer.launch({
    headless: false,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ]
})
.then(async browser => {
    const page = await browser.newPage()

    await page.evaluate(() => {
        window.open('about:1', '_blank', 'popup');
    })

    await new Promise(res => setTimeout(res, 1000))

    const pages = await browser.pages()
    const newPage = pages.find(page => page.url().endsWith('1'))

    pages.forEach(page => {
        console.log(page.url())
    })

    await newPage.goto('http://youtube.com')
})