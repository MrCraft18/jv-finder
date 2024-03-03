const fs = require('fs')
const readline = require('readline')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const allPosts = JSON.parse(fs.readFileSync('./scraped/all-posts.txt', 'utf-8'))

const keywords = {
    positive: fs.readFileSync('./keywords/positive.txt', 'utf-8').trim().split('\n'),
    negative: fs.readFileSync('./keywords/negative.txt', 'utf-8').trim().split('\n'),
    maybe: fs.readFileSync('./keywords/maybe-negative.txt', 'utf-8').trim().split('\n')
}

console.log('All Posts Length: ', allPosts.length)

async function hajimete() {
    for (const post of allPosts) {
        await new Promise((resolve) => {
            const lineBreaker = '-------------------------------------------'
            console.log(`${lineBreaker}\n${lineBreaker}`)

            const includesSomePositive = keywords.positive.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
            if (includesSomePositive) console.log('INCLUDES SOME POSITIVE')
            if (!includesSomePositive) console.log('NONE POSTIVE')

            const includesNoNegative = keywords.negative.every(word => !new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
            if (includesNoNegative) console.log('NONE NEGATIVE')
            if (!includesNoNegative) console.log('INCLUDES SOME NEGATIVE')

            const includesSomeMaybeNegative = keywords.maybe.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
            if (includesSomeMaybeNegative) console.log('INCLUDES SOME MAYBE NEGATIVE')
            if (!includesSomeMaybeNegative) console.log('NONE MAYBE NEGATIVE')

            let scriptDecsion
            if (includesSomePositive && includesNoNegative && !includesSomeMaybeNegative) {
                scriptDecsion = true
            } else if (includesSomePositive && includesNoNegative && includesSomeMaybeNegative) {
                scriptDecsion = 'maybe'
            } else {
                scriptDecsion = false
            }

            const displayStr = `${lineBreaker}\n${lineBreaker}\n${post.text}\nScript Thinks: ${scriptDecsion}\n`

            rl.question(displayStr, input => {
                resolve()
            })
        })
    }
}
hajimete()