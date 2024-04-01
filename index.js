const Facebook = require('./fb-lib')
const gpt = require('./gpt-lib.js')
const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs')
require('dotenv').config()


const client = new MongoClient(process.env.MONGODB_URI)
const leadsCollection = client.db('JV-FINDER').collection('leads')
const groupsCollection = client.db('JV-FINDER').collection('groups')



Facebook.login(process.env.FB_USER, process.env.FB_PASS).catch(error => console.log(error))
.then(async fb => {
    // const groups = await fb.getJoinedGroups()

    // const databaseGroups = await groupsCollection
    //     .find({}, { projection: { _id: 0 } })
    //     .toArray()

    // for (const group of groups) {
    //     if (!databaseGroups.find(databaseGroup => databaseGroup.id === group.id)) {
    //         groupsCollection.insertOne(group)
    //     }
    // }

    const groups = [{
        name: 'Bruh',
        id: '1345361228867056'
    }]
    
    //BEGIN LOOP
    listenForNewPosts(groups, async (post) => {
        // console.log(post)
        // console.log(keywordFilter(post))
        if (!keywordFilter(post)) return
        if (await isDuplicatePost(post)) return
        if (keywordFilter(post) === 'maybe') {
            if (!await gpt.postLogic('isPostVacantLandDeal', post).then(response => response.result)) return
        }

        //POST IS A VACANT LAND DEAL

        //Make Lead Object
        const lead = {
            stage: 0,
            post,
            conversation: {
                type: 'messenger',
                messages: []
            }
        }

        //Mark Post Document as stage 0 and add to leads collection

        if (await gpt.postLogic('isPriceUnder10k', post).then(response => response.result)) return
        //Maybe add to database with dropped stage and dropped reason is price under 10k before asking for details

        //Send message to post author asking for details on the post(s)

        console.log(post)
        // console.log(keywordFilter(post))
    })
})


async function listenForNewPosts(groups, callback) {
    let checkQueue = shuffleArray([...groups])

    while (true) {
        const group = checkQueue.shift()

        //Logic to Grab last post from group
        const lastScrapedPost = await groupsCollection
            .findOne({ id: group.id }, { projection: { lastScrapedPost: 1,  _id: 0 } })
            .then(response => response.lastScrapedPost)

        console.log(group.name)

        // if (!lastScrapedPost) {
        //     console.log('Grabbing Posts 1 Day Back')
        // } else {
        //     console.log('Grabbing until last scraped post')
        // }

        const allPosts = !lastScrapedPost ?
            await fb.getGroupPosts(group.id, { dateRange: { end: new Date(Date.now() - (1000 * 60 * 60 * 24)) } }, post => {
                callback(post)
            })
            :
            await fb.getGroupPosts(group.id, { beforePost: lastScrapedPost }, post => {
                callback(post)
            })

        // if (allPosts.length > 0) {
        //     await groupsCollection.updateOne({ id: group.id }, { $set: { lastScrapedPost: allPosts[0].id } })
        // }

        if (checkQueue.length === 0) checkQueue = shuffleArray([...groups])

        await new Promise(resolve => setTimeout(resolve, 30000))

        // await new Promise(resolve => setTimeout(resolve, Math.random() * (120000 - 60000) + 60000))
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            // Generate a random index from 0 to i
            const j = Math.floor(Math.random() * (i + 1));
            // Swap elements at indices i and j
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}



const keywords = {
    positive: fs.readFileSync('./keywords/positive.txt', 'utf-8').toLowerCase().split('\n'),
    negative: fs.readFileSync('./keywords/negative.txt', 'utf-8').toLowerCase().split('\n'),
    maybeNegative: fs.readFileSync('./keywords/maybe-negative.txt', 'utf-8').toLowerCase().split('\n'),
    maybePostive: fs.readFileSync('./keywords/maybe-positive.txt', 'utf-8').toLowerCase().split('\n'),
    cities: fs.readFileSync('./keywords/cities.txt', 'utf-8').toLowerCase().split('\n')
}

function keywordFilter(post) {
    const includesSomePositive = keywords.positive.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
    const includesNoNegative = keywords.negative.every(word => !post.text.toLowerCase().includes(word))
    const includesSomeMaybeNegative = keywords.maybeNegative.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
    const includesSomeMaybePositive = keywords.maybePostive.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
    const includesOneCity = keywords.cities.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
    
    if (includesSomePositive && includesNoNegative && !includesSomeMaybeNegative && includesOneCity) {
        return true
    } else if (includesSomePositive && includesNoNegative && includesSomeMaybeNegative && includesOneCity || !includesSomePositive && includesNoNegative && includesSomeMaybePositive && includesOneCity) {
        return 'maybe'
    } else {
        return false
    }
}



async function isDuplicatePost(post) {
    const authorPostsCursor = leadsCollection.find({
        'post.author.id': post.author.id
    })

    function normalizeString(str) {
        return str.toLowerCase().trim().replace(/[^\w\s]|_/g, "");
    }

    for await (const previousPost of authorPostsCursor) {
        if (normalizeString(previousPost.text) === normalizeString(post.text)) {
            return true
        }
    }

    return false
}