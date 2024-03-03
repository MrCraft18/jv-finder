const puppeteer = require('puppeteer')

const fb = {
    login: (user, pass) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (!user) return reject('Missing Email/Phone Number Field')
                if (!pass) return reject('Missing Password Field')

                browser = await puppeteer.launch({
                    headless: 'new',
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
    getGroupPosts: (groupID, limit) => {
        return new Promise(async (resolve, reject) => {
            try {
                const page = await browser.newPage()
                await page.setViewport({ width: 1920, height: 1080 })

                await Promise.all([
                    page.goto(`https://www.facebook.com/groups/${groupID}?sorting_setting=CHRONOLOGICAL`),
                    page.waitForNavigation()
                ])

                const posts = []

                for (let i = 0; i < limit; i++) {
                    await page.waitForFunction(index => {
                        const elements = Array.from(document.querySelectorAll(`[role="feed"] > .x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z`))
                        return elements[index]
                    }, { polling: 'mutation' }, i)

                    const postElements = await page.$$(`[role="feed"] > .x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z`)
                    let postElement = postElements[i]

                    await postElement.hover()

                    const [text, images, name, id, link, timestamp] = await Promise.all([
                        new Promise(async resolve => {
                            //Click See More Button (if its there)
                            await postElement.evaluate(element => {
                                const seeMoreButtons = Array.from(element.querySelectorAll('div')).filter(element => element.innerText === 'See more' && !element.closest('.xzueoph'))
                                if (seeMoreButtons) seeMoreButtons.forEach(element => element.click())
                            })
                        
                            //Wait until all Text is loaded
                            await page.waitForFunction(index => {
                                const elements = Array.from(document.querySelectorAll(`[role="feed"] > .x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z`))
                                const postElement = elements[index]
                            
                                const seeMoreButton = Array.from(postElement.querySelectorAll('div')).find(element => element.innerText === 'See more' && !element.closest('.xzueoph'))
                                if (seeMoreButton) return false
                                if (!seeMoreButton) return true
                            }, { polling: 'mutation' }, i)

                            const text = await postElement.evaluate(element => {
                                const isShortVideo = Array.from(element.querySelectorAll('span'))
                                    .find(element => element.textContent.includes('Short Video'))
                                    ? true
                                    : false

                                if (isShortVideo) {
                                    const textElement = element.querySelector('.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs.x126k92a')
                                    return textElement ? textElement.innerText : null
                                } else {
                                    const textElement = Array.from(element.querySelectorAll('[class=""]'))
                                        .find(element => element.parentNode.children.length > 1)
                                        .nextElementSibling
                                        .nextElementSibling

                                    return textElement ? textElement.innerText : null
                                }
                            })

                            resolve(text)
                        }),
                        postElement.evaluate(element => {
                            return Array.from(element.querySelectorAll('img')).map(element => element.src).filter(url => url.includes('scontent'))
                        }),
                        postElement.evaluate(element => {
                            const nameElement = Array.from(element.querySelectorAll('a')).find(element => element.innerText && element.href.includes('user') && !element.closest('.xzueoph'))
                            return nameElement ? nameElement.innerText : null
                        }),
                        postElement.evaluate(element => {
                            const anchorElement = Array.from(element.querySelectorAll('a')).find(element => element.innerText && element.href.includes('user') && !element.closest('.xzueoph'))
                            return anchorElement ? anchorElement.href.split('/')[anchorElement.href.split('/').indexOf('user') + 1] : null
                        }),
                        postElement.evaluate(element => {
                            const anchorElement = Array.from(element.querySelectorAll('a')).find(element => element.innerText && element.href.includes('user') && !element.closest('.xzueoph'))
                            return anchorElement ? anchorElement.href : null
                        }),
                        new Promise(async resolve => {
                            const postTime = await postElement.$('.x4k7w5x.x1h91t0o.x1h9r5lt.x1jfb8zj.xv2umb2.x1beo9mf.xaigb6o.x12ejxvf.x3igimt.xarpa2k.xedcshv.x1lytzrv.x1t2pt76.x7ja8zs.x1qrby5j')
                            await postTime.evaluate(element => element.scrollIntoView({block: 'center'}))
                            await postTime.hover()

                            const dateElement = await page.waitForSelector('.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x10flsy6.x1nxh6w3.x1sibtaa.xo1l8bm.xzsf02u')

                            const rawStr = await dateElement.evaluate(element => element.innerText)

                            const strArr = rawStr.split(' ')
                            strArr.shift()
                            strArr.splice(strArr.indexOf('at'), 1)

                            const formattedStr = strArr.join(' ')

                            resolve(new Date(formattedStr))
                        })
                    ])

                    // console.log(name)

                    posts.push({
                        text,
                        images,
                        timestamp,
                        groupID,
                        author: {
                            name,
                            id,
                            link
                        }
                    })
                }

                resolve(posts)

                page.close()
            } catch (error) {
                reject(error)
            }
        })
    }
}

module.exports = fb



function extractDateFromPostElement(element) {
    const seeMoreButton = Array.from(element.querySelectorAll('div')).find(element => element.innerText === 'See more' && !element.closest('.xzueoph'))
    if (seeMoreButton) {
        seeMoreButton.click()
    }

    const isShortVideo = Array.from(element.querySelectorAll('span')).find(element => element.textContent.includes('Short Video')) ? true : false
    if (isShortVideo) {
        textElement = element.querySelector('xdj266r x11i5rnm xat24cr x1mh8g0r x1vvkbs x126k92a')
    } else {
        textElement = Array.from(element.querySelectorAll('[class=""]')).find(element => element.parentNode.children.length > 1).nextElementSibling.nextElementSibling
    }

    imagesArray = Array.from(element.querySelectorAll('img')).map(element => element.src).filter(url => url.includes('scontent'))

    authorElement = Array.from(element.querySelectorAll('a')).find(element => element.innerText && element.href.includes('user') && !element.closest('.xzueoph'))

    return {
        text: textElement.innerText,
        images: imagesArray,
        author: {
            name: authorElement ? authorElement.innerText : 'Annonomous Poster',
            id: authorElement ? authorElement.href.split('/')[authorElement.href.split('/').indexOf('user') + 1] : null,
            link: authorElement ? authorElement.href : null
        }
    }
}