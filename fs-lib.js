const puppeteer = require('puppeteer')

const fs = {
    login: (user, pass) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (!user) return reject('Missing Email/Phone Number Field')
                if (!pass) return reject('Missing Password Field')

                browser = await puppeteer.launch({
                    headless: false,
                    userDataDir: './browser'
                })

                const page = await browser.newPage()
                await page.setViewport({ width: 1920, height: 1080 })

                await Promise.all([
                    page.goto('https://www.facebook.com/'),
                    page.waitForNavigation()
                ])

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

                    resolve()

                    page.close()
                } else {
                    resolve()

                    page.close()
                }
            } catch (error) {
                reject(error)
            }
        })
    },
    getJoinedGroups: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const page = await browser.newPage()
                await page.setViewport({ width: 1920, height: 1080 })

                await Promise.all([
                    page.goto('https://www.facebook.com/groups/joins/?nav_source=tab'),
                    page.waitForNavigation()
                ])

                const groups = await page.evaluate(() => {
                    const span = Array.from(document.querySelectorAll('span'))
                    .find(element => element.innerText.includes("All groups you've joined"))

                    const bigParent = span.closest('.x9f619.x1gryazu.xkrivgy.x1ikqzku.x1h0ha7o.xg83lxy.xh8yej3')

                    const listParent = Array.from(bigParent.querySelectorAll('*'))
                    .find(element => element.matches('.x8gbvx8.x78zum5.x1q0g3np.x1a02dak.x1nhvcw1.x1rdy4ex.xcud41i.x4vbgl9.x139jcc6'))
                    
                    const anchorElements = Array.from(listParent.querySelectorAll('a.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1heor9g.xt0b8zv.x1s688f'))

                    groupObjects = anchorElements.map(element => ({
                        name: element.innerText,
                        id: element.href.split('/').at(-2),
                        link: element.href
                    }))

                    return groupObjects
                })

                resolve(groups)

                page.close()
            } catch (error) {
                reject(error)
            }
        })
    },
    getGroupPosts: (id, limit) => {
        return new Promise(async (resolve, reject) => {
            try {
                const page = await browser.newPage()
                await page.setViewport({ width: 1920, height: 1080 })

                await Promise.all([
                    page.goto(`https://www.facebook.com/groups/${id}?sorting_setting=CHRONOLOGICAL`),
                    page.waitForNavigation()
                ])

                for (let i = 0; i < limit; i++) {
                    postElements = await page.$$('[role="feed"] > *').filter()
                }

                // page.evaluate((limit) => {
                //     const extractPostData = element => {
                //         console.log(element)

                //         const textElement = element.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"]')
                //         if (textElement) {
                //             const seeMoreButton = Array.from(textElement.querySelectorAll('div')).find(element => element.innerText === 'See more')
                //             if (seeMoreButton) seeMoreButton.click()
                //         }

                //         const imageElements = Array.from(element.querySelectorAll('a')).filter(element => element.href.includes('photo'))

                //         return {
                //             text: textElement ? textElement.innerText : '',
                //             images: imageElements ? imageElements.map(element => element.querySelector('img').src) : '',
                //             author: {
                //                 name: Array.from(element.querySelectorAll('a')).find(element => element.hasAttribute('aria-label')).getAttribute('aria-label'),
                //                 id: Array.from(element.querySelectorAll('a')).find(element => element.href.includes('user')).href.split('/')[2],
                //                 link: Array.from(element.querySelectorAll('a')).find(element => element.href.includes('user')).href
                //             }
                //         }
                //     }

                //     const feedElement = document.querySelector('[role="feed"]')

                //     preloadedPosts = Array.from(feedElement.childNodes).filter(element => element.firstChild && element.firstChild.matches('.x1n2onr6.x1ja2u2z')).map(element => extractPostData(element))

                //     const postsElements = [...preloadedPosts]

                //     console.log(postsElements.length)

                //     if (postsElements.length >= limit) {
                //         return extractPostData(postsElements).slice(0, limit)
                //     } else {
                //         const observer = new MutationObserver((mutationList, observer) => {
                //             for (const mutation of mutationList) {
                //                 for (const addedElement of mutation.addedNodes) {
                //                     if (postsElements.length < limit) {
                //                         postsElements.push(extractPostData(addedElement))
                //                         window.scrollTo(0, document.body.scrollHeight)
                //                     } else {
                //                         observer.disconnect()
                //                         return postsElements
                //                     }
                //                 }
                //             }
                //             // setTimeout(() => {window.scrollTo(0, document.body.scrollHeight)}, 500)
                //         })
    
                //         observer.observe(feedElement, { childList: true })
                //         window.scrollTo(0, document.body.scrollHeight)
                //     }
                // }, limit)
                // .then(posts => {
                //     resolve(posts)
                // })
                // .catch(error => {
                //     console.log(error)
                // })
            } catch (error) {
                reject(error)
            }
        })
    }
}

module.exports = fs