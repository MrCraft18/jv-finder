import { MongoClient, ObjectId } from 'mongodb'
import { config } from 'dotenv'; config()
import { predictClassifications } from './classifier-lib.js'
import gpt from './gpt-lib.js'
import chalk from 'chalk'
import inquirer from 'inquirer'

const client = new MongoClient(process.env.MONGODB_URI)
const postsCollection = client.db('JV-FINDER').collection('posts')

console.log('Beginning Session')

//1356044898415099
//1402685760352050

while (true) {
    let post = await postsCollection.aggregate([
        { $match: { 'manualDefinition': { $exists: false }, 'id': '10161284198542369' } },
        { $sample: { size: 1 } }
    ]).toArray().then(array => array[0])

    post = await predictClassifications([post]).then(posts => posts[0])

    const extractedInformation = post.predict.category !== 'None' ? await gpt.posts('extractInfo', post) : {}

    const questions = [{
        type: 'list',
        name: 'definition',
        message: `https://www.facebook.com/groups/${post.group.id}/posts/${post.id}` + '\n\n' + chalk.blueBright.bgWhiteBright.bold(`${post.text || ''}${post.attachedPost?.text ? `\n${post.attachedPost.text}` : ''}` + '\n\n') + `Classifier Prediction: ${post.predict.category}\nProbabilities: ${JSON.stringify(post.predict.proba)}` + '\n\n' + JSON.stringify(extractedInformation, null, 2) + '\n',
        choices: ['Next']
    }]

    await inquirer.prompt(questions)
}