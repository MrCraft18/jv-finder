const puppeteer = require('puppeteer')

class Facebook {
    constructor(user, pass, browser) {
        this.user = user
        this.pass = pass
        this.browser = browser
    }



    static login(user, pass) {
        return new Promise(async (resolve, reject) => {
            try {
                const browser = await puppeteer.launch({
                    headless: true,
                    userDataDir: './browser',
                    args: [
                        '--disable-notifications',
                        `--disable-extensions-except=./extension`,
                        `--load-extension=./extension`
                    ]
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
                }
            
                page.close()
        
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

                resolve(new Facebook(user, pass, browser))
            } catch (error) {
                reject(error)
            }
        })
    }



    async getJoinedGroups() {
        return new Promise(async (resolve, reject) => {
            try {
                const page = await this.browser.newWindowPage()
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
    }



    async getGroupPosts(groupID, { limit, dateRange, beforePost } = {}, callback = null) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!limit && !dateRange && !beforePost)  reject(new Error('Must Provide Limit, Date Range, or Before Post ID'))
                if (dateRange && !dateRange.end) reject(new Error('Must Provide at least "End" Date for Date Range'))
    
                if (dateRange && !dateRange.start) dateRange.start = new Date(0)
    
                const page = await this.browser.newWindowPage()
                await page.setViewport({ width: 1920, height: 1080 })
    
                await Promise.all([
                    page.goto(`https://www.facebook.com/groups/${groupID}?sorting_setting=CHRONOLOGICAL`),
                    page.waitForNavigation()
                ])
    
                const groupName = await page.evaluate(() => {
                    groupNameElement = document.querySelector('.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1heor9g.xt0b8zv.x1xlr1w8')
    
                    return groupNameElement.innerText
                })
    
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
    
    
    
                async function grabAndExtractPost(index) {
                    await page.waitForFunction(index => {
                        const elements = Array.from(document.querySelectorAll(`[role="feed"] > .x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z`))
                        return elements[index]
                    }, { polling: 'mutation' }, index)
        
                    const postElements = await page.$$(`[role="feed"] > .x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z`)
                    let postElement = postElements[index]

                    const stupidity = await postElement.$('a[href="#"]')
                    if (stupidity) {
                        await stupidity.hover()
                    }

                    let fuckFacebook = true
                    while (fuckFacebook) {
                        if (await postElement.$('a[href*="posts"]')) {
                            fuckFacebook = false
                        }
                    }
                    
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
        
                                const listingElement = element.querySelector('.x1i10hfl.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x87ps6o.x1a2a7pz.x6s0dn4.xmjcpbm.x1exxf4d.x1y71gwh.x1nb4dca.xu1343h.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.xso031l.xm0m39n.x9f619.x78zum5.x1q0g3np.x1nhvcw1.x1wxaq2x.xsag5q8.x1pi30zi.x1swvt13.x1n2onr6.x1lku1pv')
                                if (listingElement) {
                                    return textElement ? textElement.innerText.replace(listingElement.innerText, '') : null
                                } else {
                                    return textElement ? textElement.innerText : null
                                }
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
            } catch (error) {
                reject(error)
            }
        })
    }



    async onMessage(callback) {
        //Listen for New Messages Process
        const listenerPage = await this.browser.newWindowPage()
        await listenerPage.setViewport({ width: 1920, height: 1080 })
        await Promise.all([
            listenerPage.goto('https://www.facebook.com/messages/t/000'),
            listenerPage.waitForNavigation({ waitUntil: 'networkidle0' })
        ])
    
        await listenerPage.exposeFunction('newMessage', async data => {
            try {
                listenerPage.bringToFront()

                if (data.message) {
                    data.timestamp = new Date(data.timestamp)

                    callback(data)
                }

                const conversationAnchorElement = await listenerPage.$(`a[href*="${data.contact.id}"]`)
                await conversationAnchorElement.hover()
    
                const menuButton = await listenerPage.waitForSelector('.x1i10hfl.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x16tdsg8.x1hl2dhg.xggy1nq.x87ps6o.x1lku1pv.x1a2a7pz.x6s0dn4.x14yjl9h.xudhj91.x18nykt9.xww2gxu.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x78zum5.xl56j7k.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.xc9qbxq.x14qfxbe.x9bbmet.x10f5nwc.xi81zsa')
                await menuButton.click()
    
                await listenerPage.waitForFunction(() => {
                    return Array.from(document.querySelectorAll('div')).find(element => element.innerText === 'Delete chat')
                })
    
                const deleteButtonOption = await listenerPage.evaluateHandle(() => {
                    return Array.from(document.querySelectorAll('div')).find(element => element.innerText === 'Delete chat')
                })
                await deleteButtonOption.click()
    
                const deleteButton = await listenerPage.waitForSelector('[aria-label="Delete chat"].x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdt5ytf.xl56j7k.x1n2onr6.xh8yej3')
                await deleteButton.click()
            } catch (error) {
                console.error(error)
            }
        })
    
        await listenerPage.waitForSelector('[aria-label="Thread list"]')
    
        await listenerPage.evaluate(() => {
            observer = new MutationObserver((mutationsList) => {
                for(const mutation of mutationsList) {
                    if (mutation.addedNodes.length > 0 && mutation.target.className === "x1n2onr6") {
                        console.log(mutation)
                        const text = mutation.target.querySelector('span.html-span.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x18d9i69.xkhd6sd.x1hl2dhg.x16tdsg8.x1vvkbs.x6s0dn4.x9f619.x78zum5.x193iq5w.xeuugli.xg83lxy').innerText

                        if (!text.startsWith('You: ')) {
                            messageObj = {
                                message: text,
                                contact: {
                                    id: mutation.target.querySelector('a').href.split('/')[mutation.target.querySelector('a').href.split('/').length - 2],
                                    name: mutation.target.querySelector('.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x10flsy6.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x4zkp8e.x41vudc.x6prxxf.xvq8zen.xzsf02u.x1yc453h').innerText
                                },
                                timestamp: new Date()
                            }
        
                            console.log(messageObj)
                            window.newMessage(messageObj)
                        } else {
                            window.newMessage({contact: {id: mutation.target.querySelector('a').href.split('/')[mutation.target.querySelector('a').href.split('/').length - 2]}})
                        }
                    }
                }
            })
    
            targetElement = Array.from(document.querySelector('[aria-label="Thread list"]').querySelectorAll('div')).find(element => element.className === 'x1n2onr6')
    
            config = {
                childList: true,
            }
    
            observer.observe(targetElement, config)
        })

        //Check for Missed Messages process
        const missedMessagesPage = await this.browser.newWindowPage()
        await missedMessagesPage.setViewport({ width: 1920, height: 1080 })
        await Promise.all([
            missedMessagesPage.goto('https://www.facebook.com/messages/t/000'),
            missedMessagesPage.waitForNavigation({ waitUntil: 'networkidle0' })
        ])
        
        try {
            const conversationsIDs = await missedMessagesPage.evaluate(() => {
                const threadListElement = Array.from(document.querySelector('[aria-label="Thread list"]').querySelectorAll('div')).find(element => element.className === 'x1n2onr6')
    
                const conversationElements = Array.from(threadListElement.childNodes).filter(element => element.className === "x78zum5 xdt5ytf")
    
                const conversationsIDs = conversationElements.map(element => element.querySelector('a').href.split('/')[element.querySelector('a').href.split('/').length - 2])
    
                return conversationsIDs
            })
    
            for (const id of conversationsIDs) {
                const conversationAnchorElement = await missedMessagesPage.$(`a[href*="${id}"]`)
    
                await Promise.all([
                    conversationAnchorElement.click(),
                    missedMessagesPage.waitForNavigation({ waitUntil: 'networkidle0' })
                ])

                await new Promise(res => setTimeout(res, 1000))
    
                const missedMessagesAmount = await missedMessagesPage.evaluate(() => {
                    return Array.from(document.querySelectorAll('div')).filter(element => element.className === 'x78zum5 x1iyjqo2 xs83m0k xeuugli').length
                })

                //REWRITE THIS TO NOT ONLY GRAB LIMITED NUMBER OF MESSAGES AND INSTEAD LOOP UNTIL ALL ARE GONE
    
                for (let i = 0; i < missedMessagesAmount; i++) {
                    await new Promise(res => setTimeout(res, 1000))

                    const missedMessageElement = await missedMessagesPage.evaluateHandle(index => {
                        return Array.from(document.querySelectorAll('div')).filter(element => element.className === 'x78zum5 x1iyjqo2 xs83m0k xeuugli')[index].firstChild
                    }, i)
    
                    await missedMessageElement.hover()
    
                    const timestampElement = await missedMessagesPage.waitForSelector('.xu96u03.xm80bdy.x10l6tqk.x13vifvy.x47corl')
    
                    const missedMessage = {
                        message: await missedMessageElement.evaluate(element => element.innerText),
                        contact: {
                            id,
                            name: await conversationAnchorElement.evaluate(element => element.querySelector('.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x10flsy6.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x4zkp8e.x41vudc.x6prxxf.xvq8zen.xzsf02u.x1yc453h').innerText)
                        },
                        timestamp: parseDateString(await timestampElement.evaluate(element => element.innerText))
                    }
    
                    callback(missedMessage)
                }
    
                await conversationAnchorElement.hover()
    
                const menuButton = await missedMessagesPage.waitForSelector('.x1i10hfl.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x16tdsg8.x1hl2dhg.xggy1nq.x87ps6o.x1lku1pv.x1a2a7pz.x6s0dn4.x14yjl9h.xudhj91.x18nykt9.xww2gxu.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x78zum5.xl56j7k.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.xc9qbxq.x14qfxbe.x9bbmet.x10f5nwc.xi81zsa')
                await menuButton.click()
    
                await missedMessagesPage.waitForFunction(() => {
                    return Array.from(document.querySelectorAll('div')).find(element => element.innerText === 'Delete chat')
                })
    
                const deleteButtonOption = await missedMessagesPage.evaluateHandle(() => {
                    return Array.from(document.querySelectorAll('div')).find(element => element.innerText === 'Delete chat')
                })
                await deleteButtonOption.click()

                
    
                const deleteButton = await missedMessagesPage.waitForSelector('[aria-label="Delete chat"].x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdt5ytf.xl56j7k.x1n2onr6.xh8yej3')
                await deleteButton.click()
            }

            await new Promise(res => setTimeout(res, 5000))

            await missedMessagesPage.close()
        } catch (error) {
            console.error(error)
        }
    }



    async sendMessage(message, recipientID) {
        return new Promise(async (resolve, reject) => {
            try {
                const page = await this.browser.newWindowPage()
                await page.setViewport({ width: 1920, height: 800 })
                await Promise.all([
                    page.goto(`https://www.facebook.com/messages/t/${recipientID}`),
                    page.waitForNavigation({ waitUntil: 'networkidle0' })
                ])
        
                const inputElement = await page.waitForSelector('p')
                await inputElement.type(message)

                resolve()
            } catch (error) {
                reject(error)
            }
        })
    }
}

module.exports = Facebook









const parseDateString = (input) => {
    const now = new Date()
    let date = new Date(now)
  
    let fullDateMatch = input.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s(\d{1,2}),\s(\d{4}),\s(\d{1,2}):(\d{2})\s(AM|PM)$/)
    if (fullDateMatch) {
        date = new Date(`${fullDateMatch[1]} ${fullDateMatch[2]}, ${fullDateMatch[3]} ${fullDateMatch[4]}:${fullDateMatch[5]}:00 ${fullDateMatch[6]}`)
        return date
    }
  
    let dayTimeMatch = input.match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s(\d{1,2}):(\d{2})(am|pm)$/i)
    if (dayTimeMatch) {
        let dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayTimeMatch[1])
        let targetHours = parseInt(dayTimeMatch[2], 10) + (dayTimeMatch[4].toLowerCase() === 'pm' && dayTimeMatch[2] !== '12' ? 12 : 0)
        if (dayTimeMatch[4].toLowerCase() === 'am' && dayTimeMatch[2] === '12') targetHours = 0
        date.setHours(targetHours, parseInt(dayTimeMatch[3], 10), 0, 0)
        while (date.getDay() !== dayOfWeek || date > now) {
            date.setDate(date.getDate() - 1)
        }
        return date
    }
  
    let timeMatch = input.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/)
    if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10) + (timeMatch[3] === 'PM' && timeMatch[1] !== '12' ? 12 : 0)
        if (timeMatch[3] === 'AM' && timeMatch[1] === '12') hours = 0
        date.setHours(hours, parseInt(timeMatch[2], 10), 0, 0)
        if (date < now) {
            date.setDate(now.getDate() + 1)
        }
        return date
    }
  
    throw new Error('Unrecognized date format')
}