const fs = require('fs')

const allPosts = JSON.parse(fs.readFileSync('./scraped/all-posts.txt', 'utf-8'))

const keywords = {
    positive: fs.readFileSync('./keywords/positive.txt', 'utf-8').trim().split('\n'),
    negative: fs.readFileSync('./keywords/negative.txt', 'utf-8').trim().split('\n'),
    maybe: fs.readFileSync('./keywords/maybe-negative.txt', 'utf-8').trim().split('\n')
}

let positiveCount = 0
let maybeCount = 0

const spacer = '--------------------'

postsString = allPosts.reduce((accumulator, post) => {
    const includesSomePositive = keywords.positive.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
    const includesNoNegative = keywords.negative.every(word => !post.text.toLowerCase().includes(word))
    const includesSomeMaybeNegative = keywords.maybe.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))

    if (includesSomePositive && includesNoNegative && !includesSomeMaybeNegative) {
        accumulator.push(`${post.text}\n\nTHINKS: Is a deal\n${spacer}\n${spacer}\n`)
        positiveCount++
    } else if (includesSomePositive && includesNoNegative && includesSomeMaybeNegative) {
        accumulator.push(`${post.text}\n\nTHINKS: Might be a deal\n${spacer}\n${spacer}\n`)
        maybeCount++
    }

    return accumulator
}, [])

console.log(positiveCount)
console.log(maybeCount)

fs.writeFileSync('./example.txt', postsString.join(''))