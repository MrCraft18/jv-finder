const fs = require('./fs-lib')
require('dotenv').config()

fs.login(process.env.FB_USER, process.env.FB_PASS).catch(error => console.log(error))
    .then(async () => {
        groups = await fs.getJoinedGroups()

        console.log(groups)

        const posts = await fs.getGroupPosts(groups[0].id, 1)

        console.log(posts)
    })