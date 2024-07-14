import Facebook from 'facebook.js'
import Post from './schemas/post.js'
import Deal from './schemas/deal.js'
import cron from 'node-cron'
import axios from 'axios'
import { MongoClient, ObjectId } from 'mongodb'
import { configDotenv } from 'dotenv'; configDotenv()
import PodioApp from './podio-lib.js'

const databaseClient = new MongoClient(process.env.MONGODB_URI)
const groupsCollection = databaseClient.db('JVF').collection('groups')

const podioLeads = new PodioApp({
    app_id: process.env.PODIO_APP_ID,
    app_token: process.env.PODIO_APP_TOKEN,
    client_id: process.env.PODIO_CLIENT_ID,
    client_secret: process.env.PODIO_CLIENT_SECRET
})

let withinOperatingTime = false

const currentTime = new Date().toLocaleTimeString('en-US', {
    timeZone: 'America/Chicago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short'
})

const weekday = currentTime.split(' ')[0]
const [hour, minute] = currentTime.split(' ')[1].split(':').map(Number)

if ((hour > 8 || (hour === 8 && minute >= 30)) && (hour < 16 || (hour === 16 && minute <= 30))) {
    withinOperatingTime = true
    scrapePostsLoop()
} else {
    console.log('Sleeping')

    // withinOperatingTime = true
    // scrapePostsLoop()
}

async function scrapePostsLoop() {
    console.log('Starting Scraper Loop')

    const fb = await Facebook.login(process.env.FB_USER, process.env.FB_PASS, { headless: true, defaultRetries: 5 })

    const groups = await fb.getJoinedGroups()

    for (const group of groups) {
        await groupsCollection.findOneAndUpdate({ id: group.id }, { $set: {...group} }, { upsert: true })
    }

    let checkQueue = shuffleArray([...groups])

    while (withinOperatingTime) {
        const group = checkQueue.shift()

        try {
            const lastScrapedPost = await groupsCollection
                .findOne({ id: group.id }, { projection: { lastScrapedPost: 1, _id: 0 } })
                .then(response => response.lastScrapedPost)

            console.log('\n', JSON.stringify(group), new Date().toLocaleString())

            if (lastScrapedPost && differenceInHours(lastScrapedPost.createdAt, new Date()) < 24) {
                var endDate = lastScrapedPost.createdAt
            } else if (lastScrapedPost && differenceInHours(lastScrapedPost.createdAt, new Date()) > 24 || !lastScrapedPost) {
                var endDate = new Date(Date.now() - (1000 * 60 * 60 * 24))
            }

            const posts = await fb.getGroupPosts(group.id, { dateRange: { endAfter: endDate }, sorting: 'new' })

            for (const postObj of posts) {
                const post = new Post(postObj)

                const existingPostDocument = await Post.findOne({ id: post.id, 'group.id': post.group.id })

                if (existingPostDocument) continue

                if (!await post.checkIfDupilcate()) await post.getDeal()

                console.log(post.metadata.associatedDeal ? 'DEAL' : '', post.metadata.duplicateOf ? 'DUPLICATE' : '', { name: post.author.name, id: post.id }, post.group.name, new Date(post.createdAt).toLocaleString())

                await post.save()

                if (post.metadata.associatedDeal) {
                    console.log('yo')
                    const deal = await Deal.findOne({ _id: new ObjectId(post.metadata.associatedDeal) })

                    if (deal.category === 'SFH Deal' && (!deal.priceToARV || deal.priceToARV > 0.60)) {
                        console.log('Not good enough')
                        continue
                    }

                    const addressString = `${deal.address.streetNumber ? `${deal.address.streetNumber} ` : ''}${deal.address.streetName ? `${deal.address.streetName}, ` : ''}${deal.address.city ? `${deal.address.city}, ` : ''}${deal.address.state ? `${deal.address.state} `: ''}${deal.address.zip || ''}`

                    console.log('Before podio logic')

                    const itemObj = {
                        'title': addressString,
                        'address': deal.author,
                        'deal-category': deal.category,
                        'price': deal.price ? deal.price.toLocaleString('en-US') : 'N/A',
                        'arv': deal.category === 'SFH Deal' ? deal.arv.toLocaleString('en-US') : 'N/A',
                        'price-to-arv': deal.category === 'SFH Deal' ? `${Math.round(deal.priceToARV * 100)}%` : 'N/A',
                        'post-link': {
                            embed: await podioLeads.createEmbed({ url: `https://www.facebook.com/groups/${post.group.id}/posts/${post.id}/` }).then(embed => embed.embed_id)
                        },
                        'messenger-link': {
                            embed: await podioLeads.createEmbed({ url: `https://www.facebook.com/messages/t/${post.author.id}/` }).then(embed => embed.embed_id)
                        },
                        'images': await Promise.all(post.images.map(async imageURL => {
                            const imageName = imageURL.split('?')[0].split('/').at(-1)

                            return await podioLeads.uploadFile(await axios.get(imageURL, { responseType: 'stream' }).then(response => response.data), imageName)
                                .then(response => response.file_id)
                        })),
                        'category': 1
                    }

                    console.log(itemObj)

                    const itemID = await podioLeads.addItem(itemObj)

                    console.log(itemID)

                    console.log('create item')

                    // await podioLeads.createTask({
                    //     text: `Review New Lead: ${post.author.name}`,
                    //     responsible: [19756250, 76875578],
                    //     ref_type: 'item',
                    //     ref_id: itemID
                    // })

                    console.log('Created Task')
                }
            }

            if (posts.length > 0) {
                await groupsCollection.updateOne({ id: group.id }, { $set: { lastScrapedPost: posts[0] } })
            }
        } catch (error) {
            error.caught = "Moving on to check next group."

            console.log(error)
        } finally {
            if (checkQueue.length === 0) checkQueue = shuffleArray([...groups])

            await new Promise(resolve => setTimeout(resolve, 5000))
        }
    }

    //Extract emails from posts that are 3 days old and havent been marked already extracted
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const postsCursor = Post.find({ createdAt: { $lte: threeDaysAgo } }).cursor()

    for await (const post of postsCursor) {
        post.comments = await fb.getGroupPostComments(post.id, post.group.id)

        await post.extractEmails()
    }

    await fb.close()

    console.log('Sleeping')



    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function differenceInHours(date1, date2) {
        return Math.abs(date2 - date1) / (1000 * 60 * 60)
    }
}

cron.schedule('30 8 * * 1-7', () => {
    withinOperatingTime = true
    scrapePostsLoop()
}, { timezone: 'America/Chicago' })


cron.schedule('30 16 * * 1-7', () => {
    withinOperatingTime = false
}, { timezone: 'America/Chicago' })