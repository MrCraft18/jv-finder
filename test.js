const Facebook = require('./fb-lib.js')
const PodioApp = require('./podio-lib.js')
const { MongoClient, ObjectId } = require('mongodb')
require('dotenv').config()

const client = new MongoClient(process.env.MONGODB_URI)
const leadsCollection = client.db('JV-FINDER').collection('leads')
const groupsCollection = client.db('JV-FINDER').collection('groups')

const leads = new PodioApp({
    app_id: process.env.PODIO_APP_ID,
    app_token: process.env.PODIO_APP_TOKEN,
    client_id: process.env.PODIO_CLIENT_ID,
    client_secret: process.env.PODIO_CLIENT_SECRET
})

async function dumb() {
    const lastScrapedPost = await groupsCollection
    .findOne({ id: '1784712795095551' }, { projection: { lastScrapedPost: 1,  _id: 0 } })
    .then(response => response.lastScrapedPost)

    console.log(lastScrapedPost)



    // const embed = await leads.createEmbed({url: 'https://www.google.com'}).catch(error => console.error(error))

    // await leads.addItem({
    //     'title': '1304 Shalimar Dr',
    //     'post-link': {embed: embed.embed_id},
    //     'messenger-link': {embed: embed.embed_id},
    //     'category': 1
    // })
    // .catch(error => console.error(error))
}
dumb()






// Facebook.login(process.env.FB_USER, process.env.FB_PASS)
// .then(async fb => {
//     // fb.onMessage(data => {
//     //     console.log(data)
//     // })

//     fb.sendMessage('1', '100006618918087')
//     await new Promise(res => setTimeout(res, 1000))
//     fb.sendMessage('1', '100006618918087')
//     await new Promise(res => setTimeout(res, 1000))
//     fb.sendMessage('1', '100006618918087')

//     // await fb.getGroupPosts('1345361228867056', {limit: 50}, post => {
//     //     console.log("post")
//     // }).catch(error => console.error(error))
// }).catch(error => console.error(error))