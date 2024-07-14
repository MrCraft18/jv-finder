import Facebook from 'facebook.js'
import fs from 'fs'
import PodioApp from './podio-lib.js'
import { MongoClient, ObjectId } from 'mongodb'
import axios from 'axios'
import { config } from 'dotenv'
config()

const client = new MongoClient(process.env.MONGODB_URI)
const leadsCollection = client.db('JV-FINDER').collection('leads')
const groupsCollection = client.db('JV-FINDER').collection('groups')
const postsCollection = client.db('JV-FINDER').collection('posts')

const podioLeads = new PodioApp({
    app_id: process.env.PODIO_APP_ID,
    app_token: process.env.PODIO_APP_TOKEN,
    client_id: process.env.PODIO_CLIENT_ID,
    client_secret: process.env.PODIO_CLIENT_SECRET
})

const itemID = await podioLeads.addItem({
    'address': 'address',
    'title': 'author',
    'deal-category': 'deal category',
    'price': 'price',
    'arv': 'arv',
    'price-to-arv': 'price to arv',
    'post-link': {
        embed: await podioLeads.createEmbed({ url: `https://www.google.com` }).then(embed => embed.embed_id)
    },
    'messenger-link': {
        embed: await podioLeads.createEmbed({ url: `https://www.google.com` }).then(embed => embed.embed_id)
    },
    'category': 1
})

console.log(itemID)


// const posts = await postsCollection.find().limit(1).toArray()

// console.log(JSON.stringify(posts))

// console.log(await predictClassifications(posts))