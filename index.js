const fb = require('./fb-lib')
const { MongoClient, ObjectId } = require('mongodb')
require('dotenv').config()

// const client = new MongoClient(process.env.MONGODB_URI)
// const leads = client.db('JV-FINDER').collection('leads')

fb.login(process.env.FB_USER, process.env.FB_PASS).catch(error => console.log(error))
.then(async () => {
    const groups = await fb.getJoinedGroups()

    const posts = await fb.getGroupPosts(groups[0].id, {beforePost: '1114031370023866'}, post => {
        console.log(post)
    })

    console.log(posts.length)
    
    //BEGIN LOOP
    // listenForNewPosts((post) => {
        
    // })
})


async function listenForNewPosts(groups, callback) {
    let checkQueue = shuffleArray([...groups])

    while (true) {
        const group = checkQueue.shift()

        //Logic to Grab last post from group
        const lastScrapedPost = 'a'

        const allPosts = await fb.getGroupPosts(group, { beforePost: lastScrapedPost }, post => {
            callback(post)
        })

        if (allPosts.length > 0) {
            //Update last scraped post id for group document
        }

        if (checkQueue.length === 0) checkQueue = shuffleArray([...groups])

        await new Promise(resolve => setTimeout(resolve, Math.random() * (120000 - 60000) + 60000))
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