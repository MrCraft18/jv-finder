import Facebook from 'facebook.js'
import PodioApp from './podio-lib.js'
import { MongoClient, ObjectId } from 'mongodb'
import gpt from './gpt-lib.js'
import fs from 'fs'
import axios from 'axios'
import { config } from 'dotenv'
config()


const client = new MongoClient(process.env.MONGODB_URI)
const leadsCollection = client.db('JV-FINDER').collection('leads')
const groupsCollection = client.db('JV-FINDER').collection('groups')

const emailsCollection = client.db('EMAIL-FINDER').collection('emails')



const podioLeads = new PodioApp({
    app_id: process.env.PODIO_APP_ID,
    app_token: process.env.PODIO_APP_TOKEN,
    client_id: process.env.PODIO_CLIENT_ID,
    client_secret: process.env.PODIO_CLIENT_SECRET
})

async function main() {
    try {
        const fb = await Facebook.login(process.env.FB_USER, process.env.FB_PASS, {headless: true})

        const groups = await fb.getJoinedGroups()
    
        const databaseGroups = await groupsCollection
            .find({}, { projection: { _id: 0 } })
            .toArray()
    
        for (const group of groups) {
            if (!databaseGroups.find(databaseGroup => databaseGroup.id === group.id)) {
                groupsCollection.insertOne(group)
            }
        }
    
        // const groups = [{
        //     name: 'Bruh',
        //     id: 'dfwflips'
        // }]

        console.log('It Begins')
        
        //BEGIN LOOP
        listenForNewPosts(groups, async (post) => {
            console.log(post.author, post.group.name, new Date(post.timestamp).toLocaleString())

            //EMAILS STUFF

            const uniqueEmailsMap = new Map()

            if (post.text) extractEmails(post.text).forEach(email => uniqueEmailsMap.set(email, post))

            if (post.attachedPost?.text) extractEmails(post.attachedPost.text).forEach(email => uniqueEmailsMap.set(email, post))

            if (post.comments) {
                post.comments.forEach(comment => {
                    extractEmails(comment.text).forEach(email => uniqueEmailsMap.set(email, post))

                    processReplies(comment.replies)

                    function processReplies(replies) {
                        replies.forEach(reply => {
                            extractEmails(reply.text).forEach(email => uniqueEmailsMap.set(email, post))

                            processReplies(reply.replies)
                        })
                    }
                })
            }

            const emailsData = Array.from(uniqueEmailsMap, ([email, post]) => ({ email, post, sold: false }))

            await addEmailsToDatabase(emailsData)




            if (!keywordFilter(post)) return
            if (await isDuplicatePost(post)) return
            if (keywordFilter(post) === 'maybe') {
                if (!await gpt.posts('isPostVacantLandDeal', post).then(response => response.result)) return
            }

            // if (post.author.name.toLowerCase() === 'kelli epperson') {
            //     console.log('BLACKLISTED AUTHOR')
            //     return
            // }

            // POST IS A NON-DUPLICATE VACANT LAND DEAL

            // const openingMessage = await gpt.posts('generateOpeningMessage', post).then(response => response.result)

            // await fb.sendMessage(openingMessage, post.author.id)

            // await fb.groupPostComment('DM Sent', post.group.id, post.id)

            const itemID = await podioLeads.addItem({
                'title': post.author.name,
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
            })

            await podioLeads.createTask({
                text: `Review New Lead: ${post.author.name}`,
                responsible: 19756250,
                ref_type: 'item',
                ref_id: itemID
            })

            await leadsCollection.insertOne(post)

            console.log('Got One: ', { author: post.author.name, text: post.text })
        })


















        async function listenForNewPosts(groups, callback) {
            let checkQueue = shuffleArray([...groups])
        
            while (true) {
                const group = checkQueue.shift()

                //Logic to Grab last post from group
                const lastScrapedPost = await groupsCollection
                .findOne({ id: group.id }, { projection: { lastScrapedPost: 1,  _id: 0 } })
                .then(response => response.lastScrapedPost)
    
                console.log('\n' + JSON.stringify(group), new Date().toLocaleString())

                try {
                    let endDate

                    if (lastScrapedPost && differenceInHours(lastScrapedPost.timestamp, new Date()) < 24) {
                        endDate = lastScrapedPost.timestamp
                    } else if (lastScrapedPost && differenceInHours(lastScrapedPost.timestamp, new Date()) > 24 || !lastScrapedPost) {
                        endDate = new Date(Date.now() - (1000 * 60 * 60 * 24))
                    }

                    const allPosts = await fb.getGroupPosts(group.id, { dateRange: { endAfter: endDate }, sorting: 'new', getComments: true }, post => {
                        callback(post)
                    })

                    console.log('after getGroupPosts function')
            
                    if (checkQueue.length === 0) checkQueue = shuffleArray([...groups])
            
                    await new Promise(resolve => setTimeout(resolve, 5000))
        
                    if (allPosts.length > 0) {
                        await groupsCollection.updateOne({ id: group.id }, { $set: { lastScrapedPost: allPosts[0] } })
                    }
                } catch (error) {
                    if (checkQueue.length === 0) checkQueue = shuffleArray([...groups])
                    console.error(error)
                }
            }
        
            function shuffleArray(array) {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            }
        
            function differenceInHours(date1, date2) {
                return Math.abs(date2 - date1) / (1000 * 60 * 60);
            }
        }
    } catch (error) {
        console.error(error)
    }
}
main()



const keywords = {
    positive: fs.readFileSync('./keywords/positive.txt', 'utf-8').toLowerCase().split('\n'),
    negative: fs.readFileSync('./keywords/negative.txt', 'utf-8').toLowerCase().split('\n'),
    maybeNegative: fs.readFileSync('./keywords/maybe-negative.txt', 'utf-8').toLowerCase().split('\n'),
    maybePostive: fs.readFileSync('./keywords/maybe-positive.txt', 'utf-8').toLowerCase().split('\n'),
    cities: fs.readFileSync('./keywords/cities.txt', 'utf-8').split('\n')
}

function keywordFilter(post) {
    if (!post.text) return false

    const includesSomePositive = keywords.positive.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
    const includesNoNegative = keywords.negative.every(word => !post.text.toLowerCase().includes(word))
    const includesSomeMaybeNegative = keywords.maybeNegative.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
    const includesSomeMaybePositive = keywords.maybePostive.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
    const includesOneCity = keywords.cities.some(word => new RegExp(`\\b${word}\\b`).test(post.text))
    
    if (includesSomePositive && includesNoNegative && !includesSomeMaybeNegative && includesOneCity) {
        return true
    } else if (includesSomePositive && includesNoNegative && includesSomeMaybeNegative && includesOneCity || !includesSomePositive && includesNoNegative && includesSomeMaybePositive && includesOneCity) {
        return 'maybe'
    } else {
        return false
    }
}



async function isDuplicatePost(post) {
    // const authorPostsCursor = leadsCollection.find({
    //     'post.author.id': post.author.id
    // })

    const authorPostsCursor = leadsCollection.find({
        'author.id': post.author.id
    })

    function normalizeString(str) {
        return str.toLowerCase().trim().replaceAll(' ', '').replaceAll('\n', '')
    }

    for await (const previousPost of authorPostsCursor) {
        if (normalizeString(previousPost.text) === normalizeString(post.text)) {
            return true
        }
    }

    return false
}



function extractEmails(string) {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g

    if (string) {
        return string.toLowerCase().match(emailPattern) ? string.toLowerCase().match(emailPattern) : []
    } else {
        return []
    }
}

async function addEmailsToDatabase(emailDataArr) {
    for (const emailData of emailDataArr) {
        const existingEmailQuery = await emailsCollection.findOne({email: emailData.email})

        if (!existingEmailQuery) {
            await emailsCollection.insertOne(emailData)
            console.log('Added Email:', emailData.email)
        } else {
            console.log('Email', emailData.email, 'Already Exists!!!')
        }
    }
}