import Facebook from 'facebook.js'
import fs from 'fs'
import { config } from 'dotenv'
config()


const fb = await Facebook.login(process.env.FB_USER, process.env.FB_PASS, {
    headless: false
})

const destinationFileName = 'postsForKeywordTests'

if (!fs.existsSync('./groupsLeft.txt')) {
    const groups = await fb.getJoinedGroups()

    fs.writeFileSync('./groupsLeft.txt', JSON.stringify(groups, null, 4))
    fs.writeFileSync(`./${destinationFileName}.txt`, '[]')
}

const groupsLeft = JSON.parse(fs.readFileSync('./groupsLeft.txt', 'utf-8'))

try {
    console.log('Here we go...')

    while (groupsLeft.length > 0) {
        const group = groupsLeft.shift()
    
        let count = 0
    
        const posts = await fb.getGroupPosts(group.id, { dateRange: { endAfter: new Date('2024-01-01') }, limit: 1000, sorting: 'activity', getComments: false }, post => {
            count++
    
            console.log(count, post.author, post.group.name, new Date(post.timestamp).toLocaleString())
        })
    
        const existingPosts = JSON.parse(fs.readFileSync(`./${destinationFileName}.txt`, 'utf-8'))
    
        fs.writeFileSync(`./${destinationFileName}.txt`, JSON.stringify([...existingPosts, ...posts], null, 4))
    
        fs.writeFileSync('./groupsLeft.txt', JSON.stringify(groupsLeft, null, 4))
    }

    console.log('Gottem')
} catch (error) {
    console.dir(error, { depth: 3 })
}