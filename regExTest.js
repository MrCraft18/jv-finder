import inquirer from 'inquirer'
import { MongoClient, ObjectId } from 'mongodb'
import { config } from 'dotenv'; config()

const client = new MongoClient(process.env.MONGODB_URI)
const postsCollection = client.db('JV-FINDER').collection('posts')

const definitions = {
    names: [
        'SFH Deal',
        'Land Deal'
    ],
    default: 'None'
}

const definitionKeywordFinders = [
    {
        regEx: /\bflips?\b/gi,
        description: 'matches words flip or flips',
        score: 3,
        for: ['SFH Deal']
    },
    {
        regEx: /\barv|after[- ]retail[- ]value\b/gi,
        description: 'matches arv or after repair value',
        score: 5,
        for: ['SFH Deal']
    },
    {
        regEx: /\b(?:asking|purchase|pp|price)(?:\sprice)?\b/gi,
        description: 'matches price, purchase price, asking, etc.',
        score: 5,
        for: ['SFH Deal', 'Land Deal']
    }
]

const string = `
    *Glencrest Cosmetic Flip Fort Worth, TX 76119*
    Asking Price: 185k
    ARV: 270k
    3/2, 1700 sqft, 1946 year built
    Easy highway access
    All majors updated recently
    DM for access and more info!
    Only needs about 25k-30k in work
    purchase price
    price
    asking
    PP
    purchase
`

function findExpressionMatches(string, regExArr) {
    return regExArr.reduce((accumulator, obj) => {
        const matches = string.match(obj.regEx) || []

        accumulator.results.push({
            description: obj.description,
            matches
        })

        accumulator.totalMatches += matches.length
        return accumulator
    }, {totalMatches: 0, results: []})
}

function getScores(string, comparatorArr, categoryNames) {
    const scoreMap = new Map()

    for (const name of categoryNames.names) {
        scoreMap.set(name, 0)
    }

    for (const comparator of comparatorArr) {
        const matches = string.match(comparator.regEx) || []

        if (matches.length > 0) {
            for (const categoryName of scoreMap.keys()) {
                if (comparator.for.includes(categoryName)) {
                    scoreMap.set(categoryName, scoreMap.get(categoryName) + comparator.score)
                } else {
                    scoreMap.set(categoryName, scoreMap.get(categoryName) - comparator.score)
                }
            }       
        }
    }

    return Object.fromEntries(scoreMap)
}

const postsCursor = postsCollection.find({manualDefinition: {$exists: true}}, {limit: 1})

const postsResults = {
    correctlyMatchedPosts: [],
    correctlyNotMatchedPosts: [],
    incorrectlyMatchedPosts: []
}

const definitionTest = 'SFH Deal'

for await (const post of postsCursor) {
    const textString = `${post.text || ''}${post.attachedPost?.text ? `\n${post.attachedPost.text}` : ''}`

    // console.log(textString)

    const expressionMatches = getScores(textString, definitionKeywordFinders, definitions)

    console.log(expressionMatches)

    // if (post.manualDefinition === definitionTest && expressionMatches.totalMatches > 0) {
    //     postsResults.correctlyMatchedPosts.push(post)
    // } else if (post.manualDefinition !== definitionTest && expressionMatches.totalMatches === 0) {
    //     postsResults.correctlyNotMatchedPosts.push(post)
    // } else {
    //     postsResults.incorrectlyMatchedPosts.push(post)
    // }
}

// console.log('Correctly Matched:', postsResults.correctlyMatchedPosts.length)
// console.log('Correctly NOT Matched:', postsResults.correctlyNotMatchedPosts.length)
// console.log('Incorrectly Matched:', postsResults.incorrectlyMatchedPosts.length)

// for (const post of postsResults.correctlyNotMatchedPosts) {
//     const questions = [{
//         type: 'list',
//         name: 'definition',
//         message: `POST ID: ${post.id} GROUP ID: ${post.group.id}\n\n${post.text || ''}${post.attachedPost?.text ? `\n${post.attachedPost.text}` : ''}\n`,
//         choices: ['Next']
//     }]

//     await inquirer.prompt(questions)
// }