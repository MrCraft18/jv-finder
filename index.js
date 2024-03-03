const fb = require('./fb-lib')
const fs = require('fs')
require('dotenv').config()

fb.login(process.env.FB_USER, process.env.FB_PASS).catch(error => console.log(error))
    .then(async () => {
        const groups = await fb.getJoinedGroups()

        // console.log(groups)

        // const posts = await fb.getGroupPosts('dfwflips', 30)
        // console.log(posts)

        let allPosts = []

        for (const group of groups) {
            console.log(`Grabbing 30 Posts from ${group.name}`)

            const posts = await fb.getGroupPosts(group.id, 30)

            console.log('Got Posts.')

            allPosts = [...posts, ...allPosts]
        }

        fs.writeFileSync(`./scraped/all-posts.txt`, JSON.stringify(allPosts, null, 4))
    })