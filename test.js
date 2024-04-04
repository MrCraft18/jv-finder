const Facebook = require('./fb-lib.js')
const PodioApp = require('./podio-lib.js')
require('dotenv').config()

const leads = new PodioApp({
    app_id: process.env.PODIO_APP_ID,
    app_token: process.env.PODIO_APP_TOKEN,
    client_id: process.env.PODIO_CLIENT_ID,
    client_secret: process.env.PODIO_CLIENT_SECRET
})

// async function dumb() {
//     const embed = await leads.createEmbed({url: 'https://www.google.com'}).catch(error => console.error(error))

//     await leads.addItem({
//         'title': '1304 Shalimar Dr',
//         'post-link': {embed: embed.embed_id},
//         'messenger-link': {embed: embed.embed_id},
//         'category': 1
//     })
//     .catch(error => console.error(error))
// }
// dumb()






Facebook.login(process.env.FB_USER, process.env.FB_PASS)
.then(async fb => {
    fb.onMessage(data => {
        console.log(data)
    })

    // await fb.sendMessage('Ayo\nfrom js', '100006618918087')

    // await fb.getGroupPosts('1345361228867056', {limit: 50}, post => {
    //     console.log("post")
    // }).catch(error => console.error(error))
}).catch(error => console.error(error))