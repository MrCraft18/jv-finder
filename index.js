const fb = require('./fb-lib')
const { MongoClient, ObjectId } = require('mongodb')
require('dotenv').config()

const client = new MongoClient(process.env.MONGODB_URI)
const leadsCollection = client.db('JV-FINDER').collection('leads')
const groupsCollection = client.db('JV-FINDER').collection('groups')

fb.login(process.env.FB_USER, process.env.FB_PASS).catch(error => console.log(error))
.then(async () => {
    const groups = await fb.getJoinedGroups()

    const databaseGroups = await groupsCollection
        .find({}, { projection: { _id: 0 } })
        .toArray()

    for (const group of groups) {
        if (!databaseGroups.find(databaseGroup => databaseGroup.id === group.id)) {
            groupsCollection.insertOne(group)
        }
    }
    
    //BEGIN LOOP
    listenForNewPosts(groups, (post) => {
        console.log(post)

        //BEGIN THE BIG LOGIC
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

        if (!lastScrapedPost) {
            console.log('Grabbing Posts 1 Day Back')
        } else {
            console.log('Grabbing until last scraped post')
        }

        const allPosts = !lastScrapedPost ?
            await fb.getGroupPosts(group.id, { dateRange: { end: new Date(Date.now() - (1000 * 60 * 60 * 24)) } }, post => {
                callback(post)
            })
            :
            await fb.getGroupPosts(group.id, { beforePost: lastScrapedPost }, post => {
                callback(post)
            })

        if (allPosts.length > 0) {
            await groupsCollection.updateOne({ id: group.id }, { $set: { lastScrapedPost: allPosts[0].id } })
        }

        if (checkQueue.length === 0) checkQueue = shuffleArray([...groups])

        await new Promise(resolve => setTimeout(resolve, 30000))

        // await new Promise(resolve => setTimeout(resolve, Math.random() * (120000 - 60000) + 60000))
    }
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