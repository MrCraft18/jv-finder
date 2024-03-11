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
    getGroupPosts: async (groupID, { limit, dateRange, beforePost } = {}, callback = null) => {
        return new Promise(async (resolve, reject) => {
            if (!limit && !dateRange && !beforePost)  reject(new Error('Must Provide Limit, Date Range, or Before Post ID'))
            if (dateRange && !dateRange.end) reject(new Error('Must Provide at least "End" Date for Date Range'))

            if (dateRange && !dateRange.start) dateRange.start = new Date(0)

            page = await browser.newPage()
            await page.setViewport({ width: 1920, height: 1080 })

            await Promise.all([
                page.goto(`https://www.facebook.com/groups/${groupID}?sorting_setting=CHRONOLOGICAL`),
                page.waitForNavigation()
            ])

            groupName = await page.evaluate(() => {
                groupNameElement = document.querySelector('.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1heor9g.xt0b8zv.x1xlr1w8')

                return groupNameElement.innerText
            })

            try {
                const posts = []

                if (limit) {
                    for (let i = 0; posts.length < limit; i++) {
                        const post = await grabAndExtractPost(i)
    
                        if (post) {
                            if (callback) callback(post)
                            posts.push(post)
                        }
                    }
                } else if (dateRange) {
                    let lastPostDate = new Date(8640000000000000)

                    for (let i = 0; dateRange.end < lastPostDate; i++) {
                        const post = await grabAndExtractPost(i)

                        if (post) {

                            if (post.timestamp > dateRange.start && post.timestamp > dateRange.end) {
                                if (callback) callback(post)
                                posts.push(post)
                            }

                            lastPostDate = post.timestamp
                        }
                    }
                } else if (beforePost) {
                    for (let i = 0; true; i++) {
                        const post = await grabAndExtractPost(i)
    
                        if (post && post.id === beforePost) break
                        if (post) {
                            if (callback) callback(post)
                            posts.push(post)
                        }
                    }
                }

                resolve(posts)

                page.close()
            } catch (error) {
                reject(error)
            }
        })



        async function grabAndExtractPost(index) {
            await page.waitForFunction(index => {
                const elements = Array.from(document.querySelectorAll(`[role="feed"] > .x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z`))
                return elements[index]
            }, { polling: 'mutation' }, index)

            const postElements = await page.$$(`[role="feed"] > .x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z`)
            let postElement = postElements[index]

            await postElement.hover()
            
            const isShortVideo = await postElement.evaluate(element => {
                const shortVideoElement = Array.from(element.querySelectorAll('span'))
                    .find(element => element.innerText.includes('Short Video'))

                return shortVideoElement ? true : false
            })

            if (isShortVideo) {
                // console.log('Skipping Short Video')
                return undefined
            }

            const [text, images, authorName, authorID, timestamp, postID] = await Promise.all([
                //Get Post Text
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
                    }, { polling: 'mutation' }, index)

                    const text = await postElement.evaluate(element => {
                        const textElement = Array.from(element.querySelectorAll('[class=""]'))
                        .find(element => element.parentNode.children.length > 1)
                        .nextElementSibling
                        .nextElementSibling

                        return textElement ? textElement.innerText : null
                    })

                    resolve(text)
                }),
                //Get Post Images
                postElement.evaluate(element => {
                    return Array.from(element.querySelectorAll('img')).map(element => element.src).filter(url => url.includes('scontent'))
                }),
                //Get Author Name
                postElement.evaluate(element => {
                    const nameElement = Array.from(element.querySelectorAll('a')).find(element => element.innerText && element.href.includes('user') && !element.closest('.xzueoph'))
                    return nameElement ? nameElement.innerText : null
                }),
                //Get Author ID
                postElement.evaluate(element => {
                    const anchorElement = Array.from(element.querySelectorAll('a')).find(element => element.innerText && element.href.includes('user') && !element.closest('.xzueoph'))
                    return anchorElement ? anchorElement.href.split('/')[anchorElement.href.split('/').indexOf('user') + 1] : null
                }),
                //Get Timestamp
                new Promise(async resolve => {
                    const postTimeElement = await postElement.evaluateHandle(element => {
                        const postAnchorElement = Array.from(element.querySelectorAll('a'))
                            .find(element => element.href.includes('/posts'))

                        return postAnchorElement
                    })
                    
                    await postTimeElement.evaluate(element => element.scrollIntoView({block: 'center'}))
                    await postTimeElement.hover()

                    const dateElement = await page.waitForSelector('.xj5tmjb.x1r9drvm.x16aqbuh.x9rzwcf.xjkqk3g.xms15q0.x1lliihq.xo8ld3r.xjpr12u.xr9ek0c.x86nfjv.x1ye3gou.xn6708d.xz9dl7a.xsag5q8.x1n2onr6.x19991ni.__fb-dark-mode.x1hc1fzr.xhb22t3.xls3em1')

                    const rawStr = await dateElement.evaluate(element => element.innerText)

                    const strArr = rawStr.split(' ')
                    strArr.shift()
                    strArr.splice(strArr.indexOf('at'), 1)

                    const formattedStr = strArr.join(' ')

                    resolve(new Date(formattedStr))
                }),
                //Get Post Link
                postElement.evaluate(element => {
                    const postAnchorElement = Array.from(element.querySelectorAll('a'))
                        .find(element => element.href.includes('/posts'))

                    return postAnchorElement.href.split('/')[postAnchorElement.href.split('/').indexOf('posts') + 1]
                })
            ])

            // console.log(authorName)

            return {
                text,
                images,
                timestamp,
                id: postID,
                author: {
                    name: authorName,
                    id: authorID,
                },
                group: {
                    name: groupName,
                    id: groupID
                }
            }
        }
    }
}

module.exports = fb