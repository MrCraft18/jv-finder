import Facebook from 'facebook.js'
import { MongoClient, ObjectId } from 'mongodb'
import fs from 'fs'
import { config } from 'dotenv'
config()

const client = new MongoClient(process.env.MONGODB_URI)
const emailsCollection = client.db('EMAIL-FINDER').collection('emails')

let fb = await Facebook.login(process.env.FB_USER, process.env.FB_PASS, {
    headless: true
})

const posts = JSON.parse(fs.readFileSync('./postsForEmails.txt', 'utf-8'))

const initialLength = posts.length

let counter = 0

while (posts.length > 0) {
    try {
        const post = posts.shift()

        post.comments = await fb.getGroupPostComments({
            postID: post.id,
            groupID: post.group.id,
            retries: 3
        })
    
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
    
        const emailsData = Array.from(uniqueEmailsMap, ([email, post]) => ({email, post, sold: false}))
    
        await addEmailsToDatabase(emailsData)
    
        fs.writeFileSync('./postsForEmails.txt', JSON.stringify(posts, null, 4))
    
        counter ++
    
        console.log(`${counter}/${initialLength}`)
    
        if (counter % 100 === 0) {
            console.log('Logging Out')
            await fb.logout()
    
            fb = await Facebook.login(process.env.FB_USER, process.env.FB_PASS, {
                headless: true
            })
    
            console.log('logged back in')
        }
    } catch (error) {
        if (error.data?.errors?.[0]?.message === 'Rate limit exceeded' || error.message.includes("You're Temporarily Blocked")) {
            console.log('Rate Limit Error Waiting 2 Hours...')
            await new Promise(res => setTimeout(res, 1000 * 60 * 60 * 2))
        } else {
            throw error
        }
    }
}

console.log('Dun')

await client.close()



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








// const groupScore = new Map()

// groups.forEach(group => groupScore.set(group, 0))

// uniqueEmailsMap.forEach((post, email) => {
//     const groupName = post.group.name

//     const score = groupScore.get(groupName)
//     groupScore.set(groupName, score + 1)
// })

// console.log(groupScore)