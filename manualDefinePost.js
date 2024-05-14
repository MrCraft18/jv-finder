import inquirer from 'inquirer'
import { MongoClient, ObjectId } from 'mongodb'
import { config } from 'dotenv'
config()

const client = new MongoClient(process.env.MONGODB_URI)
const postsCollection = client.db('JV-FINDER').collection('posts')

let postsWithoutDefinitionCount = await postsCollection.countDocuments({'manualDefinition': {$exists: false}})
console.log(postsWithoutDefinitionCount)

while (postsWithoutDefinitionCount > 0) {
    const post = await postsCollection.aggregate([
        { $match: { 'manualDefinition': { $exists: false } } },
        { $sample: { size: 1 } }
    ]).toArray().then(array => array[0])

    const questions = [{
        type: 'list',
        name: 'definition',
        message: `POST ID: ${post.id} GROUP ID: ${post.group.id}\n${post.attachedPost?.text ? `\n${post.text}\n\n\n${post.attachedPost.text}\n` : `\n${post.text}\n`}`,
        choices: ['None', 'SFH Deal', 'Land Deal']
    }]

    await inquirer.prompt(questions).then(async answer => {
        await postsCollection.updateOne({ id: post.id, 'group.id': post.group.id }, { $set: { manualDefinition: answer.definition } })
    })

    postsWithoutDefinitionCount = await postsCollection.countDocuments({ 'manualDefinition': { $exists: false } })

    const totalDefined = await postsCollection.countDocuments({ 'manualDefinition': { $exists: true } })
    console.log(totalDefined)
}manualDefinition