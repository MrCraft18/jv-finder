const fs = require('fs')

async function scrubPost(post) {
    if (!keywordFilter(post)) return
    if (keywordFilter(post) === 'maybe' && await !isPostVacantLandDeal(post)) return
    
    if (!isDuplicatePost) return

    //Mark Post Document as stage 1 and add to leads collection

    //This might need to wait on poster response so...???
    const grabPriceandAddressResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: NeedtoAddMessaeg,
        tools, //Add tool to ask for price and or address
    })

    //if (toolcall) return the scrubPost function and send the message

    const address = grabPriceandAddressResponse.address
    const price = grabPriceandAddressResponse.price

    if (!addressWithinParameters(address) || !priceWithinParameters(price)) return //As "Dropped" and update lead document

    //Mark Post as stage 2

    //Ask poster if this is a lead I can send out to my buyers and return function
}



const keywords = {
    positive: fs.readFileSync('./keywords/positive.txt', 'utf-8').trim().split('\n'),
    negative: fs.readFileSync('./keywords/negative.txt', 'utf-8').trim().split('\n'),
    maybe: fs.readFileSync('./keywords/maybe-negative.txt', 'utf-8').trim().split('\n')
}

function keywordFilter(post) {
    const includesSomePositive = keywords.positive.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
    const includesNoNegative = keywords.negative.every(word => !post.text.toLowerCase().includes(word))
    const includesSomeMaybeNegative = keywords.maybe.some(word => new RegExp(`\\b${word}\\b`).test(post.text.toLowerCase()))
    
    if (includesSomePositive && includesNoNegative && !includesSomeMaybeNegative) {
        return true
    } else if (includesSomePositive && includesNoNegative && includesSomeMaybeNegative) {
        return 'maybe'
    } else {
        return false
    }
}

function getPostAddressAndPrice() {
    //Make gpt api call to return either both the address and price in json OR call a function to ask for price or address or both
}