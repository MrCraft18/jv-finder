const Facebook = require('./msngr-lib.js')
require('dotenv').config()

Facebook.login(process.env.FB_USER, process.env.FB_PASS)
.then(async fb => {
    await fb.onMessage(data => {
        console.log(data)
    })

    //When resolved proceed while still recieving callbacks

    await fb.getGroupPosts('1345361228867056', {limit: 50}, post => {
        console.log("post")
    }).catch(error => console.error(error))

    // msngr.sendMessage('Ayo from js', '100006618918087')
}).catch(error => console.error(error))