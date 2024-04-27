const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs')
require('dotenv').config()

const client = new MongoClient(process.env.MONGODB_URI)
const emailsCollection = client.db('EMAIL-FINDER').collection('emails')

async function main() {
    const emailsArray = await emailsCollection.find({sold: false}, {projection: {_id: 0, email: 1}}).toArray().then(array => array.map(obj => obj.email))
    fs.writeFileSync('./emailExport.txt', emailsArray.join(','))
    await emailsCollection.updateMany({sold: false}, {$set: { sold: true }})
    console.log('Dun')
}
main()