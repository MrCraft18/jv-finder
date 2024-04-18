const Facebook = require('./fb-lib')
const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs')
require('dotenv').config()

const client = new MongoClient(process.env.MONGODB_URI)
const emailsCollection = client.db('EMAIL-FINDER').collection('emails')
const soldEmailsCollection = client.db('EMAIL-FINDER').collection('soldEmails')

fs.writeFileSync('./posts.txt', '[]')

const currentDate = new Date()

async function main() {
    const fb = await Facebook.login(process.env.FB_USER, process.env.FB_PASS)

    const groups = await fb.getJoinedGroups()

    console.log('Here we go...')

    for (const group of groups) {
        const posts = await fb.getGroupPosts(group.id, {dateRange: { end: currentDate.setMonth(currentDate.getMonth() - 3) }}, post => {
            console.log(post.author, new Date(post.timestamp).toLocaleString())
        })

        const previousPosts = JSON.parse(fs.readFileSync('./posts.txt', 'utf-8'))

        fs.writeFileSync('./posts.txt', JSON.stringify([...previousPosts, ...posts], null, 4))
    }

    console.log('Gottem')
}
main()