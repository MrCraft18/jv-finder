import Facebook from 'facebook.js'
import fs from 'fs'
import PodioApp from './podio-lib.js'
import { MongoClient, ObjectId } from 'mongodb'
// const axios = require('axios')
import { config } from 'dotenv'
config()

const client = new MongoClient(process.env.MONGODB_URI)
const leadsCollection = client.db('JV-FINDER').collection('leads')
const groupsCollection = client.db('JV-FINDER').collection('groups')
const postsCollection = client.db('JV-FINDER').collection('posts')

const leads = new PodioApp({
    app_id: process.env.PODIO_APP_ID,
    app_token: process.env.PODIO_APP_TOKEN,
    client_id: process.env.PODIO_CLIENT_ID,
    client_secret: process.env.PODIO_CLIENT_SECRET
})

// async function dumb() {
//     // const lastScrapedPost = await groupsCollection
//     // .findOne({ id: '1784712795095551' }, { projection: { lastScrapedPost: 1,  _id: 0 } })
//     // .then(response => response.lastScrapedPost)

//     // console.log(lastScrapedPost)



//     const linkEmbed = await leads.createEmbed({url: 'https://www.google.com'}).catch(error => console.error(error))

//     const images = ['https://scontent-dfw5-1.xx.fbcdn.net/v/t39.30808-6/434395032_10232521913732685_110038277839410196_n.jpg?stp=dst-jpg_s600x600&_nc_cat=103&ccb=1-7&_nc_sid=5f2048&_nc_ohc=OQbZer24caIAb7yjFLP&_nc_ht=scontent-dfw5-1.xx&cb_e2o_trans=t&oh=00_AfCg9Z8ndEyy39J29ifMp-UM_aLI8_PMhsL8VUoNjcypxQ&oe=66145A9C']

//     // const downloadStream = await downloadImageStream(images[0])

//     // const imageName = images[0].split('?')[0].split('/').at(-1)

//     // const uploadedFile = await leads.uploadFile(downloadStream, imageName)
//     // .catch(error => console.log(error))

//     // console.log(uploadedFile)

//     await leads.addItem({
//         'title': '1304 Shalimar Dr',
//         'post-link': {embed: linkEmbed.embed_id},
//         'messenger-link': {embed: linkEmbed.embed_id},
//         'images': await Promise.all(images.map(async imageURL => {
//             const imageName = imageURL.split('?')[0].split('/').at(-1)

//             return await leads.uploadFile(await axios.get(imageURL, {responseType: 'stream'}).then(response => response.data), imageName)
//             .then(response => response.file_id)
//             .catch(error => console.error(error))
//         })),
//         'category': 1
//     })
//     .catch(error => console.error(error))

//     console.log('dun')
// }
// dumb()





// Facebook.login('8176737349', 'mario1018')
// Facebook.login(process.env.FB_USER, process.env.FB_PASS, {headless: true})
// .then(async fb => {
//     const groups = await fb.getJoinedGroups()

//     console.log(groups)

//     // console.log(groups.map(group => group.id))a
//     // console.log(groups.length)

//     // fb.onMessage(data => {
//     //     console.log(data)
//     // })

//     // await fb.groupPostComment('DM Sent', 587104139383261, 1129995655094104)

//     let count = 0

//     const posts = await fb.getGroupPosts('commercialrealestateintexas', {limit: 20, sorting: 'activity'}, post => {
//         count++

//         console.log(count, post.author, post.group.name, new Date(post.timestamp).toLocaleString())
//     }).catch(error => console.error(error))

//     // console.log(posts)
// }).catch(error => console.error(error))