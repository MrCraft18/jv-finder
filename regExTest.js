import inquirer from 'inquirer'
import { MongoClient, ObjectId } from 'mongodb'
import { config } from 'dotenv'; config()

const client = new MongoClient(process.env.MONGODB_URI)
const postsCollection = client.db('JV-FINDER').collection('posts')

const definitions = {
    names: [
        'None',
        'SFH Deal',
        'Land Deal'
    ],
    default: 'None'
}

const definitionKeywordFinders = [
    // {
    //     regEx: /\bflips?\b/gi,
    //     description: 'matches words flip or flips',
    //     for: 'SFH Deal'
    // },
    {
        regEx: /\barv|after[- ]retail[- ]value\b/gi,
        description: 'matches arv or after repair value',
        for: 'SFH Deal'
    },
    {
        regEx: /\b(?:vacant\s(?:lot|land)|(?:lot|land)\savailable|(?:residential|commercial)\s(?:lot|land|acres?)|build\sready\slots?)\b/gi,
        description: 'matches "(vacant or available) (lot or land) or (lot or land) available or (residential or commerical) (lot or land or acres(s))"',
        for: 'Land Deal'
    },
    {
        regEx: /\b(?:tear ?down|zoned)\b/gi,
        description: 'matches tear( )down or zoned',
        for: 'Land Deal'
    },
    {
        regEx: /\b(?:build|builder)\sopportunity\b/gi,
        description: 'matches build(er) oppurtunity',
        for: 'Land Deal'
    },
    {
        regEx: /\b(?:acre|sqft)\slots?\b/gi,
        description: 'matches (sqft or acre) lot(s)',
        for: 'Land Deal'
    },
    {
        regEx: /\b(?:\d+(?:\+|[+-]\/[+-])?|an).acres?\s(?:for\ssale|in|near|of\sland)\b/gi,
        description: 'matches (number(+) or an) acre(s)',
        for: 'Land Deal'
    },
    {
        regEx: /\b(?:(?:land|lot)\s(?:size|for\ssale)|flood\szone|utilities|sewer)\b/gi,
        description: 'matches (land or lot) (size or for sale) or flood zone or utilities',
        for: 'Land Deal'
    },
    {
        regEx: /\boff.market\s(?:\w+,? +)+?lots?/gi,
        description: 'matches off(any character)market (any amount of words) lots',
        for: 'Land Deal'
    },
    {
        regEx: /\bnew\sbuilds?\sarea\b/gi,
        description: 'matches new build(s) area',
        for: 'Land Deal'
    },
    // {
    //     regEx: /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+|multi.use)\slots?\b/gi,
    //     description: 'matches number lots',
    //     for: 'Land Deal'
    // },
    {
        regEx: /\bempty\slots?\b/gi,
        description: 'matches empty lot(s)',
        for: 'Land Deal'
    },
    {
        regEx: /\b(?:0|zero)\s(?:beds|baths|bathrooms|bedrooms)\b/gi,
        description: 'matches (0 or zero) (beds or baths or bedrooms or bathrooms)',
        for: 'Land Deal'
    },
    {
        regEx: /\blots?\sfor\ssale\b/gi,
        description: 'matches lot(s) for sale',
        for: 'Land Deal'
    },
    {
        regEx: /\bnew\sbuilds?\sarv\b/gi,
        description: 'matches new build(s) arv',
        for: 'Land Deal'
    },
    {
        regEx: /(?:^|i'?m\s|i\sam\s|we\sare\s|we'?re\s)looking\b/gi,
        description: 'matches im looking for',
        for: 'None'
    },
    {
        regEx: /\bloans?|lender\b/gi,
        description: 'matches loan(s) or lender',
        for: 'None'
    },
    {
        regEx: /\bapartment|mfh|multi.family\b/gi,
        description: 'matches apartment or mfh or multi family',
        for: 'None'
    },
    {
        regEx: /\bparking.(?:site|lot)\b/gi,
        description: 'matches parking (site or lot)',
        for: 'None'
    },
    {
        regEx: /\badjacent\s(?:lot|land)\b/gi,
        description: 'matches adjacent (lot or land)',
        for: 'Land Deal'
    },
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

function getCategory(string, comparatorArr, categoryNames) {
    const scoreMap = new Map()

    for (const name of categoryNames.names) {
        scoreMap.set(name, 0)
    }

    // if (categoryNames.default) scoreMap.set(categoryNames.default, 1)

    for (const comparator of comparatorArr) {
        const matches = string.match(comparator.regEx)

        if (matches) scoreMap.set(comparator.for, scoreMap.get(comparator.for) + matches.length)
    }

    let maxKey = null
    let maxValue = -Infinity

    for (const [key, value] of scoreMap.entries()) {
        if (value > maxValue) {
            maxValue = value
            maxKey = key
        } else if (value === maxValue) {
            maxKey = 'Tie'
        }
    }

    if (maxValue > 0) {
        return maxKey
    } else {
        return categoryNames.default
    }
}

const posts = await postsCollection.find({manualDefinition: {$exists: true}}).toArray()



const postsResults = {
    correctlyMatchedPosts: [],
    incorrectlyMatchedPosts: []
}



for (const post of posts) {
    const textString = `${post.text || ''}${post.attachedPost?.text ? `\n${post.attachedPost.text}` : ''}`

    // console.log(textString)

    const category = getCategory(textString, definitionKeywordFinders, definitions)

    post.filterDefinition = category

    if (post.filterDefinition === post.manualDefinition) {
        postsResults.correctlyMatchedPosts.push(post)
    } else {
        postsResults.incorrectlyMatchedPosts.push(post)
    }
}


const post = postsResults.incorrectlyMatchedPosts[0]

const message = 
`
${definitionKeywordFinders.map(comparator => {
    const string = `${post.text || ''}${post.attachedPost?.text ? `\n${post.attachedPost.text}` : ''}`

    return `${comparator.regEx.toString()}: ${string.match(comparator.regEx)}`
}).join('\n')}

POST ID: ${post.id} GROUP ID: ${post.group.id}

${post.text || ''}${post.attachedPost?.text ? `\n${post.attachedPost.text}` : ''}

Filter Definition: ${post.filterDefinition}
Manual Definition: ${post.manualDefinition}

`

console.log(message)
console.log('Correctly Matched:', postsResults.correctlyMatchedPosts.length)
console.log('Incorrectly Matched:', postsResults.incorrectlyMatchedPosts.length)

// for (const post of postsResults.incorrectlyMatchedPosts) {
//     const message = 
// `
// ${definitionKeywordFinders.map(comparator => {
//     const string = `${post.text || ''}${post.attachedPost?.text ? `\n${post.attachedPost.text}` : ''}`

//     return `${comparator.regEx.toString()}: ${string.match(comparator.regEx)}`
// }).join('\n')}

// POST ID: ${post.id} GROUP ID: ${post.group.id}

// ${post.text || ''}${post.attachedPost?.text ? `\n${post.attachedPost.text}` : ''}

// Filter Definition: ${post.filterDefinition}
// Manual Definition: ${post.manualDefinition}

// `

//     const questions = [{
//         type: 'list',
//         name: 'definition',
//         message,
//         choices: ['Next']
//     }]

//     await inquirer.prompt(questions)
// }

await client.close()