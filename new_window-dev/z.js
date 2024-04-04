const puppeteer = require('puppeteer')

class Facebook {
    constructor(user, pass, browser, cookies) {
        this.user = user
        this.pass = pass
        this.browser = browser
        this.cookies = cookies
    }



    static login(user, pass) {
        return new Promise(async (resolve, reject) => {
            try {
                const browser = await puppeteer.launch({
                    headless: false,
                    userDataDir: './browser',
                    args: [
                        '--disable-notifications',
                      ]
                })
            
                const page = await browser.newPage()
                await page.setViewport({ width: 1920, height: 1080 })
            
                await Promise.all([
                    page.goto('https://www.facebook.com/'),
                    page.waitForNavigation()
                ])
            
                // await new Promise(res => setTimeout(res, 10000))
            
                const loginButton = await page.$('button')
            
                if (loginButton) {
                    const emailInput = await page.$('#email')
                    await emailInput.type(user)
            
                    const passInput = await page.$('#pass')
                    await passInput.type(pass)
            
                    await Promise.all([
                        loginButton.click(),
                        page.waitForNavigation()
                    ])
            
                    // await new Promise(res => setTimeout(res, 10000))
                }

                const cookies = await page.cookies()
            
                browser.close()
        
                resolve(new Facebook(user, pass, browser, cookies))
            } catch (error) {
                reject(error)
            }
        })
    }

    async openNewWindow() {
        try {
            const browser = await puppeteer.launch({
                headless: false,
                args: [
                    '--disable-notifications',
                  ]
            })

            const page = await browser.newPage()
            await page.setViewport({ width: 1920, height: 1080 })

            await page.setCookie(...this.cookies)
        
            await Promise.all([
                page.goto('https://www.facebook.com/'),
                page.waitForNavigation()
            ])
        } catch (error) {
            console.error(error)
        }
    }
}


Facebook.login()
.then(fb => {
    fb.openNewWindow()
    fb.openNewWindow()
    fb.openNewWindow()
})