import inquirer from 'inquirer'
import chalk from 'chalk';
import { MongoClient, ObjectId } from 'mongodb'
import { config } from 'dotenv'
config()

const client = new MongoClient(process.env.MONGODB_URI)
const postsCollection = client.db('JV-FINDER').collection('posts')
let postsWithoutDefinitionCount = await postsCollection.countDocuments({'manualDefinition': {$exists: false}})

// console.log(postsWithoutDefinitionCount)

while (postsWithoutDefinitionCount > 0) {
    // const post = await postsCollection.findOne({
    //     manualDefinition: { $exists: false },
    //     $or: [
    //         {
    //             "text": {
    //                 $regex: "\\benjoy(?:[\\w\\s]){0,30}home",
    //                 $options: "i"
    //             }
    //         },
    //         {
    //             "attachedPost.text": {
    //                 $regex: "\\benjoy(?:[\\w\\s]){0,30}home",
    //                 $options: "i"
    //             }
    //         }
    //     ]
    // })

    // console.log(post)

    const post = await postsCollection.aggregate([
        { $match: { 'manualDefinition': { $exists: false } } },
        { $sample: { size: 1 } }
    ]).toArray().then(array => array[0])

    const questions = [{
        type: 'list',
        name: 'definition',
        message: `https://www.facebook.com/groups/${post.group.id}/posts/${post.id}` + '\n\n' + chalk.blueBright.bgWhiteBright.bold(`${post.text || ''}${post.attachedPost?.text ? `\n${post.attachedPost.text}` : ''}\n`),
        choices: [chalk.blackBright.bgRedBright('None'), chalk.blackBright.bgGreenBright('SFH Deal'), chalk.blackBright.bgYellowBright('Land Deal')]
    }]

    await inquirer.prompt(questions).then(async answer => {
        let definition
        if (answer.definition.includes('None')){
            definition = 'None'
        } else if (answer.definition.includes('SFH Deal')) {
            definition = 'SFH Deal'
        } else if (answer.definition.includes('Land Deal')) {
            definition = 'Land Deal'
        } else {
            throw new Error('Bruh')
        }


        await postsCollection.updateOne({ id: post.id, 'group.id': post.group.id }, { $set: { manualDefinition: definition } })
    })

    postsWithoutDefinitionCount = await postsCollection.countDocuments({ 'manualDefinition': { $exists: false } })

    const totalDefined = await postsCollection.countDocuments({ 'manualDefinition': { $exists: true } })
    console.log(totalDefined)
}