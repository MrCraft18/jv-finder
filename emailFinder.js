import Facebook from 'facebook.js'
import { MongoClient, ObjectId } from 'mongodb'
import fs from 'fs'
import { config } from 'dotenv'
config()

const client = new MongoClient(process.env.MONGODB_URI)
const emailsCollection = client.db('EMAIL-FINDER').collection('emails')

// fs.writeFileSync('./posts.txt', '[]')

async function main() {
    let posts = []

    try {
        const fb = await Facebook.login(process.env.FB_USER, process.env.FB_PASS, {
            headless: false
        })

        // const groups = await fb.getJoinedGroups()

        const groups = [{
            name: 'Bruh',
            id: 'dfwflips'
        }]
    
        console.log('Here we go...')
    
        for (const group of groups) {

            let count = 0

            const iterationPosts = await fb.getGroupPosts(group.id, {dateRange: {endAfter: new Date('2024-04-30') }, sorting: 'activity', getComments: false}, post => {
                count++
    
                console.log(count, post.author, post.group.name, new Date(post.timestamp).toLocaleString())
            })
    
            // const previousPosts = JSON.parse(fs.readFileSync('./posts.txt', 'utf-8'))
    
            // fs.writeFileSync('./posts.txt', JSON.stringify([...previousPosts, ...posts], null, 4))

            posts.push(...iterationPosts)
        }

        fs.writeFileSync('./postsForEmails.txt', JSON.stringify(posts, null, 4))
    
        console.log('Gottem')
    } catch (error) {
        console.log(error)
    }


    // const posts = JSON.parse(fs.readFileSync('./posts.txt', 'utf-8'))

    // console.log('ayo')

    // function extractEmails(string) {
    //     const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g

    //     if (string) {
    //         return string.toLowerCase().match(emailPattern) ? string.toLowerCase().match(emailPattern) : []
    //     } else {
    //         return []
    //     }
    // }

    // const uniqueEmailsMap = new Map()

    // const groups = new Set()

    // for (const post of posts) {
    //     groups.add(post.group.name)
    // if (post.text) extractEmails(post.text).forEach(email => uniqueEmailsMap.set(email, post))

    // if (post.attachedPost.text) extractEmails(post.attachedPost.text).forEach(email => uniqueEmailsMap.set(email, post))

    // if (post.comments) {
    //     post.comments.forEach(comment => {
    //         extractEmails(comment.text).forEach(email => uniqueEmailsMap.set(email, post))

    //         processReplies(comment.replies)

    //         function processReplies(replies) {
    //             replies.forEach(reply => {
    //                 extractEmails(reply.text).forEach(email => uniqueEmailsMap.set(email, post))
        
    //                 processReplies(reply.replies)
    //             })
    //         }
    //     })
    // }
    // }

    // const emailsData = Array.from(uniqueEmailsMap, ([email, post]) => ({email, post, sold: false}))

    // await addEmailsToDatabase(emailsData)

    // console.log('Dun')



    // // const groupScore = new Map()

    // // groups.forEach(group => groupScore.set(group, 0))

    // // uniqueEmailsMap.forEach((post, email) => {
    // //     const groupName = post.group.name

    // //     const score = groupScore.get(groupName)
    // //     groupScore.set(groupName, score + 1)
    // // })

    // // console.log(groupScore)

    // await client.close()
}
main()


async function addEmailsToDatabase(emailDataArr) {
    for (const emailData of emailDataArr) {
        const existingEmailQuery = await emailsCollection.findOne({email: emailData.email})

        if (!existingEmailQuery) {
            await emailsCollection.insertOne(emailData)
        } else {
            console.log('Email', emailData.email, 'Already Exists!!!')
        }
    }
}