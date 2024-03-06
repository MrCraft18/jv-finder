const fb = require('./fb-lib')
const { MongoClient, ObjectId } = require('mongodb')
require('dotenv').config()

// const client = new MongoClient(process.env.MONGODB_URI)
// const leads = client.db('JV-FINDER').collection('leads')

fb.login(process.env.FB_USER, process.env.FB_PASS).catch(error => console.log(error))
.then(async () => {
    const groups = await fb.getJoinedGroups()

    const posts = await fb.getGroupPosts(groups[0].id, {limit: 30})

    console.log(posts)
    
    //BEGIN LOOP
    // listenForNewPosts((post) => {
        
    // })
})


function listenForNewPosts(groups, callback) {
    //Grab posts function

    loopFunction()

    async function loopFunction() {
        while (true) {
            const posts = await grabPosts(); // Fetch new posts
            if (posts.length > 0) {
                callback(posts); // Callback with new posts
            }
            // Wait for a random time before checking again
            const delay = getRandomDelay();
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }

    async function fetchNewPosts(group) {
        let lastLeadTImestamp = await leads
        .findOne({}, { 
            projection: { 'post.timestamp': 1, _id: 0 },
            sort: { 'post.timestamp': -1 }
        })
        //If response is valid return timestamp
        //If response  is null return a date 8 hours before current date
        .then(response => response ? response.post.timestamp : new Date(Date.now() - (1000 * 60 * 60 * 8)))

        shuffleArray(groups)

        for (const group of groups) {
            console.log(`Grabbing Posts from ${group.name}`)
            const posts = await fb.getGroupPosts(group.id, {dateRange: {
                // start: new Date('03/03/2024, 01:00:00 PM'),
                end: lastLeadTImestamp
            }})
            //PROCESS POSTS
        }
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